import net from 'net';
import { EventEmitter } from 'events';
import type { RconStatus } from '../../shared/types';

// Source RCON packet types
const PACKET_TYPE_AUTH = 3;
const PACKET_TYPE_AUTH_RESPONSE = 2;
const PACKET_TYPE_EXECCOMMAND = 2;
const PACKET_TYPE_RESPONSE_VALUE = 0;

// Minimum packet body size: id(4) + type(4) + body null(1) + padding(1) = 10
const MIN_PACKET_BODY_SIZE = 10;
// Maximum allowed packet size (64 KB) to prevent memory exhaustion from malformed data
const MAX_PACKET_SIZE = 65536;

const COMMAND_TIMEOUT_MS = 10_000;

interface PendingRequest {
  resolve: (value: string) => void;
  reject: (reason: Error) => void;
  timer: ReturnType<typeof setTimeout>;
}

interface RconPacket {
  size: number;
  id: number;
  type: number;
  body: string;
}

function encodePacket(id: number, type: number, body: string): Buffer {
  const bodyBytes = Buffer.from(body, 'utf-8');
  // size = id(4) + type(4) + body(N) + null terminator(1) + padding(1)
  const size = 4 + 4 + bodyBytes.length + 1 + 1;
  const packet = Buffer.alloc(4 + size);

  packet.writeInt32LE(size, 0);
  packet.writeInt32LE(id, 4);
  packet.writeInt32LE(type, 8);
  bodyBytes.copy(packet, 12);
  // Null terminator and padding byte are already 0x00 from Buffer.alloc
  return packet;
}

function tryDecodePacket(buf: Buffer): { packet: RconPacket; bytesConsumed: number } | null {
  // Need at least 4 bytes to read the size field
  if (buf.length < 4) return null;

  const size = buf.readInt32LE(0);
  const totalLength = 4 + size;

  // Not enough data for the full packet yet
  if (buf.length < totalLength) return null;

  // Guard against malformed size values
  if (size < MIN_PACKET_BODY_SIZE || size > MAX_PACKET_SIZE) return null;

  const id = buf.readInt32LE(4);
  const type = buf.readInt32LE(8);

  // Body runs from offset 12 to (totalLength - 2), excluding null terminator and padding
  const bodyEnd = totalLength - 2;
  const body = buf.toString('utf-8', 12, bodyEnd);

  return {
    packet: { size, id, type, body },
    bytesConsumed: totalLength,
  };
}

export class RconClient extends EventEmitter {
  private socket: net.Socket | null = null;
  private recvBuf: Buffer = Buffer.alloc(0);
  private nextPacketId = 1;
  private pending: Map<number, PendingRequest> = new Map();
  private status: RconStatus = 'disconnected';
  private authId: number | null = null;
  private authResolve: ((value: void) => void) | null = null;
  private authReject: ((reason: Error) => void) | null = null;

  private setStatus(status: RconStatus): void {
    if (this.status === status) return;
    this.status = status;
    this.emit('statusChange', status);
  }

  getStatus(): RconStatus {
    return this.status;
  }

  isConnected(): boolean {
    return this.status === 'connected';
  }

  connect(host: string, port: number, password: string): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      // Clean up any existing connection before starting a new one
      if (this.socket) {
        this.cleanUp();
      }

      this.setStatus('connecting');
      this.recvBuf = Buffer.alloc(0);
      this.nextPacketId = 1;

      // Track whether this connect promise has been settled
      let settled = false;
      const settle = (fn: typeof resolve | typeof reject, value?: unknown) => {
        if (settled) return;
        settled = true;
        (fn as (v?: unknown) => void)(value);
      };

      const socket = new net.Socket();
      this.socket = socket;

      const connectTimeout = setTimeout(() => {
        settle(reject, new Error('Connection timed out'));
        this.cleanUp();
      }, COMMAND_TIMEOUT_MS);

      socket.on('connect', () => {
        clearTimeout(connectTimeout);
        this.authenticate(password,
          () => settle(resolve),
          (err: Error) => settle(reject, err),
        );
      });

      socket.on('data', (data: Buffer) => {
        this.onData(data);
      });

      socket.on('error', (err: Error) => {
        clearTimeout(connectTimeout);
        this.setStatus('error');
        this.rejectAllPending(err);

        // Reject the connect promise if not yet settled (pre-connect error)
        settle(reject, err);

        // If we were still authenticating, reject the auth promise
        if (this.authReject) {
          this.authReject(err);
          this.authResolve = null;
          this.authReject = null;
        }
      });

      socket.on('close', () => {
        this.setStatus('disconnected');
        this.rejectAllPending(new Error('Connection closed'));
        this.socket = null;

        // Reject the connect promise if not yet settled
        settle(reject, new Error('Connection closed'));

        // If we were still authenticating, reject the auth promise
        if (this.authReject) {
          this.authReject(new Error('Connection closed during authentication'));
          this.authResolve = null;
          this.authReject = null;
        }
      });

      socket.connect(port, host);
    });
  }

  disconnect(): void {
    this.cleanUp();
  }

  private getNextId(): number {
    const id = this.nextPacketId++;
    if (this.nextPacketId > 0x7ffffffe) this.nextPacketId = 1;
    return id;
  }

  execute(command: string): Promise<string> {
    return new Promise<string>((resolve, reject) => {
      if (!this.socket || this.status !== 'connected') {
        reject(new Error('Not connected'));
        return;
      }

      const id = this.getNextId();
      const packet = encodePacket(id, PACKET_TYPE_EXECCOMMAND, command);

      const timer = setTimeout(() => {
        this.pending.delete(id);
        reject(new Error(`Command timed out after ${COMMAND_TIMEOUT_MS}ms`));
      }, COMMAND_TIMEOUT_MS);

      this.pending.set(id, { resolve, reject, timer });
      this.socket.write(packet);
    });
  }

  private authenticate(password: string, resolve: (value: void) => void, reject: (reason: Error) => void): void {
    const id = this.getNextId();
    this.authId = id;
    this.authResolve = resolve;
    this.authReject = reject;

    const authTimer = setTimeout(() => {
      this.authResolve = null;
      this.authReject = null;
      this.authId = null;
      reject(new Error('Authentication timed out'));
      this.cleanUp();
    }, COMMAND_TIMEOUT_MS);

    // Store the timer so it can be cleared on auth response
    const originalAuthResolve = this.authResolve;
    const originalAuthReject = this.authReject;

    this.authResolve = (value: void) => {
      clearTimeout(authTimer);
      originalAuthResolve(value);
    };

    this.authReject = (reason: Error) => {
      clearTimeout(authTimer);
      originalAuthReject(reason);
    };

    const packet = encodePacket(id, PACKET_TYPE_AUTH, password);
    this.socket!.write(packet);
  }

  private onData(data: Buffer): void {
    this.recvBuf = Buffer.concat([this.recvBuf, data]);
    this.processBuffer();
  }

  private processBuffer(): void {
    // eslint-disable-next-line no-constant-condition
    while (true) {
      const result = tryDecodePacket(this.recvBuf);
      if (!result) break;

      const { packet, bytesConsumed } = result;
      this.recvBuf = this.recvBuf.subarray(bytesConsumed);
      this.handlePacket(packet);
    }
  }

  private handlePacket(packet: RconPacket): void {
    // Check if this is an authentication response
    if (this.authId !== null && packet.type === PACKET_TYPE_AUTH_RESPONSE) {
      const authResolve = this.authResolve;
      const authReject = this.authReject;
      const authId = this.authId;

      // Clear auth state before calling resolve/reject
      this.authId = null;
      this.authResolve = null;
      this.authReject = null;

      if (packet.id === -1 || packet.id !== authId) {
        this.setStatus('error');
        authReject?.(new Error('Authentication failed: incorrect RCON password'));
        this.cleanUp();
      } else {
        this.setStatus('connected');
        authResolve?.();
      }
      return;
    }

    // Handle command responses
    if (packet.type === PACKET_TYPE_RESPONSE_VALUE) {
      const pendingReq = this.pending.get(packet.id);
      if (pendingReq) {
        clearTimeout(pendingReq.timer);
        this.pending.delete(packet.id);
        pendingReq.resolve(packet.body);
      }
    }
  }

  private rejectAllPending(err: Error): void {
    for (const [id, pendingReq] of this.pending) {
      clearTimeout(pendingReq.timer);
      pendingReq.reject(err);
    }
    this.pending.clear();
  }

  private cleanUp(): void {
    if (this.socket) {
      this.socket.removeAllListeners();
      this.socket.destroy();
      this.socket = null;
    }

    this.rejectAllPending(new Error('Connection closed'));

    // Reject any in-flight auth promise before clearing
    if (this.authReject) {
      this.authReject(new Error('Connection closed'));
    }
    this.authId = null;
    this.authResolve = null;
    this.authReject = null;

    this.setStatus('disconnected');
    this.recvBuf = Buffer.alloc(0);
  }
}

export const rconClient = new RconClient();
