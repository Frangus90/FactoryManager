import path from 'path';
import { ipcMain, app } from 'electron';
import { IPC } from '../../shared/ipc-channels';
import { readServerSettings, writeServerSettings } from '../services/config-manager';
import { APPDATA_FACTORIO_PATH } from '../util/constants';
import type { ServerSettings } from '../../shared/types';

const ALLOWED_CONFIG_NAMES = new Set([
  'server-settings.json',
]);

function assertAllowedConfigFile(filePath: string): void {
  const resolved = path.resolve(filePath);
  const baseName = path.basename(resolved);
  if (!ALLOWED_CONFIG_NAMES.has(baseName)) {
    throw new Error(`Invalid config path: unexpected file name "${baseName}"`);
  }
  const dir = path.dirname(resolved);
  const allowedDirs = [
    path.resolve(APPDATA_FACTORIO_PATH),
    path.resolve(app.getPath('userData'), 'server-data'),
  ];
  if (!allowedDirs.some(d => dir.startsWith(d + path.sep) || dir === d)) {
    throw new Error('Config file is outside allowed directories');
  }
}

export function registerConfigIpc(): void {
  ipcMain.handle(IPC.CONFIG_READ, async (_, filePath: string) => {
    assertAllowedConfigFile(filePath);
    return readServerSettings(filePath);
  });

  ipcMain.handle(IPC.CONFIG_WRITE, async (_, filePath: string, settings: ServerSettings) => {
    assertAllowedConfigFile(filePath);
    return writeServerSettings(filePath, settings);
  });
}
