import path from 'path';
import { ipcMain } from 'electron';
import { IPC } from '../../shared/ipc-channels';
import { readServerSettings, writeServerSettings } from '../services/config-manager';
import type { ServerSettings } from '../../shared/types';

function assertJsonFile(filePath: string): void {
  const resolved = path.resolve(filePath);
  if (!resolved.endsWith('.json')) {
    throw new Error('Invalid config path: must be a .json file');
  }
}

export function registerConfigIpc(): void {
  ipcMain.handle(IPC.CONFIG_READ, async (_, filePath: string) => {
    assertJsonFile(filePath);
    return readServerSettings(filePath);
  });

  ipcMain.handle(IPC.CONFIG_WRITE, async (_, filePath: string, settings: ServerSettings) => {
    assertJsonFile(filePath);
    return writeServerSettings(filePath, settings);
  });
}
