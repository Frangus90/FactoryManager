import { Notification } from 'electron';
import { serverProcess } from './server-process';
import { getAppSettings } from './app-settings-store';
import type { ServerStatus, LogEntry } from '../../shared/types';

const PLAYER_JOIN_PATTERN = /\[JOIN\]\s+(.+)\s+joined the game/;
const PLAYER_LEAVE_PATTERN = /\[LEAVE\]\s+(.+)\s+left the game/;

function notify(title: string, body: string): void {
  if (!Notification.isSupported()) return;
  new Notification({ title, body }).show();
}

let prevStatus: ServerStatus = 'stopped';

export function initNotificationService(): void {
  serverProcess.on('statusChange', (status: ServerStatus) => {
    const settings = getAppSettings();
    if (!settings.notificationsEnabled) { prevStatus = status; return; }

    if (status === 'running' && prevStatus !== 'running' && settings.notifyOnStart) {
      notify('Server Started', 'Factorio server is now running.');
    }

    if (status === 'stopped' && prevStatus === 'stopping' && settings.notifyOnStop) {
      notify('Server Stopped', 'Factorio server has been stopped.');
    }

    if (status === 'errored' && settings.notifyOnCrash) {
      notify('Server Crashed', 'Factorio server exited unexpectedly.');
    }

    prevStatus = status;
  });

  serverProcess.on('log', (entry: LogEntry) => {
    if (entry.stream !== 'stdout') return;
    const settings = getAppSettings();
    if (!settings.notificationsEnabled || !settings.notifyOnPlayerJoin) return;

    const joinMatch = entry.text.match(PLAYER_JOIN_PATTERN);
    if (joinMatch) {
      notify('Player Joined', `${joinMatch[1]} joined the game.`);
      return;
    }

    const leaveMatch = entry.text.match(PLAYER_LEAVE_PATTERN);
    if (leaveMatch) {
      notify('Player Left', `${leaveMatch[1]} left the game.`);
    }
  });
}
