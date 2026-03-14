import { ipcMain, BrowserWindow } from 'electron';
import { IPC } from '../../shared/ipc-channels';
import path from 'path';
import { app } from 'electron';
import type { AutoRestartInfo, LogEntry, ServerStats } from '../../shared/types';
import { serverProcess } from '../services/server-process';
import * as profileStore from '../services/profile-store';
import { parseServerEvent } from '../services/event-parser';
import { resourceMonitor } from '../services/resource-monitor';
import { getAppSettings } from '../services/app-settings-store';
import { createBackup, pruneBackups } from '../services/backup-manager';
import { upnpService } from '../services/upnp-service';

export function registerServerIpc(): void {
  ipcMain.handle(IPC.SERVER_START, async (_, profileId: string) => {
    const profile = profileStore.getProfile(profileId);
    if (!profile) throw new Error(`Profile not found: ${profileId}`);

    // Auto-backup before start if enabled
    const settings = getAppSettings();
    if (settings.backupEnabled && settings.backupBeforeStart) {
      const savesDir = path.join(app.getPath('userData'), 'server-data', 'saves');
      try {
        await createBackup(savesDir, settings.backupDir);
        await pruneBackups(settings.maxBackups, settings.backupDir);
      } catch (err) {
        serverProcess.emit('log', {
          timestamp: Date.now(),
          stream: 'stderr' as const,
          text: `Pre-start backup failed: ${err instanceof Error ? err.message : String(err)}`,
        });
      }
    }

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

    // Auto UPnP map/unmap
    const appSettings = getAppSettings();
    if (appSettings.upnpEnabled) {
      if (status === 'running') {
        const activeId = profileStore.getActiveProfileId();
        const profile = activeId ? profileStore.getProfile(activeId) : null;
        if (profile) {
          upnpService.mapPort(profile.serverPort, 'UDP', 'FactoryManager').catch((err) => {
            console.error('UPnP auto-map failed:', err.message);
          });
        }
      } else if (status === 'stopped' || status === 'errored') {
        upnpService.unmapPort().catch((err) => {
          console.error('UPnP auto-unmap failed:', err.message);
        });
      }
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

    // Parse server events from stdout (join/leave/chat) — sent immediately
    if (entry.stream === 'stdout') {
      const event = parseServerEvent(entry.text);
      if (event) {
        for (const win of BrowserWindow.getAllWindows()) {
          win.webContents.send(IPC.SERVER_EVENT, event);
        }
      }
    }
  });

  serverProcess.on('autoRestart', (info: AutoRestartInfo | null) => {
    for (const win of BrowserWindow.getAllWindows()) {
      win.webContents.send(IPC.SERVER_AUTO_RESTART, info);
    }
  });

  // Forward resource monitor stats to renderer
  resourceMonitor.on('stats', (stats: ServerStats) => {
    for (const win of BrowserWindow.getAllWindows()) {
      win.webContents.send(IPC.SERVER_STATS, stats);
    }
  });
}
