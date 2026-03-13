import path from 'path';
import { ipcMain, app } from 'electron';
import { IPC } from '../../shared/ipc-channels';
import { listSaves, createSave, deleteSave, importSave } from '../services/save-manager';
import { resolveUserDataPath } from '../util/constants';

const SERVER_SAVES_DIR = () =>
  path.join(app.getPath('userData'), 'server-data', 'saves');

export function registerSavesIpc(): void {
  ipcMain.handle(IPC.SAVES_LIST, async (_, savesDir: string) => {
    return listSaves(savesDir);
  });

  ipcMain.handle(IPC.SAVES_CREATE, async (_, name: string, factorioPath: string, savesDir?: string) => {
    return createSave(factorioPath, name, savesDir);
  });

  ipcMain.handle(IPC.SAVES_DELETE, async (_, filePath: string) => {
    return deleteSave(filePath);
  });

  ipcMain.handle(IPC.SAVES_GET_SERVER_DIR, () => {
    return SERVER_SAVES_DIR();
  });

  ipcMain.handle(IPC.SAVES_LIST_GAME_SAVES, async (_, factorioPath: string) => {
    const userDataDir = resolveUserDataPath(factorioPath);
    const gameSavesDir = path.join(userDataDir, 'saves');
    return listSaves(gameSavesDir);
  });

  ipcMain.handle(IPC.SAVES_IMPORT, async (_, sourcePath: string) => {
    return importSave(sourcePath, SERVER_SAVES_DIR());
  });
}
