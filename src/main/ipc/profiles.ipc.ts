import os from 'os';
import https from 'https';
import fs from 'fs';
import path from 'path';
import { execFile } from 'child_process';
import { ipcMain, dialog, BrowserWindow } from 'electron';
import { IPC } from '../../shared/ipc-channels';
import type { ServerProfile } from '../../shared/types';
import * as profileStore from '../services/profile-store';
import { detectFactorioPath } from '../services/path-detector';
import { resolveUserDataPath, FACTORIO_EXE_RELATIVE, DEFAULT_RCON_PORT, DEFAULT_SERVER_PORT, generateRconPassword } from '../util/constants';
import { rescheduleIfActive } from '../services/restart-scheduler';
import { rescheduleCommandsIfActive } from '../services/command-scheduler';

const versionCache = new Map<string, string>();

function getFactorioVersion(factorioPath: string): Promise<string | null> {
  const cached = versionCache.get(factorioPath);
  if (cached) return Promise.resolve(cached);

  const exePath = path.join(factorioPath, FACTORIO_EXE_RELATIVE);
  const resolvedExe = path.resolve(exePath);
  if (path.basename(resolvedExe) !== 'factorio.exe') {
    return Promise.resolve(null);
  }
  if (!fs.existsSync(resolvedExe)) {
    return Promise.resolve(null);
  }
  return new Promise((resolve) => {
    execFile(resolvedExe, ['--version'], { timeout: 10_000 }, (err, stdout) => {
      if (err) { resolve(null); return; }
      // Output: "Version: 2.0.28 (build 74355, win64, steam)"
      const match = stdout.match(/Version:\s*(\S+)/);
      if (match) {
        versionCache.set(factorioPath, match[1]);
        resolve(match[1]);
      } else {
        resolve(null);
      }
    });
  });
}

export function registerProfileIpc(): void {
  ipcMain.handle(IPC.PROFILES_LIST, () => {
    return profileStore.listProfiles();
  });

  ipcMain.handle(IPC.PROFILES_GET, (_, id: string) => {
    return profileStore.getProfile(id);
  });

  ipcMain.handle(IPC.PROFILES_CREATE, (_, data) => {
    return profileStore.createProfile(data);
  });

  ipcMain.handle(IPC.PROFILES_UPDATE, (_, id: string, updates) => {
    const result = profileStore.updateProfile(id, updates);
    if (updates.restartSchedule) rescheduleIfActive();
    if (updates.scheduledCommands) rescheduleCommandsIfActive();
    return result;
  });

  ipcMain.handle(IPC.PROFILES_DELETE, (_, id: string) => {
    return profileStore.deleteProfile(id);
  });

  ipcMain.handle(IPC.PROFILES_GET_ACTIVE_ID, () => {
    return profileStore.getActiveProfileId();
  });

  ipcMain.handle(IPC.PROFILES_SET_ACTIVE_ID, (_, id: string | null) => {
    profileStore.setActiveProfileId(id);
  });

  ipcMain.handle(IPC.UTIL_DETECT_PATH, () => {
    return detectFactorioPath();
  });

  ipcMain.handle(IPC.UTIL_BROWSE_DIRECTORY, async () => {
    const win = BrowserWindow.getFocusedWindow();
    if (!win) return null;
    const result = await dialog.showOpenDialog(win, {
      properties: ['openDirectory'],
      title: 'Select Factorio Installation Directory',
    });
    return result.canceled ? null : result.filePaths[0];
  });

  ipcMain.handle(IPC.UTIL_BROWSE_FILE, async (_, filters?: Electron.FileFilter[]) => {
    const win = BrowserWindow.getFocusedWindow();
    if (!win) return null;
    const result = await dialog.showOpenDialog(win, {
      properties: ['openFile'],
      filters: filters ?? [],
      title: 'Select File',
    });
    return result.canceled ? null : result.filePaths[0];
  });

  ipcMain.handle(IPC.UTIL_RESOLVE_USER_DATA_PATH, (_, factorioPath: string) => {
    return resolveUserDataPath(factorioPath);
  });

  ipcMain.handle(IPC.UTIL_GET_LOCAL_IP, () => {
    const interfaces = os.networkInterfaces();
    for (const addrs of Object.values(interfaces)) {
      if (!addrs) continue;
      for (const addr of addrs) {
        if (addr.family === 'IPv4' && !addr.internal) {
          return addr.address;
        }
      }
    }
    return '127.0.0.1';
  });

  ipcMain.handle(IPC.UTIL_GET_PUBLIC_IP, () => {
    return new Promise<string | null>((resolve) => {
      const req = https.get('https://api.ipify.org', { timeout: 5000 }, (res) => {
        let data = '';
        res.on('data', (chunk: Buffer) => { data += chunk.toString(); });
        res.on('end', () => resolve(data.trim() || null));
      });
      req.on('error', () => resolve(null));
      req.on('timeout', () => { req.destroy(); resolve(null); });
    });
  });

  ipcMain.handle(IPC.UTIL_GET_FACTORIO_VERSION, (_, factorioPath: string) => {
    return getFactorioVersion(factorioPath);
  });

  // Save text content to a file via save dialog
  ipcMain.handle(IPC.UTIL_SAVE_TEXT_FILE, async (_, defaultName: string, content: string) => {
    const win = BrowserWindow.getFocusedWindow();
    if (!win) return null;
    const result = await dialog.showSaveDialog(win, {
      defaultPath: defaultName,
      filters: [
        { name: 'Text Files', extensions: ['txt'] },
        { name: 'All Files', extensions: ['*'] },
      ],
    });
    if (result.canceled || !result.filePath) return null;
    fs.writeFileSync(result.filePath, content, 'utf-8');
    return result.filePath;
  });

  // Profile export — save profile JSON to file
  ipcMain.handle(IPC.PROFILES_EXPORT, async (_, profileId: string) => {
    const profile = profileStore.getProfile(profileId);
    if (!profile) throw new Error(`Profile not found: ${profileId}`);
    const win = BrowserWindow.getFocusedWindow();
    if (!win) return null;
    const result = await dialog.showSaveDialog(win, {
      defaultPath: `${profile.name.replace(/[^a-zA-Z0-9_\-\s]/g, '')}.json`,
      filters: [{ name: 'JSON Files', extensions: ['json'] }],
    });
    if (result.canceled || !result.filePath) return null;
    // Strip id before export — will get a new one on import
    const { id: _id, ...exportData } = profile;
    fs.writeFileSync(result.filePath, JSON.stringify(exportData, null, 2), 'utf-8');
    return result.filePath;
  });

  // Profile import — read profile JSON from file and create
  ipcMain.handle(IPC.PROFILES_IMPORT, async () => {
    const win = BrowserWindow.getFocusedWindow();
    if (!win) return null;
    const result = await dialog.showOpenDialog(win, {
      properties: ['openFile'],
      filters: [{ name: 'JSON Files', extensions: ['json'] }],
      title: 'Import Profile',
    });
    if (result.canceled || !result.filePaths[0]) return null;
    const raw = fs.readFileSync(result.filePaths[0], 'utf-8');
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    if (!parsed.name || !parsed.factorioPath) {
      throw new Error('Invalid profile: missing name or factorioPath');
    }
    // Explicitly pick known fields — reject unexpected properties
    const KNOWN_FIELDS = [
      'name', 'factorioPath', 'selectedSave', 'useLatestSave',
      'rconPort', 'rconPassword', 'serverPort',
      'serverSettingsPath', 'adminListPath', 'banListPath', 'whitelistPath',
      'autoRestart', 'restartSchedule', 'scheduledCommands',
    ] as const;
    const defaults: Omit<ServerProfile, 'id'> = {
      name: '',
      factorioPath: '',
      selectedSave: null,
      useLatestSave: true,
      rconPort: DEFAULT_RCON_PORT,
      rconPassword: generateRconPassword(),
      serverPort: DEFAULT_SERVER_PORT,
      serverSettingsPath: null,
      adminListPath: null,
      banListPath: null,
      whitelistPath: null,
      autoRestart: false,
      restartSchedule: { type: 'off', intervalHours: 6, dailyTime: '04:00' },
      scheduledCommands: [],
    };
    const picked: Record<string, unknown> = {};
    for (const key of KNOWN_FIELDS) {
      if (key in parsed) picked[key] = parsed[key];
    }
    const data = { ...defaults, ...picked } as Omit<ServerProfile, 'id'>;
    return profileStore.createProfile(data);
  });

  // Check for Factorio updates
  ipcMain.handle(IPC.UTIL_CHECK_UPDATES, () => {
    return new Promise<{ stable: string; experimental: string } | null>((resolve) => {
      const req = https.get('https://factorio.com/api/latest-releases', { timeout: 10_000 }, (res) => {
        let data = '';
        res.on('data', (chunk: Buffer) => { data += chunk.toString(); });
        res.on('end', () => {
          try {
            const json = JSON.parse(data);
            resolve({
              stable: json.stable?.alpha ?? null,
              experimental: json.experimental?.alpha ?? null,
            });
          } catch {
            resolve(null);
          }
        });
      });
      req.on('error', () => resolve(null));
      req.on('timeout', () => { req.destroy(); resolve(null); });
    });
  });
}
