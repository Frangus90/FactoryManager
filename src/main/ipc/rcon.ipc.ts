import { ipcMain, BrowserWindow } from 'electron';
import { IPC } from '../../shared/ipc-channels';
import { rconClient } from '../services/rcon-client';

const ALLOWED_RCON_HOSTS = new Set(['127.0.0.1', 'localhost', '::1']);
const RATE_LIMIT_WINDOW_MS = 1000;
const RATE_LIMIT_MAX = 10;
const commandTimestamps: number[] = [];

function assertValidPort(port: number): void {
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error(`Invalid port number: ${port}`);
  }
}

function assertRateLimit(): void {
  const now = Date.now();
  // Remove timestamps outside the window
  while (commandTimestamps.length > 0 && commandTimestamps[0] <= now - RATE_LIMIT_WINDOW_MS) {
    commandTimestamps.shift();
  }
  if (commandTimestamps.length >= RATE_LIMIT_MAX) {
    throw new Error('RCON rate limit exceeded. Try again shortly.');
  }
  commandTimestamps.push(now);
}

export function registerRconIpc(): void {
  ipcMain.handle(IPC.RCON_CONNECT, async (_, host: string, port: number, password: string) => {
    if (!ALLOWED_RCON_HOSTS.has(host)) {
      throw new Error('RCON connections are only allowed to localhost');
    }
    assertValidPort(port);
    await rconClient.connect(host, port, password);
  });

  ipcMain.handle(IPC.RCON_DISCONNECT, async () => {
    rconClient.disconnect();
  });

  ipcMain.handle(IPC.RCON_SEND, async (_, command: string) => {
    assertRateLimit();
    return rconClient.execute(command);
  });

  ipcMain.handle(IPC.RCON_GET_STATUS, () => {
    return rconClient.getStatus();
  });

  rconClient.on('statusChange', (status) => {
    for (const win of BrowserWindow.getAllWindows()) {
      win.webContents.send(IPC.RCON_STATUS_CHANGE, status);
    }
  });
}
