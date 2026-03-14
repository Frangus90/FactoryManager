import { ipcMain, BrowserWindow } from 'electron';
import { IPC } from '../../shared/ipc-channels';
import type { LogEntry } from '../../shared/types';
import { serverProcess } from '../services/server-process';
import * as profileStore from '../services/profile-store';

export function registerServerIpc(): void {
  ipcMain.handle(IPC.SERVER_START, async (_, profileId: string) => {
    const profile = profileStore.getProfile(profileId);
    if (!profile) throw new Error(`Profile not found: ${profileId}`);
    await serverProcess.start(profile);
  });

  ipcMain.handle(IPC.SERVER_STOP, async () => {
    await serverProcess.stop();
  });

  ipcMain.handle(IPC.SERVER_GET_STATUS, () => {
    return serverProcess.getStatus();
  });

  // Forward events from server process to renderer
  serverProcess.on('statusChange', (status) => {
    for (const win of BrowserWindow.getAllWindows()) {
      win.webContents.send(IPC.SERVER_STATUS_CHANGE, status);
    }
  });

  // Batch log entries to reduce IPC overhead during heavy logging
  let logBuffer: LogEntry[] = [];
  let flushTimer: ReturnType<typeof setTimeout> | null = null;

  const flushLogs = () => {
    flushTimer = null;
    if (logBuffer.length === 0) return;
    const batch = logBuffer;
    logBuffer = [];
    for (const win of BrowserWindow.getAllWindows()) {
      for (const entry of batch) {
        win.webContents.send(IPC.SERVER_LOG, entry);
      }
    }
  };

  serverProcess.on('log', (entry: LogEntry) => {
    logBuffer.push(entry);
    if (!flushTimer) {
      flushTimer = setTimeout(flushLogs, 100);
    }
  });
}
