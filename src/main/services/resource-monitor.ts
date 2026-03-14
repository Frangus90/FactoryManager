import pidusage from 'pidusage';
import { EventEmitter } from 'events';
import type { ServerStats, ServerStatus } from '../../shared/types';
import { serverProcess } from './server-process';
import { rconClient } from './rcon-client';

const POLL_INTERVAL_MS = 3000;

class ResourceMonitor extends EventEmitter {
  private timer: ReturnType<typeof setInterval> | null = null;

  init(): void {
    serverProcess.on('statusChange', (status: ServerStatus) => {
      if (status === 'running') {
        this.startPolling();
      } else {
        this.stopPolling();
      }
    });
  }

  private startPolling(): void {
    if (this.timer) return;
    this.timer = setInterval(() => this.poll(), POLL_INTERVAL_MS);
  }

  private stopPolling(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    this.emit('stats', { cpuPercent: 0, memoryMb: 0, ups: null } as ServerStats);
  }

  private async poll(): Promise<void> {
    const pid = serverProcess.getPid();
    if (!pid) return;

    let cpuPercent = 0;
    let memoryMb = 0;
    try {
      const stat = await pidusage(pid);
      cpuPercent = Math.round(stat.cpu * 10) / 10;
      memoryMb = Math.round(stat.memory / (1024 * 1024));
    } catch {
      return;
    }

    let ups: number | null = null;
    if (rconClient.isConnected()) {
      try {
        const response = await rconClient.execute('/sc rcon.print(math.floor(game.speed * 60))');
        const parsed = parseInt(response.trim(), 10);
        if (!isNaN(parsed)) ups = parsed;
      } catch {
        // RCON unavailable or command failed
      }
    }

    this.emit('stats', { cpuPercent, memoryMb, ups } as ServerStats);
  }
}

export const resourceMonitor = new ResourceMonitor();
