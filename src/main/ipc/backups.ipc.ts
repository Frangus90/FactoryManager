import path from 'path';
import { ipcMain, app } from 'electron';
import { IPC } from '../../shared/ipc-channels';
import { getAppSettings } from '../services/app-settings-store';
import { createBackup, listBackups, restoreBackup, deleteBackup } from '../services/backup-manager';

function serverSavesDir(): string {
  return path.join(app.getPath('userData'), 'server-data', 'saves');
}

export function registerBackupsIpc(): void {
  ipcMain.handle(IPC.BACKUPS_LIST, () => {
    const settings = getAppSettings();
    return listBackups(settings.backupDir);
  });

  ipcMain.handle(IPC.BACKUPS_CREATE, async () => {
    const settings = getAppSettings();
    return createBackup(serverSavesDir(), settings.backupDir);
  });

  ipcMain.handle(IPC.BACKUPS_RESTORE, async (_, backupPath: string) => {
    const settings = getAppSettings();
    return restoreBackup(backupPath, serverSavesDir(), settings.backupDir);
  });

  ipcMain.handle(IPC.BACKUPS_DELETE, async (_, backupPath: string) => {
    const settings = getAppSettings();
    return deleteBackup(backupPath, settings.backupDir);
  });
}
