import { contextBridge, ipcRenderer } from 'electron';
import { IPC } from '../shared/ipc-channels';
import type { ServerStatus, RconStatus, LogEntry, AutoRestartInfo, ServerProfile, ServerSettings, SaveFile, ModInfo, BanEntry, AppSettings, ServerEvent, ServerStats, BackupEntry, UpnpStatus, MapSettings, MapGenSettings, ModPortalAuth, PortalMod, PortalModFull, PortalRelease, ModUpdate, DownloadProgress } from '../shared/types';

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
    onAutoRestart: (cb: (info: AutoRestartInfo | null) => void): UnsubscribeFn =>
      onEvent(IPC.SERVER_AUTO_RESTART, cb),
    onEvent: (cb: (event: ServerEvent) => void): UnsubscribeFn =>
      onEvent(IPC.SERVER_EVENT, cb),
    onStats: (cb: (stats: ServerStats) => void): UnsubscribeFn =>
      onEvent(IPC.SERVER_STATS, cb),
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
    import: (sourcePath: string, overwrite?: boolean): Promise<string> =>
      ipcRenderer.invoke(IPC.SAVES_IMPORT, sourcePath, overwrite),
  },

  rcon: {
    connect: (host: string, port: number, password: string): Promise<void> =>
      ipcRenderer.invoke(IPC.RCON_CONNECT, host, port, password),
    disconnect: (): Promise<void> =>
      ipcRenderer.invoke(IPC.RCON_DISCONNECT),
    send: (command: string): Promise<string> =>
      ipcRenderer.invoke(IPC.RCON_SEND, command),
    getStatus: (): Promise<RconStatus> =>
      ipcRenderer.invoke(IPC.RCON_GET_STATUS),
    onStatusChange: (cb: (status: RconStatus) => void): UnsubscribeFn =>
      onEvent(IPC.RCON_STATUS_CHANGE, cb),
  },

  mods: {
    list: (modsDir: string): Promise<ModInfo[]> =>
      ipcRenderer.invoke(IPC.MODS_LIST, modsDir),
    setEnabled: (modsDir: string, modName: string, enabled: boolean): Promise<void> =>
      ipcRenderer.invoke(IPC.MODS_SET_ENABLED, modsDir, modName, enabled),
    delete: (modsDir: string, fileName: string): Promise<void> =>
      ipcRenderer.invoke(IPC.MODS_DELETE, modsDir, fileName),
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
    export: (profileId: string): Promise<string | null> =>
      ipcRenderer.invoke(IPC.PROFILES_EXPORT, profileId),
    import: (): Promise<ServerProfile | null> =>
      ipcRenderer.invoke(IPC.PROFILES_IMPORT),
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
    getFactorioVersion: (factorioPath: string): Promise<string | null> =>
      ipcRenderer.invoke(IPC.UTIL_GET_FACTORIO_VERSION, factorioPath),
    saveTextFile: (defaultName: string, content: string): Promise<string | null> =>
      ipcRenderer.invoke(IPC.UTIL_SAVE_TEXT_FILE, defaultName, content),
    checkUpdates: (): Promise<{ stable: string; experimental: string } | null> =>
      ipcRenderer.invoke(IPC.UTIL_CHECK_UPDATES),
  },

  backups: {
    list: (): Promise<BackupEntry[]> =>
      ipcRenderer.invoke(IPC.BACKUPS_LIST),
    create: (): Promise<string> =>
      ipcRenderer.invoke(IPC.BACKUPS_CREATE),
    restore: (backupPath: string): Promise<void> =>
      ipcRenderer.invoke(IPC.BACKUPS_RESTORE, backupPath),
    delete: (backupPath: string): Promise<void> =>
      ipcRenderer.invoke(IPC.BACKUPS_DELETE, backupPath),
  },

  mapSettings: {
    readMapSettings: (): Promise<MapSettings> =>
      ipcRenderer.invoke(IPC.MAP_SETTINGS_READ),
    writeMapSettings: (data: MapSettings): Promise<void> =>
      ipcRenderer.invoke(IPC.MAP_SETTINGS_WRITE, data),
    readMapGenSettings: (): Promise<MapGenSettings> =>
      ipcRenderer.invoke(IPC.MAP_GEN_SETTINGS_READ),
    writeMapGenSettings: (data: MapGenSettings): Promise<void> =>
      ipcRenderer.invoke(IPC.MAP_GEN_SETTINGS_WRITE, data),
  },

  upnp: {
    map: (port: number, protocol: string, description: string): Promise<void> =>
      ipcRenderer.invoke(IPC.UPNP_MAP, port, protocol, description),
    unmap: (port: number, protocol: string): Promise<void> =>
      ipcRenderer.invoke(IPC.UPNP_UNMAP, port, protocol),
    getStatus: (): Promise<UpnpStatus> =>
      ipcRenderer.invoke(IPC.UPNP_GET_STATUS),
    onStatusChange: (cb: (status: UpnpStatus) => void): UnsubscribeFn =>
      onEvent(IPC.UPNP_STATUS_CHANGE, cb),
  },

  modPortal: {
    getAuth: (): Promise<ModPortalAuth | null> =>
      ipcRenderer.invoke(IPC.MOD_PORTAL_GET_AUTH),
    setAuth: (username: string, token: string): Promise<void> =>
      ipcRenderer.invoke(IPC.MOD_PORTAL_SET_AUTH, username, token),
    clearAuth: (): Promise<void> =>
      ipcRenderer.invoke(IPC.MOD_PORTAL_CLEAR_AUTH),
    fetchCatalog: (factorioVersion: string): Promise<PortalMod[]> =>
      ipcRenderer.invoke(IPC.MOD_PORTAL_FETCH_CATALOG, factorioVersion),
    fetchDetails: (modName: string): Promise<PortalModFull> =>
      ipcRenderer.invoke(IPC.MOD_PORTAL_FETCH_DETAILS, modName),
    download: (modName: string, release: PortalRelease, modsDir: string): Promise<string> =>
      ipcRenderer.invoke(IPC.MOD_PORTAL_DOWNLOAD, modName, release, modsDir),
    checkUpdates: (modsDir: string, factorioVersion: string): Promise<ModUpdate[]> =>
      ipcRenderer.invoke(IPC.MOD_PORTAL_CHECK_UPDATES, modsDir, factorioVersion),
    onDownloadProgress: (cb: (progress: DownloadProgress) => void): UnsubscribeFn =>
      onEvent(IPC.MOD_PORTAL_DOWNLOAD_PROGRESS, cb),
  },

  appSettings: {
    get: (): Promise<AppSettings> =>
      ipcRenderer.invoke(IPC.APP_SETTINGS_GET),
    update: (partial: Partial<AppSettings>): Promise<AppSettings> =>
      ipcRenderer.invoke(IPC.APP_SETTINGS_UPDATE, partial),
  },
};

contextBridge.exposeInMainWorld('electronAPI', api);

export type ElectronAPI = typeof api;
