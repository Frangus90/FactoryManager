import { contextBridge, ipcRenderer } from 'electron';
import { IPC } from '../shared/ipc-channels';
import type { ServerStatus, RconStatus, LogEntry, ServerProfile, ServerSettings, SaveFile, ModInfo, BanEntry } from '../shared/types';

type UnsubscribeFn = () => void;

function onEvent<T>(channel: string, callback: (data: T) => void): UnsubscribeFn {
  const handler = (_event: Electron.IpcRendererEvent, data: T) => callback(data);
  ipcRenderer.on(channel, handler);
  return () => ipcRenderer.removeListener(channel, handler);
}

const api = {
  server: {
    start: (profileId: string): Promise<void> =>
      ipcRenderer.invoke(IPC.SERVER_START, profileId),
    stop: (): Promise<void> =>
      ipcRenderer.invoke(IPC.SERVER_STOP),
    getStatus: (): Promise<ServerStatus> =>
      ipcRenderer.invoke(IPC.SERVER_GET_STATUS),
    onStatusChange: (cb: (status: ServerStatus) => void): UnsubscribeFn =>
      onEvent(IPC.SERVER_STATUS_CHANGE, cb),
    onLog: (cb: (entry: LogEntry) => void): UnsubscribeFn =>
      onEvent(IPC.SERVER_LOG, cb),
  },

  config: {
    read: (filePath: string): Promise<ServerSettings> =>
      ipcRenderer.invoke(IPC.CONFIG_READ, filePath),
    write: (filePath: string, settings: ServerSettings): Promise<void> =>
      ipcRenderer.invoke(IPC.CONFIG_WRITE, filePath, settings),
  },

  saves: {
    list: (savesDir: string): Promise<SaveFile[]> =>
      ipcRenderer.invoke(IPC.SAVES_LIST, savesDir),
    create: (name: string, factorioPath: string, savesDir?: string): Promise<void> =>
      ipcRenderer.invoke(IPC.SAVES_CREATE, name, factorioPath, savesDir),
    delete: (filePath: string): Promise<void> =>
      ipcRenderer.invoke(IPC.SAVES_DELETE, filePath),
    getServerDir: (): Promise<string> =>
      ipcRenderer.invoke(IPC.SAVES_GET_SERVER_DIR),
    listGameSaves: (factorioPath: string): Promise<SaveFile[]> =>
      ipcRenderer.invoke(IPC.SAVES_LIST_GAME_SAVES, factorioPath),
    import: (sourcePath: string): Promise<string> =>
      ipcRenderer.invoke(IPC.SAVES_IMPORT, sourcePath),
  },

  rcon: {
    connect: (host: string, port: number, password: string): Promise<void> =>
      ipcRenderer.invoke(IPC.RCON_CONNECT, host, port, password),
    disconnect: (): Promise<void> =>
      ipcRenderer.invoke(IPC.RCON_DISCONNECT),
    send: (command: string): Promise<string> =>
      ipcRenderer.invoke(IPC.RCON_SEND, command),
    onStatusChange: (cb: (status: RconStatus) => void): UnsubscribeFn =>
      onEvent(IPC.RCON_STATUS_CHANGE, cb),
  },

  mods: {
    list: (modsDir: string): Promise<ModInfo[]> =>
      ipcRenderer.invoke(IPC.MODS_LIST, modsDir),
    setEnabled: (modsDir: string, modName: string, enabled: boolean): Promise<void> =>
      ipcRenderer.invoke(IPC.MODS_SET_ENABLED, modsDir, modName, enabled),
  },

  players: {
    getAdminList: (filePath: string): Promise<string[]> =>
      ipcRenderer.invoke(IPC.PLAYERS_GET_ADMIN_LIST, filePath),
    setAdminList: (filePath: string, names: string[]): Promise<void> =>
      ipcRenderer.invoke(IPC.PLAYERS_SET_ADMIN_LIST, filePath, names),
    getBanList: (filePath: string): Promise<BanEntry[]> =>
      ipcRenderer.invoke(IPC.PLAYERS_GET_BAN_LIST, filePath),
    setBanList: (filePath: string, entries: BanEntry[]): Promise<void> =>
      ipcRenderer.invoke(IPC.PLAYERS_SET_BAN_LIST, filePath, entries),
    getWhitelist: (filePath: string): Promise<string[]> =>
      ipcRenderer.invoke(IPC.PLAYERS_GET_WHITELIST, filePath),
    setWhitelist: (filePath: string, names: string[]): Promise<void> =>
      ipcRenderer.invoke(IPC.PLAYERS_SET_WHITELIST, filePath, names),
  },

  profiles: {
    list: (): Promise<ServerProfile[]> =>
      ipcRenderer.invoke(IPC.PROFILES_LIST),
    get: (id: string): Promise<ServerProfile | undefined> =>
      ipcRenderer.invoke(IPC.PROFILES_GET, id),
    create: (profile: Omit<ServerProfile, 'id'>): Promise<ServerProfile> =>
      ipcRenderer.invoke(IPC.PROFILES_CREATE, profile),
    update: (id: string, updates: Partial<ServerProfile>): Promise<ServerProfile | null> =>
      ipcRenderer.invoke(IPC.PROFILES_UPDATE, id, updates),
    delete: (id: string): Promise<boolean> =>
      ipcRenderer.invoke(IPC.PROFILES_DELETE, id),
    getActiveId: (): Promise<string | null> =>
      ipcRenderer.invoke(IPC.PROFILES_GET_ACTIVE_ID),
    setActiveId: (id: string | null): Promise<void> =>
      ipcRenderer.invoke(IPC.PROFILES_SET_ACTIVE_ID, id),
  },

  util: {
    detectFactorioPath: (): Promise<string | null> =>
      ipcRenderer.invoke(IPC.UTIL_DETECT_PATH),
    browseForDirectory: (): Promise<string | null> =>
      ipcRenderer.invoke(IPC.UTIL_BROWSE_DIRECTORY),
    browseForFile: (filters?: Electron.FileFilter[]): Promise<string | null> =>
      ipcRenderer.invoke(IPC.UTIL_BROWSE_FILE, filters),
    resolveUserDataPath: (factorioPath: string): Promise<string> =>
      ipcRenderer.invoke(IPC.UTIL_RESOLVE_USER_DATA_PATH, factorioPath),
    getLocalIp: (): Promise<string> =>
      ipcRenderer.invoke(IPC.UTIL_GET_LOCAL_IP),
    getPublicIp: (): Promise<string | null> =>
      ipcRenderer.invoke(IPC.UTIL_GET_PUBLIC_IP),
  },
};

contextBridge.exposeInMainWorld('electronAPI', api);

export type ElectronAPI = typeof api;
