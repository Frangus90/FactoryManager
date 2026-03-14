import { app, BrowserWindow, Tray, Menu, nativeImage } from 'electron';
import path from 'path';
import { spawn } from 'child_process';
import { registerAllIpc } from './ipc';
import { serverProcess } from './services/server-process';
import { rconClient } from './services/rcon-client';
import { initNotificationService } from './services/notification-service';
import { initRestartScheduler } from './services/restart-scheduler';
import { initCommandScheduler } from './services/command-scheduler';
import { resourceMonitor } from './services/resource-monitor';
import { getAppSettings } from './services/app-settings-store';
import * as profileStore from './services/profile-store';

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
let tray: Tray | null = null;
let isQuitting = false;

function createTrayIcon(): Electron.NativeImage {
  // 16x16 simple gear/factory icon as raw RGBA pixels
  const size = 16;
  const buffer = Buffer.alloc(size * size * 4, 0);

  function setPixel(x: number, y: number, r: number, g: number, b: number, a = 255) {
    if (x < 0 || x >= size || y < 0 || y >= size) return;
    const offset = (y * size + x) * 4;
    buffer[offset] = r;
    buffer[offset + 1] = g;
    buffer[offset + 2] = b;
    buffer[offset + 3] = a;
  }

  // Orange "F" on dark background — simple and recognizable
  // Background (dark gray)
  for (let y = 2; y < 14; y++) {
    for (let x = 2; x < 14; x++) {
      setPixel(x, y, 36, 35, 36); // #242324
    }
  }
  // Border
  for (let i = 2; i < 14; i++) {
    setPixel(i, 2, 90, 90, 90);
    setPixel(i, 13, 90, 90, 90);
    setPixel(2, i, 90, 90, 90);
    setPixel(13, i, 90, 90, 90);
  }
  // "F" letter in Factorio orange (#e8911a)
  const or = 232, og = 145, ob = 26;
  for (let y = 4; y < 12; y++) setPixel(5, y, or, og, ob);
  for (let x = 5; x < 11; x++) setPixel(x, 4, or, og, ob);
  for (let x = 5; x < 10; x++) setPixel(x, 7, or, og, ob);

  return nativeImage.createFromBuffer(buffer, { width: size, height: size });
}

function buildTrayMenu(): Menu {
  const status = serverProcess.getStatus();
  const statusLabel = status.charAt(0).toUpperCase() + status.slice(1);
  const isRunning = status === 'running';
  const canStart = status === 'stopped' || status === 'errored';

  return Menu.buildFromTemplate([
    {
      label: 'Show Window',
      click: () => {
        if (mainWindow) {
          mainWindow.show();
          mainWindow.focus();
        }
      },
    },
    { type: 'separator' },
    { label: `Server: ${statusLabel}`, enabled: false },
    {
      label: 'Start Server',
      enabled: canStart,
      click: async () => {
        const activeId = profileStore.getActiveProfileId();
        if (!activeId) return;
        const profile = profileStore.getProfile(activeId);
        if (!profile) return;
        try { await serverProcess.start(profile); } catch { /* shown in logs */ }
      },
    },
    {
      label: 'Stop Server',
      enabled: isRunning,
      click: async () => {
        try { await serverProcess.stop(); } catch { /* shown in logs */ }
      },
    },
    { type: 'separator' },
    {
      label: 'Quit',
      click: () => {
        isQuitting = true;
        app.quit();
      },
    },
  ]);
}

function updateTray(): void {
  if (!tray) return;
  const status = serverProcess.getStatus();
  const statusLabel = status.charAt(0).toUpperCase() + status.slice(1);
  tray.setToolTip(`FactoryManager - ${statusLabel}`);
  tray.setContextMenu(buildTrayMenu());
}

const createWindow = (): void => {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    title: 'FactoryManager',
    backgroundColor: '#242324',
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

  // Close-to-tray behavior
  mainWindow.on('close', (e) => {
    if (isQuitting) return;
    const settings = getAppSettings();
    if (settings.closeToTray && tray) {
      e.preventDefault();
      mainWindow?.hide();
    }
  });

  // Update window title with server status
  serverProcess.on('statusChange', (status) => {
    if (mainWindow) {
      const statusLabel = status.charAt(0).toUpperCase() + status.slice(1);
      mainWindow.setTitle(`FactoryManager - ${statusLabel}`);
    }
    updateTray();
  });
};

app.on('ready', () => {
  registerAllIpc();
  initNotificationService();
  initRestartScheduler();
  initCommandScheduler();
  resourceMonitor.init();
  createWindow();

  // Auto-start server if enabled
  const settings = getAppSettings();
  if (settings.autoStartServer) {
    const activeId = profileStore.getActiveProfileId();
    if (activeId) {
      const profile = profileStore.getProfile(activeId);
      if (profile) {
        serverProcess.start(profile).catch(() => { /* shown in logs */ });
      }
    }
  }

  // Create system tray
  const trayIcon = createTrayIcon();
  tray = new Tray(trayIcon);
  tray.setToolTip('FactoryManager');
  tray.setContextMenu(buildTrayMenu());
  tray.on('double-click', () => {
    if (mainWindow) {
      mainWindow.show();
      mainWindow.focus();
    }
  });
});

app.on('window-all-closed', () => {
  if (isQuitting) return;

  // If close-to-tray is enabled and window was just hidden, don't quit
  const settings = getAppSettings();
  if (settings.closeToTray && tray) return;

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

app.on('before-quit', () => {
  isQuitting = true;
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
