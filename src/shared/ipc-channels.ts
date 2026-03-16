// All IPC channel names as a single source of truth

export const IPC = {
  // Server process management
  SERVER_START: 'server:start',
  SERVER_STOP: 'server:stop',
  SERVER_GET_STATUS: 'server:getStatus',
  SERVER_STATUS_CHANGE: 'server:statusChange',
  SERVER_LOG: 'server:log',
  SERVER_AUTO_RESTART: 'server:autoRestart',
  SERVER_EVENT: 'server:event',
  SERVER_STATS: 'server:stats',

  // Config file management
  CONFIG_READ: 'config:read',
  CONFIG_WRITE: 'config:write',

  // Save file management
  SAVES_LIST: 'saves:list',
  SAVES_CREATE: 'saves:create',
  SAVES_DELETE: 'saves:delete',
  SAVES_IMPORT: 'saves:import',
  SAVES_GET_SERVER_DIR: 'saves:getServerDir',
  SAVES_LIST_GAME_SAVES: 'saves:listGameSaves',

  // RCON console
  RCON_CONNECT: 'rcon:connect',
  RCON_DISCONNECT: 'rcon:disconnect',
  RCON_SEND: 'rcon:send',
  RCON_GET_STATUS: 'rcon:getStatus',
  RCON_STATUS_CHANGE: 'rcon:statusChange',

  // Mod management
  MODS_LIST: 'mods:list',
  MODS_SET_ENABLED: 'mods:setEnabled',
  MODS_DELETE: 'mods:delete',

  // Player management (file-based)
  PLAYERS_GET_ADMIN_LIST: 'players:getAdminList',
  PLAYERS_SET_ADMIN_LIST: 'players:setAdminList',
  PLAYERS_GET_BAN_LIST: 'players:getBanList',
  PLAYERS_SET_BAN_LIST: 'players:setBanList',
  PLAYERS_GET_WHITELIST: 'players:getWhitelist',
  PLAYERS_SET_WHITELIST: 'players:setWhitelist',

  // Server profiles
  PROFILES_LIST: 'profiles:list',
  PROFILES_GET: 'profiles:get',
  PROFILES_CREATE: 'profiles:create',
  PROFILES_UPDATE: 'profiles:update',
  PROFILES_DELETE: 'profiles:delete',
  PROFILES_GET_ACTIVE_ID: 'profiles:getActiveId',
  PROFILES_SET_ACTIVE_ID: 'profiles:setActiveId',

  // Utilities
  UTIL_DETECT_PATH: 'util:detectPath',
  UTIL_BROWSE_DIRECTORY: 'util:browseDirectory',
  UTIL_BROWSE_FILE: 'util:browseFile',
  UTIL_RESOLVE_USER_DATA_PATH: 'util:resolveUserDataPath',
  UTIL_GET_LOCAL_IP: 'util:getLocalIp',
  UTIL_GET_PUBLIC_IP: 'util:getPublicIp',
  UTIL_GET_FACTORIO_VERSION: 'util:getFactorioVersion',
  UTIL_SAVE_TEXT_FILE: 'util:saveTextFile',
  UTIL_CHECK_UPDATES: 'util:checkUpdates',

  // Profile export/import
  PROFILES_EXPORT: 'profiles:export',
  PROFILES_IMPORT: 'profiles:import',

  // Backups
  BACKUPS_LIST: 'backups:list',
  BACKUPS_CREATE: 'backups:create',
  BACKUPS_RESTORE: 'backups:restore',
  BACKUPS_DELETE: 'backups:delete',

  // Map settings
  MAP_SETTINGS_READ: 'mapSettings:read',
  MAP_SETTINGS_WRITE: 'mapSettings:write',
  MAP_GEN_SETTINGS_READ: 'mapGenSettings:read',
  MAP_GEN_SETTINGS_WRITE: 'mapGenSettings:write',

  // UPnP
  UPNP_MAP: 'upnp:map',
  UPNP_UNMAP: 'upnp:unmap',
  UPNP_GET_STATUS: 'upnp:getStatus',
  UPNP_STATUS_CHANGE: 'upnp:statusChange',

  // Mod portal
  MOD_PORTAL_GET_AUTH: 'modPortal:getAuth',
  MOD_PORTAL_SET_AUTH: 'modPortal:setAuth',
  MOD_PORTAL_CLEAR_AUTH: 'modPortal:clearAuth',
  MOD_PORTAL_FETCH_CATALOG: 'modPortal:fetchCatalog',
  MOD_PORTAL_FETCH_DETAILS: 'modPortal:fetchDetails',
  MOD_PORTAL_DOWNLOAD: 'modPortal:download',
  MOD_PORTAL_CHECK_UPDATES: 'modPortal:checkUpdates',
  MOD_PORTAL_DOWNLOAD_PROGRESS: 'modPortal:downloadProgress',

  // App settings
  APP_SETTINGS_GET: 'appSettings:get',
  APP_SETTINGS_UPDATE: 'appSettings:update',

  // Window controls
  WINDOW_MINIMIZE: 'window:minimize',
  WINDOW_MAXIMIZE: 'window:maximize',
  WINDOW_CLOSE: 'window:close',
  WINDOW_IS_MAXIMIZED: 'window:isMaximized',
  WINDOW_MAXIMIZE_CHANGE: 'window:maximizeChange',
} as const;
