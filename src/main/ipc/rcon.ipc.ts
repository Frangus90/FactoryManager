import { ipcMain, BrowserWindow } from 'electron';
import { IPC } from '../../shared/ipc-channels';
import { rconClient } from '../services/rcon-client';

export function registerRconIpc(): void {
  ipcMain.handle(IPC.RCON_CONNECT, async (_, host: string, port: number, password: string) => {
    await rconClient.connect(host, port, password);
  });

  ipcMain.handle(IPC.RCON_DISCONNECT, async () => {
    rconClient.disconnect();
  });

  ipcMain.handle(IPC.RCON_SEND, async (_, command: string) => {
    return rconClient.execute(command);
  });

  ipcMain.handle(IPC.RCON_GET_STATUS, () => {
    return rconClient.getStatus();
  });

  rconClient.on('statusChange', (status) => {
    for (const win of BrowserWindow.getAllWindows()) {
      win.webContents.send(IPC.RCON_STATUS_CHANGE, status);
    }
  });
}
