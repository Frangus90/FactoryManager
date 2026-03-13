// ---- Server Status ----

export type ServerStatus = 'stopped' | 'starting' | 'running' | 'stopping' | 'errored';

export type RconStatus = 'disconnected' | 'connecting' | 'connected' | 'error';

export interface LogEntry {
  timestamp: number;
  stream: 'stdout' | 'stderr';
  text: string;
}

// ---- Server Profile ----

export interface ServerProfile {
  id: string;
  name: string;
  factorioPath: string;
  selectedSave: string | null;
  useLatestSave: boolean;
  rconPort: number;
  rconPassword: string;
  serverPort: number;
  serverSettingsPath: string | null;
  adminListPath: string | null;
  banListPath: string | null;
  whitelistPath: string | null;
}

// ---- Server Settings (server-settings.json) ----

export interface ServerSettings {
  name: string;
  description: string;
  tags: string[];
  max_players: number;
  visibility: {
    public: boolean;
    lan: boolean;
  };
  username: string;
  password: string;
  token: string;
  game_password: string;
  require_user_verification: boolean;
  max_upload_in_kilobytes_per_second: number;
  max_upload_slots: number;
  minimum_latency_in_ticks: number;
  max_heartbeats_per_second: number;
  ignore_player_limit_for_returning_players: boolean;
  allow_commands: 'true' | 'false' | 'admins-only';
  autosave_interval: number;
  autosave_slots: number;
  afk_autokick_interval: number;
  auto_pause: boolean;
  auto_pause_when_players_connect: boolean;
  only_admins_can_pause_the_game: boolean;
  autosave_only_on_server: boolean;
  non_blocking_saving: boolean;
  minimum_segment_size: number;
  minimum_segment_size_peer_count: number;
  maximum_segment_size: number;
  maximum_segment_size_peer_count: number;
}

// ---- Save Files ----

export interface SaveFile {
  name: string;
  fileName: string;
  filePath: string;
  sizeBytes: number;
  lastModified: number;
}

// ---- Mods ----

export interface ModInfo {
  name: string;
  title: string;
  version: string;
  author: string;
  description: string;
  enabled: boolean;
  factorioVersion: string;
  fileName: string;
  dependencies: string[];
}

// ---- Players ----

export interface BanEntry {
  username: string;
  reason?: string;
}
