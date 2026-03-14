import { app, BrowserWindow } from 'electron';
import path from 'path';
import { spawn } from 'child_process';
import { registerAllIpc } from './ipc';
import { serverProcess } from './services/server-process';
import { rconClient } from './services/rcon-client';

// Handle Squirrel.Windows installer events (shortcuts on install/update/uninstall).
if (process.platform === 'win32') {
  const squirrelArg = process.argv.find((arg) =>
    arg.startsWith('--squirrel-'),
  );
  if (squirrelArg) {
    const appFolder = path.resolve(process.execPath, '..');
    const updateExe = path.resolve(appFolder, '..', 'Update.exe');
    const exeName = path.basename(process.execPath);
    spawn(updateExe, [`--${squirrelArg.split('--squirrel-')[1]}`, exeName], {
      detached: true,
    }).on('close', () => app.quit());
    // Block the rest of the app from loading during installer events.
    app.quit();
  }
}

let mainWindow: BrowserWindow | null = null;

const createWindow = (): void => {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    title: 'FactoryManager',
    backgroundColor: '#0f0f1a',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  // Load the renderer
  if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(MAIN_WINDOW_VITE_DEV_SERVER_URL);
  } else {
    mainWindow.loadFile(path.join(__dirname, `../renderer/${MAIN_WINDOW_VITE_NAME}/index.html`));
  }

  // Update window title with server status
  serverProcess.on('statusChange', (status) => {
    if (mainWindow) {
      const statusLabel = status.charAt(0).toUpperCase() + status.slice(1);
      mainWindow.setTitle(`FactoryManager - ${statusLabel}`);
    }
  });
};

app.on('ready', () => {
  registerAllIpc();
  createWindow();
});

let isQuitting = false;
app.on('window-all-closed', () => {
  if (isQuitting) return;

  const serverStatus = serverProcess.getStatus();
  if (serverStatus === 'running' || serverStatus === 'starting') {
    isQuitting = true;
    serverProcess
      .stop()
      .catch(() => {})
      .finally(() => {
        if (rconClient.isConnected()) rconClient.disconnect();
        app.quit();
      });
    return;
  }

  if (rconClient.isConnected()) rconClient.disconnect();
  app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
