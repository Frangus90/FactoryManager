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
  autoRestart: boolean;
  restartSchedule: RestartSchedule;
  scheduledCommands: ScheduledCommand[];
}

export interface AutoRestartInfo {
  remainingSeconds: number;
  attempt: number;
  maxAttempts: number;
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

// ---- App Settings ----

export interface AppSettings {
  closeToTray: boolean;
  autoStartServer: boolean;
  notificationsEnabled: boolean;
  notifyOnStart: boolean;
  notifyOnStop: boolean;
  notifyOnCrash: boolean;
  notifyOnPlayerJoin: boolean;
  backupEnabled: boolean;
  backupBeforeStart: boolean;
  maxBackups: number;
  backupDir: string | null;
  upnpEnabled: boolean;
}

// ---- Restart Schedule ----

export interface RestartSchedule {
  type: 'off' | 'interval' | 'daily';
  intervalHours: number;
  dailyTime: string; // HH:MM format
}

// ---- Server Events ----

export interface ServerEvent {
  type: 'join' | 'leave' | 'chat';
  player: string;
  message?: string;
  timestamp: number;
}

// ---- Server Stats ----

export interface ServerStats {
  cpuPercent: number;
  memoryMb: number;
  ups: number | null;
}

// ---- Backups ----

export interface BackupEntry {
  id: string;
  timestamp: number;
  path: string;
  saveCount: number;
  totalSizeBytes: number;
}

// ---- Command Scheduler ----

export interface ScheduledCommand {
  id: string;
  command: string;
  intervalMinutes: number;
  enabled: boolean;
  label: string;
}

// ---- UPnP ----

export type UpnpStatus = 'idle' | 'mapping' | 'mapped' | 'error';

// ---- Map Settings ----

export interface MapPollutionSettings {
  enabled: boolean;
  diffusion_ratio: number;
  min_pollution_to_damage_trees: number;
  ageing: number;
  expected_max_per_chunk: number;
}

export interface MapEnemyEvolutionSettings {
  enabled: boolean;
  time_factor: number;
  destroy_factor: number;
  pollution_factor: number;
}

export interface MapEnemyExpansionSettings {
  enabled: boolean;
  max_expansion_distance: number;
  settler_group_min_size: number;
  settler_group_max_size: number;
  min_expansion_cooldown: number;
  max_expansion_cooldown: number;
}

export interface MapSettings {
  difficulty_settings: {
    recipe_difficulty: number;
    technology_difficulty: number;
    technology_price_multiplier: number;
    research_queue_setting: string;
  };
  pollution: MapPollutionSettings;
  enemy_evolution: MapEnemyEvolutionSettings;
  enemy_expansion: MapEnemyExpansionSettings;
  [key: string]: unknown;
}

export interface MapGenSettings {
  seed: number | null;
  width: number;
  height: number;
  starting_area: number;
  water: number | string;
  terrain_segmentation: number | string;
  cliff_settings: {
    name: string;
    cliff_elevation_0: number;
    cliff_elevation_interval: number;
    richness: number;
  };
  autoplace_controls: Record<string, {
    frequency: number | string;
    size: number | string;
    richness: number | string;
  }>;
  [key: string]: unknown;
}

// ---- Mod Portal ----

export interface PortalRelease {
  download_url: string;
  file_name: string;
  version: string;
  sha1: string;
  released_at: string;
  info_json: {
    factorio_version: string;
    dependencies?: string[];
  };
}

export interface PortalMod {
  name: string;
  title: string;
  owner: string;
  summary: string;
  downloads_count: number;
  category: string;
  thumbnail: string;
  latest_release: PortalRelease | null;
}

export interface PortalModFull extends PortalMod {
  description: string;
  changelog: string;
  releases: PortalRelease[];
  images: { id: string; url: string; thumbnail: string }[];
}

export interface ModUpdate {
  name: string;
  title: string;
  installedVersion: string;
  latestVersion: string;
  release: PortalRelease;
}

export interface ModPortalAuth {
  username: string;
  token: string;
}

export interface DownloadProgress {
  modName: string;
  phase: 'downloading' | 'verifying' | 'complete' | 'error';
  percent: number;
  error?: string;
}

// ---- Players ----

export interface BanEntry {
  username: string;
  reason?: string;
}
