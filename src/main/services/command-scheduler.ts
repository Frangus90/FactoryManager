import type { ScheduledCommand, ServerStatus } from '../../shared/types';
import { serverProcess } from './server-process';
import { rconClient } from './rcon-client';
import * as profileStore from './profile-store';

const activeTimers = new Map<string, ReturnType<typeof setInterval>>();

function clearAllTimers(): void {
  for (const timer of activeTimers.values()) clearInterval(timer);
  activeTimers.clear();
}

function startCommandSchedules(commands: ScheduledCommand[]): void {
  clearAllTimers();
  for (const cmd of commands) {
    if (!cmd.enabled || cmd.intervalMinutes <= 0) continue;
    const timer = setInterval(() => {
      if (rconClient.isConnected()) {
        rconClient.execute(cmd.command).catch(() => {});
      }
    }, cmd.intervalMinutes * 60_000);
    activeTimers.set(cmd.id, timer);
  }
}

export function initCommandScheduler(): void {
  serverProcess.on('statusChange', (status: ServerStatus) => {
    if (status === 'running') {
      const id = profileStore.getActiveProfileId();
      if (!id) return;
      const profile = profileStore.getProfile(id);
      if (!profile?.scheduledCommands?.length) return;
      startCommandSchedules(profile.scheduledCommands);
    } else if (status === 'stopped' || status === 'errored') {
      clearAllTimers();
    }
  });
}

export function rescheduleCommandsIfActive(): void {
  // Only reschedule if server is actually running
  if (serverProcess.getStatus() !== 'running') return;
  const id = profileStore.getActiveProfileId();
  if (!id) return;
  const profile = profileStore.getProfile(id);
  if (!profile) return;
  startCommandSchedules(profile.scheduledCommands ?? []);
}
