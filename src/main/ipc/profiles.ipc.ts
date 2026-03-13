import os from 'os';
import https from 'https';
import { ipcMain, dialog, BrowserWindow } from 'electron';
import { IPC } from '../../shared/ipc-channels';
import * as profileStore from '../services/profile-store';
import { detectFactorioPath } from '../services/path-detector';
import { resolveUserDataPath } from '../util/constants';

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
    return profileStore.updateProfile(id, updates);
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
}
