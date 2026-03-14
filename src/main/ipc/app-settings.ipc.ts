import { ipcMain } from 'electron';
import { IPC } from '../../shared/ipc-channels';
import type { AppSettings } from '../../shared/types';
import * as appSettingsStore from '../services/app-settings-store';

export function registerAppSettingsIpc(): void {
  ipcMain.handle(IPC.APP_SETTINGS_GET, () => {
    return appSettingsStore.getAppSettings();
  });

  ipcMain.handle(IPC.APP_SETTINGS_UPDATE, (_, partial: Partial<AppSettings>) => {
    return appSettingsStore.updateAppSettings(partial);
  });
}
