import path from 'path';
import { ipcMain } from 'electron';
import { IPC } from '../../shared/ipc-channels';
import { readServerSettings, writeServerSettings } from '../services/config-manager';
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
