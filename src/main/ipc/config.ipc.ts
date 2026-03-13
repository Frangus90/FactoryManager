import { ipcMain } from 'electron';
import { IPC } from '../../shared/ipc-channels';
import { readServerSettings, writeServerSettings } from '../services/config-manager';
import type { ServerSettings } from '../../shared/types';

export function registerConfigIpc(): void {
  ipcMain.handle(IPC.CONFIG_READ, async (_, filePath: string) => {
    return readServerSettings(filePath);
  });

  ipcMain.handle(IPC.CONFIG_WRITE, async (_, filePath: string, settings: ServerSettings) => {
    return writeServerSettings(filePath, settings);
  });
}
