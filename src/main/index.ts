import { app, BrowserWindow } from 'electron';
import path from 'path';
import { registerAllIpc } from './ipc';
import { serverProcess } from './services/server-process';
import { rconClient } from './services/rcon-client';

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (require('electron-squirrel-startup')) {
  app.quit();
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

app.on('window-all-closed', async () => {
  // If server is running, stop it before quitting
  if (serverProcess.getStatus() === 'running' || serverProcess.getStatus() === 'starting') {
    try {
      await serverProcess.stop();
    } catch {
      // Force quit even if stop fails
    }
  }
  if (rconClient.isConnected()) {
    rconClient.disconnect();
  }
  app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
