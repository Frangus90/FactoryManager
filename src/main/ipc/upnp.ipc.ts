import { ipcMain, BrowserWindow } from 'electron';
import { IPC } from '../../shared/ipc-channels';
import { upnpService } from '../services/upnp-service';
import type { UpnpStatus } from '../../shared/types';

function assertValidPort(port: number): void {
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error(`Invalid port number: ${port}`);
  }
}

export function registerUpnpIpc(): void {
  ipcMain.handle(IPC.UPNP_MAP, async (_, port: number, protocol: string, description: string) => {
    assertValidPort(port);
    await upnpService.mapPort(port, protocol, description);
  });

  ipcMain.handle(IPC.UPNP_UNMAP, async () => {
    await upnpService.unmapPort();
  });

  ipcMain.handle(IPC.UPNP_GET_STATUS, () => {
    return upnpService.getStatus();
  });

  // Forward status changes to renderer
  upnpService.on('statusChange', (status: UpnpStatus) => {
    for (const win of BrowserWindow.getAllWindows()) {
      win.webContents.send(IPC.UPNP_STATUS_CHANGE, status);
    }
  });
}
