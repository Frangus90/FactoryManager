import { EventEmitter } from 'events';
import { Client } from '@runonflux/nat-upnp';
import type { UpnpStatus } from '../../shared/types';

class UpnpService extends EventEmitter {
  private status: UpnpStatus = 'idle';
  private mappedPort: number | null = null;
  private mappedProtocol: string | null = null;
  private client: Client | null = null;

  getStatus(): UpnpStatus {
    return this.status;
  }

  private setStatus(s: UpnpStatus): void {
    this.status = s;
    this.emit('statusChange', s);
  }

  async mapPort(port: number, protocol: string, description: string): Promise<void> {
    if (this.mappedPort !== null) {
      await this.unmapPort().catch(() => {});
    }

    this.setStatus('mapping');
    this.client = new Client();

    try {
      await this.client.createMapping({
        public: port,
        private: port,
        protocol: protocol.toUpperCase(),
        ttl: 0,
        description,
      });
      this.mappedPort = port;
      this.mappedProtocol = protocol.toUpperCase();
      this.setStatus('mapped');
    } catch (err) {
      this.setStatus('error');
      throw new Error(`UPnP mapping failed: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  async unmapPort(): Promise<void> {
    if (this.mappedPort === null || !this.client) {
      this.setStatus('idle');
      return;
    }

    const port = this.mappedPort;
    const protocol = this.mappedProtocol || 'UDP';

    try {
      await this.client.removeMapping({ public: port, protocol });
    } catch (err) {
      console.error('UPnP unmap failed:', err instanceof Error ? err.message : String(err));
    }

    this.client.close();
    this.client = null;
    this.mappedPort = null;
    this.mappedProtocol = null;
    this.setStatus('idle');
  }
}

export const upnpService = new UpnpService();
