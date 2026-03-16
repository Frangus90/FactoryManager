import path from 'path';
import { ipcMain, app } from 'electron';
import { IPC } from '../../shared/ipc-channels';
import { listSaves, createSave, deleteSave, importSave } from '../services/save-manager';
import { resolveUserDataPath } from '../util/constants';

const SERVER_SAVES_DIR = () =>
  path.join(app.getPath('userData'), 'server-data', 'saves');

function assertWithinDir(filePath: string, allowedDir: string): void {
  const resolved = path.resolve(filePath);
  const resolvedDir = path.resolve(allowedDir);
  if (!resolved.startsWith(resolvedDir + path.sep) && resolved !== resolvedDir) {
    throw new Error('Invalid path: outside allowed directory');
  }
}

export function registerSavesIpc(): void {
  ipcMain.handle(IPC.SAVES_LIST, async (_, savesDir: string) => {
    return listSaves(savesDir);
  });

  ipcMain.handle(IPC.SAVES_CREATE, async (_, name: string, factorioPath: string, savesDir?: string) => {
    const trimmed = name.trim().replace(/[.\s]+$/, '');
    if (!trimmed || !/^[\w\s\-().]+$/.test(trimmed)) {
      throw new Error('Invalid save name: only letters, numbers, spaces, hyphens, dots, and parentheses are allowed');
    }
    return createSave(factorioPath, trimmed, savesDir);
  });

  ipcMain.handle(IPC.SAVES_DELETE, async (_, filePath: string) => {
    assertWithinDir(filePath, SERVER_SAVES_DIR());
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

  ipcMain.handle(IPC.SAVES_IMPORT, async (_, sourcePath: string, overwrite?: boolean) => {
    return importSave(sourcePath, SERVER_SAVES_DIR(), overwrite);
  });
}
