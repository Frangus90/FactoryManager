import { EventEmitter } from 'events';
import { Client } from '@runonflux/nat-upnp';
import type { UpnpStatus } from '../../shared/types';

const UPNP_TTL_SECONDS = 3600; // 1 hour — auto-expires if app crashes
const UPNP_RENEW_INTERVAL_MS = 45 * 60 * 1000; // 45 minutes

class UpnpService extends EventEmitter {
  private status: UpnpStatus = 'idle';
  private mappedPort: number | null = null;
  private mappedProtocol: string | null = null;
  private client: Client | null = null;
  private renewTimer: ReturnType<typeof setInterval> | null = null;
  private mappedDescription: string | null = null;

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
        ttl: UPNP_TTL_SECONDS,
        description,
      });
      this.mappedPort = port;
      this.mappedProtocol = protocol.toUpperCase();
      this.mappedDescription = description;
      this.setStatus('mapped');

      // Periodically renew the mapping before TTL expires
      this.renewTimer = setInterval(() => {
        if (!this.client || this.mappedPort === null) return;
        this.client.createMapping({
          public: this.mappedPort,
          private: this.mappedPort,
          protocol: this.mappedProtocol || 'UDP',
          ttl: UPNP_TTL_SECONDS,
          description: this.mappedDescription || 'FactoryManager',
        }).catch((err) => {
          console.error('UPnP renewal failed:', err instanceof Error ? err.message : String(err));
        });
      }, UPNP_RENEW_INTERVAL_MS);
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

    if (this.renewTimer) {
      clearInterval(this.renewTimer);
      this.renewTimer = null;
    }
    this.client.close();
    this.client = null;
    this.mappedPort = null;
    this.mappedProtocol = null;
    this.mappedDescription = null;
    this.setStatus('idle');
  }
}

export const upnpService = new UpnpService();
