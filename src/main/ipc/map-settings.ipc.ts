import { ipcMain } from 'electron';
import { IPC } from '../../shared/ipc-channels';
import {
  getMapSettingsPath,
  getMapGenSettingsPath,
  readJsonFile,
  writeJsonFile,
} from '../services/map-settings-manager';

const DEFAULT_MAP_SETTINGS = {
  difficulty_settings: {
    recipe_difficulty: 0,
    technology_difficulty: 0,
    technology_price_multiplier: 1,
    research_queue_setting: 'after-victory',
  },
  pollution: {
    enabled: true,
    diffusion_ratio: 0.02,
    min_pollution_to_damage_trees: 60,
    ageing: 1,
    expected_max_per_chunk: 150,
  },
  enemy_evolution: {
    enabled: true,
    time_factor: 0.000004,
    destroy_factor: 0.002,
    pollution_factor: 0.0000009,
  },
  enemy_expansion: {
    enabled: true,
    max_expansion_distance: 7,
    settler_group_min_size: 5,
    settler_group_max_size: 20,
    min_expansion_cooldown: 14400,
    max_expansion_cooldown: 216000,
  },
};

const DEFAULT_MAP_GEN_SETTINGS = {
  seed: null,
  width: 0,
  height: 0,
  starting_area: 1,
  water: 1,
  terrain_segmentation: 1,
  cliff_settings: {
    name: 'cliff',
    cliff_elevation_0: 10,
    cliff_elevation_interval: 40,
    richness: 1,
  },
  autoplace_controls: {
    'iron-ore': { frequency: 1, size: 1, richness: 1 },
    'copper-ore': { frequency: 1, size: 1, richness: 1 },
    coal: { frequency: 1, size: 1, richness: 1 },
    stone: { frequency: 1, size: 1, richness: 1 },
    'crude-oil': { frequency: 1, size: 1, richness: 1 },
    'uranium-ore': { frequency: 1, size: 1, richness: 1 },
    trees: { frequency: 1, size: 1, richness: 1 },
    'enemy-base': { frequency: 1, size: 1, richness: 1 },
  },
};

export function registerMapSettingsIpc(): void {
  ipcMain.handle(IPC.MAP_SETTINGS_READ, () => {
    return readJsonFile(getMapSettingsPath(), DEFAULT_MAP_SETTINGS);
  });

  ipcMain.handle(IPC.MAP_SETTINGS_WRITE, (_, data: unknown) => {
    return writeJsonFile(getMapSettingsPath(), data);
  });

  ipcMain.handle(IPC.MAP_GEN_SETTINGS_READ, () => {
    return readJsonFile(getMapGenSettingsPath(), DEFAULT_MAP_GEN_SETTINGS);
  });

  ipcMain.handle(IPC.MAP_GEN_SETTINGS_WRITE, (_, data: unknown) => {
    return writeJsonFile(getMapGenSettingsPath(), data);
  });
}
