import type { ServerProfile, ServerStatus } from '../../shared/types';
import { serverProcess } from './server-process';
import { rconClient } from './rcon-client';
import * as profileStore from './profile-store';

const WARNING_OFFSETS = [
  { seconds: 300, message: 'Server restarting in 5 minutes' },
  { seconds: 60, message: 'Server restarting in 1 minute' },
  { seconds: 10, message: 'Server restarting in 10 seconds' },
];

let restartTimeout: ReturnType<typeof setTimeout> | null = null;
let warningTimeouts: ReturnType<typeof setTimeout>[] = [];
let activeProfileId: string | null = null;

function clearAllTimers(): void {
  if (restartTimeout) { clearTimeout(restartTimeout); restartTimeout = null; }
  for (const t of warningTimeouts) clearTimeout(t);
  warningTimeouts = [];
}

function sendWarning(message: string): void {
  if (rconClient.isConnected()) {
    rconClient.execute(`/shout ${message}`).catch(() => {});
  }
}

function msUntilNextDaily(timeStr: string): number {
  const [hours, minutes] = timeStr.split(':').map(Number);
  const now = new Date();
  const target = new Date(now);
  target.setHours(hours, minutes, 0, 0);
  if (target.getTime() <= now.getTime()) {
    target.setDate(target.getDate() + 1);
  }
  return target.getTime() - now.getTime();
}

function scheduleRestart(profile: ServerProfile): void {
  clearAllTimers();
  const schedule = profile.restartSchedule;
  if (!schedule || schedule.type === 'off') return;

  let delayMs: number;
  if (schedule.type === 'interval') {
    delayMs = (schedule.intervalHours ?? 6) * 3600_000;
  } else {
    delayMs = msUntilNextDaily(schedule.dailyTime ?? '04:00');
  }

  // Schedule warning messages
  for (const warn of WARNING_OFFSETS) {
    const warnDelay = delayMs - warn.seconds * 1000;
    if (warnDelay > 0) {
      warningTimeouts.push(setTimeout(() => sendWarning(warn.message), warnDelay));
    }
  }

  // Schedule the actual restart
  restartTimeout = setTimeout(async () => {
    clearAllTimers();
    const currentProfile = profileStore.getProfile(profile.id);
    if (!currentProfile) return;

    try {
      await serverProcess.stop();
      await serverProcess.start(currentProfile);
    } catch (err) {
      serverProcess.emit('log', {
        timestamp: Date.now(),
        stream: 'stderr' as const,
        text: `Scheduled restart failed: ${err instanceof Error ? err.message : String(err)}`,
      });
    }
  }, delayMs);
}

export function initRestartScheduler(): void {
  serverProcess.on('statusChange', (status: ServerStatus) => {
    if (status === 'running') {
      // Server just started — check if there's a schedule to set up
      const id = profileStore.getActiveProfileId();
      if (!id) return;
      const profile = profileStore.getProfile(id);
      if (!profile) return;
      activeProfileId = id;
      scheduleRestart(profile);
    } else if (status === 'stopped' || status === 'errored') {
      clearAllTimers();
      activeProfileId = null;
    }
  });
}

export function rescheduleIfActive(): void {
  if (!activeProfileId) return;
  const profile = profileStore.getProfile(activeProfileId);
  if (!profile) return;
  scheduleRestart(profile);
}
