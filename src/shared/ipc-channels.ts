// All IPC channel names as a single source of truth

export const IPC = {
  // Server process management
  SERVER_START: 'server:start',
  SERVER_STOP: 'server:stop',
  SERVER_GET_STATUS: 'server:getStatus',
  SERVER_STATUS_CHANGE: 'server:statusChange',
  SERVER_LOG: 'server:log',

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
  RCON_STATUS_CHANGE: 'rcon:statusChange',

  // Mod management
  MODS_LIST: 'mods:list',
  MODS_SET_ENABLED: 'mods:setEnabled',

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
} as const;
