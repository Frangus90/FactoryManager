import React, { useState, useEffect } from 'react';
import type { MapSettings, MapGenSettings } from '../../shared/types';

// ---- Constants ----

const RESOURCE_LABELS: Record<string, string> = {
  'iron-ore': 'Iron Ore',
  'copper-ore': 'Copper Ore',
  coal: 'Coal',
  stone: 'Stone',
  'crude-oil': 'Crude Oil',
  'uranium-ore': 'Uranium Ore',
  trees: 'Trees',
  'enemy-base': 'Enemy Bases',
};

const FREQ_OPTIONS = [
  { value: 0, label: 'None' },
  { value: 0.17, label: 'Very Low' },
  { value: 0.5, label: 'Low' },
  { value: 1, label: 'Normal' },
  { value: 2, label: 'High' },
  { value: 3, label: 'Very High' },
];

// ---- Small form primitives ----

function NumberField({ label, value, onChange, min, max, step }: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  step?: number;
}) {
  return (
    <div>
      <label className="label">{label}</label>
      <input
        className="input w-full"
        type="number"
        value={value}
        min={min}
        max={max}
        step={step ?? 1}
        onChange={(e) => onChange(Number(e.target.value))}
      />
    </div>
  );
}

function ToggleField({ label, checked, onChange }: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center gap-3">
      <label className="relative inline-flex items-center cursor-pointer shrink-0">
        <input
          type="checkbox"
          className="sr-only peer"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
        />
        <div className="w-9 h-5 bg-factorio-darker border border-factorio-border peer-checked:bg-factorio-orange transition-colors after:content-[''] after:absolute after:top-[3px] after:left-[3px] after:bg-factorio-text after:w-3.5 after:h-3.5 peer-checked:after:translate-x-4 after:transition-transform" />
      </label>
      <span className="text-sm text-factorio-text">{label}</span>
    </div>
  );
}

function SelectField({ label, value, options, onChange }: {
  label: string;
  value: number;
  options: { value: number; label: string }[];
  onChange: (v: number) => void;
}) {
  return (
    <div>
      <label className="label">{label}</label>
      <select
        className="input w-full"
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>
    </div>
  );
}

// ---- Panel component ----

interface Props {
  open: boolean;
  saveName: string;
  factorioPath: string;
  serverSavesDir: string;
  onCreated: () => void;
  onCancel: () => void;
}

type Tab = 'map' | 'gen';

export default function NewSavePanel({ open, saveName, factorioPath, serverSavesDir, onCreated, onCancel }: Props) {
  const [tab, setTab] = useState<Tab>('map');
  const [mapSettings, setMapSettings] = useState<MapSettings | null>(null);
  const [genSettings, setGenSettings] = useState<MapGenSettings | null>(null);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load settings when panel opens
  useEffect(() => {
    if (!open) return;
    setTab('map');
    setError(null);
    setCreating(false);
    window.electronAPI.mapSettings.readMapSettings().then(setMapSettings).catch(() => setError('Failed to load map settings.'));
    window.electronAPI.mapSettings.readMapGenSettings().then(setGenSettings).catch(() => setError('Failed to load map generation settings.'));
  }, [open]);

  if (!open) return null;

  const loaded = mapSettings && genSettings;

  function patchMap(partial: Partial<MapSettings>) {
    setMapSettings((prev) => prev ? { ...prev, ...partial } : prev);
  }

  function patchGen(partial: Partial<MapGenSettings>) {
    setGenSettings((prev) => prev ? { ...prev, ...partial } : prev);
  }

  async function handleCreate() {
    if (!mapSettings || !genSettings) return;
    setCreating(true);
    setError(null);
    try {
      await window.electronAPI.mapSettings.writeMapSettings(mapSettings);
      await window.electronAPI.mapSettings.writeMapGenSettings(genSettings);
      await window.electronAPI.saves.create(saveName, factorioPath, serverSavesDir || undefined);
      onCreated();
    } catch (err) {
      console.error('Failed to create save:', err);
      setError('Failed to create save. Check the logs for details.');
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onClick={onCancel}>
      <div
        className="bg-factorio-panel border border-factorio-border max-w-4xl w-full mx-4 my-8 flex flex-col max-h-[calc(100vh-4rem)]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-factorio-border shrink-0">
          <div>
            <h2 className="text-lg font-semibold text-factorio-text">New Save: <span className="text-factorio-orange">{saveName}</span></h2>
            <p className="text-xs text-factorio-muted mt-0.5">Configure map settings for this save, or use defaults.</p>
          </div>
          <button className="text-factorio-muted hover:text-factorio-text text-xl leading-none" onClick={onCancel}>&times;</button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-factorio-border px-6 shrink-0">
          <button
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              tab === 'map'
                ? 'border-factorio-orange text-factorio-orange'
                : 'border-transparent text-factorio-muted hover:text-factorio-text'
            }`}
            onClick={() => setTab('map')}
          >
            Map Settings
          </button>
          <button
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              tab === 'gen'
                ? 'border-factorio-orange text-factorio-orange'
                : 'border-transparent text-factorio-muted hover:text-factorio-text'
            }`}
            onClick={() => setTab('gen')}
          >
            Map Generation
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {error && (
            <div className="bg-red-900/30 border border-red-500/50 text-red-300 text-sm px-4 py-2">
              {error}
            </div>
          )}

          {!loaded ? (
            <div className="flex items-center justify-center py-12">
              <p className="text-factorio-muted">Loading settings...</p>
            </div>
          ) : (
            <>
              {tab === 'map' && mapSettings && (
                <>
                  {/* Difficulty */}
                  <div className="card">
                    <h3 className="text-factorio-orange font-semibold text-sm mb-4">Difficulty</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="label">Recipe Difficulty</label>
                        <select
                          className="input w-full"
                          value={mapSettings.difficulty_settings.recipe_difficulty}
                          onChange={(e) => patchMap({
                            difficulty_settings: { ...mapSettings.difficulty_settings, recipe_difficulty: Number(e.target.value) },
                          })}
                        >
                          <option value={0}>Normal</option>
                          <option value={1}>Expensive</option>
                        </select>
                      </div>
                      <div>
                        <label className="label">Technology Difficulty</label>
                        <select
                          className="input w-full"
                          value={mapSettings.difficulty_settings.technology_difficulty}
                          onChange={(e) => patchMap({
                            difficulty_settings: { ...mapSettings.difficulty_settings, technology_difficulty: Number(e.target.value) },
                          })}
                        >
                          <option value={0}>Normal</option>
                          <option value={1}>Expensive</option>
                        </select>
                      </div>
                      <NumberField
                        label="Technology Price Multiplier"
                        value={mapSettings.difficulty_settings.technology_price_multiplier}
                        onChange={(v) => patchMap({
                          difficulty_settings: { ...mapSettings.difficulty_settings, technology_price_multiplier: v },
                        })}
                        min={0.001}
                        max={1000}
                        step={0.1}
                      />
                      <div>
                        <label className="label">Research Queue</label>
                        <select
                          className="input w-full"
                          value={mapSettings.difficulty_settings.research_queue_setting}
                          onChange={(e) => patchMap({
                            difficulty_settings: { ...mapSettings.difficulty_settings, research_queue_setting: e.target.value },
                          })}
                        >
                          <option value="always">Always</option>
                          <option value="after-victory">After Victory</option>
                          <option value="never">Never</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* Pollution */}
                  <div className="card">
                    <h3 className="text-factorio-orange font-semibold text-sm mb-4">Pollution</h3>
                    <div className="space-y-4">
                      <ToggleField
                        label="Pollution enabled"
                        checked={mapSettings.pollution.enabled}
                        onChange={(v) => patchMap({ pollution: { ...mapSettings.pollution, enabled: v } })}
                      />
                      {mapSettings.pollution.enabled && (
                        <div className="grid grid-cols-2 gap-4">
                          <NumberField
                            label="Diffusion Ratio"
                            value={mapSettings.pollution.diffusion_ratio}
                            onChange={(v) => patchMap({ pollution: { ...mapSettings.pollution, diffusion_ratio: v } })}
                            min={0}
                            max={1}
                            step={0.01}
                          />
                          <NumberField
                            label="Ageing"
                            value={mapSettings.pollution.ageing}
                            onChange={(v) => patchMap({ pollution: { ...mapSettings.pollution, ageing: v } })}
                            min={0}
                            step={0.1}
                          />
                          <NumberField
                            label="Min Pollution to Damage Trees"
                            value={mapSettings.pollution.min_pollution_to_damage_trees}
                            onChange={(v) => patchMap({ pollution: { ...mapSettings.pollution, min_pollution_to_damage_trees: v } })}
                            min={0}
                          />
                          <NumberField
                            label="Expected Max Per Chunk"
                            value={mapSettings.pollution.expected_max_per_chunk}
                            onChange={(v) => patchMap({ pollution: { ...mapSettings.pollution, expected_max_per_chunk: v } })}
                            min={0}
                          />
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Enemy Evolution */}
                  <div className="card">
                    <h3 className="text-factorio-orange font-semibold text-sm mb-4">Enemy Evolution</h3>
                    <div className="space-y-4">
                      <ToggleField
                        label="Evolution enabled"
                        checked={mapSettings.enemy_evolution.enabled}
                        onChange={(v) => patchMap({ enemy_evolution: { ...mapSettings.enemy_evolution, enabled: v } })}
                      />
                      {mapSettings.enemy_evolution.enabled && (
                        <div className="grid grid-cols-3 gap-4">
                          <NumberField
                            label="Time Factor"
                            value={mapSettings.enemy_evolution.time_factor}
                            onChange={(v) => patchMap({ enemy_evolution: { ...mapSettings.enemy_evolution, time_factor: v } })}
                            min={0}
                            step={0.000001}
                          />
                          <NumberField
                            label="Destroy Factor"
                            value={mapSettings.enemy_evolution.destroy_factor}
                            onChange={(v) => patchMap({ enemy_evolution: { ...mapSettings.enemy_evolution, destroy_factor: v } })}
                            min={0}
                            step={0.0001}
                          />
                          <NumberField
                            label="Pollution Factor"
                            value={mapSettings.enemy_evolution.pollution_factor}
                            onChange={(v) => patchMap({ enemy_evolution: { ...mapSettings.enemy_evolution, pollution_factor: v } })}
                            min={0}
                            step={0.0000001}
                          />
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Enemy Expansion */}
                  <div className="card">
                    <h3 className="text-factorio-orange font-semibold text-sm mb-4">Enemy Expansion</h3>
                    <div className="space-y-4">
                      <ToggleField
                        label="Expansion enabled"
                        checked={mapSettings.enemy_expansion.enabled}
                        onChange={(v) => patchMap({ enemy_expansion: { ...mapSettings.enemy_expansion, enabled: v } })}
                      />
                      {mapSettings.enemy_expansion.enabled && (
                        <div className="grid grid-cols-2 gap-4">
                          <NumberField
                            label="Max Expansion Distance"
                            value={mapSettings.enemy_expansion.max_expansion_distance}
                            onChange={(v) => patchMap({ enemy_expansion: { ...mapSettings.enemy_expansion, max_expansion_distance: v } })}
                            min={1}
                          />
                          <NumberField
                            label="Min Group Size"
                            value={mapSettings.enemy_expansion.settler_group_min_size}
                            onChange={(v) => patchMap({ enemy_expansion: { ...mapSettings.enemy_expansion, settler_group_min_size: v } })}
                            min={1}
                          />
                          <NumberField
                            label="Max Group Size"
                            value={mapSettings.enemy_expansion.settler_group_max_size}
                            onChange={(v) => patchMap({ enemy_expansion: { ...mapSettings.enemy_expansion, settler_group_max_size: v } })}
                            min={1}
                          />
                          <NumberField
                            label="Min Cooldown (ticks)"
                            value={mapSettings.enemy_expansion.min_expansion_cooldown}
                            onChange={(v) => patchMap({ enemy_expansion: { ...mapSettings.enemy_expansion, min_expansion_cooldown: v } })}
                            min={1}
                          />
                        </div>
                      )}
                    </div>
                  </div>
                </>
              )}

              {tab === 'gen' && genSettings && (
                <>
                  {/* World Size */}
                  <div className="card">
                    <h3 className="text-factorio-orange font-semibold text-sm mb-4">World</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <NumberField
                        label="Width (0 = infinite)"
                        value={genSettings.width}
                        onChange={(v) => patchGen({ width: v })}
                        min={0}
                      />
                      <NumberField
                        label="Height (0 = infinite)"
                        value={genSettings.height}
                        onChange={(v) => patchGen({ height: v })}
                        min={0}
                      />
                      <SelectField
                        label="Starting Area"
                        value={Number(genSettings.starting_area)}
                        options={FREQ_OPTIONS.filter((o) => o.value > 0)}
                        onChange={(v) => patchGen({ starting_area: v })}
                      />
                      <NumberField
                        label="Seed (leave 0 for random)"
                        value={genSettings.seed ?? 0}
                        onChange={(v) => patchGen({ seed: v || null })}
                        min={0}
                      />
                    </div>
                  </div>

                  {/* Terrain */}
                  <div className="card">
                    <h3 className="text-factorio-orange font-semibold text-sm mb-4">Terrain</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <SelectField
                        label="Water Coverage"
                        value={Number(genSettings.water)}
                        options={FREQ_OPTIONS.filter((o) => o.value > 0)}
                        onChange={(v) => patchGen({ water: v })}
                      />
                      <SelectField
                        label="Terrain Segmentation"
                        value={Number(genSettings.terrain_segmentation)}
                        options={FREQ_OPTIONS.filter((o) => o.value > 0)}
                        onChange={(v) => patchGen({ terrain_segmentation: v })}
                      />
                    </div>
                  </div>

                  {/* Cliffs */}
                  <div className="card">
                    <h3 className="text-factorio-orange font-semibold text-sm mb-4">Cliffs</h3>
                    <div className="grid grid-cols-3 gap-4">
                      <NumberField
                        label="First Cliff Elevation"
                        value={genSettings.cliff_settings.cliff_elevation_0}
                        onChange={(v) => patchGen({
                          cliff_settings: { ...genSettings.cliff_settings, cliff_elevation_0: v },
                        })}
                        min={0}
                      />
                      <NumberField
                        label="Cliff Interval"
                        value={genSettings.cliff_settings.cliff_elevation_interval}
                        onChange={(v) => patchGen({
                          cliff_settings: { ...genSettings.cliff_settings, cliff_elevation_interval: v },
                        })}
                        min={0}
                      />
                      <SelectField
                        label="Cliff Richness"
                        value={Number(genSettings.cliff_settings.richness)}
                        options={FREQ_OPTIONS.filter((o) => o.value > 0)}
                        onChange={(v) => patchGen({
                          cliff_settings: { ...genSettings.cliff_settings, richness: v },
                        })}
                      />
                    </div>
                  </div>

                  {/* Resources */}
                  <div className="card">
                    <h3 className="text-factorio-orange font-semibold text-sm mb-4">Resources</h3>
                    <div className="border border-factorio-border overflow-hidden">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="bg-factorio-dark border-b border-factorio-border">
                            <th className="text-left px-4 py-2 text-factorio-muted font-medium">Resource</th>
                            <th className="text-center px-4 py-2 text-factorio-muted font-medium">Frequency</th>
                            <th className="text-center px-4 py-2 text-factorio-muted font-medium">Size</th>
                            <th className="text-center px-4 py-2 text-factorio-muted font-medium">Richness</th>
                          </tr>
                        </thead>
                        <tbody>
                          {Object.entries(genSettings.autoplace_controls).map(([key, ctrl]) => (
                            <tr key={key} className="border-b border-factorio-border/50">
                              <td className="px-4 py-2 text-factorio-text">{RESOURCE_LABELS[key] ?? key}</td>
                              {(['frequency', 'size', 'richness'] as const).map((field) => (
                                <td key={field} className="px-4 py-2 text-center">
                                  <select
                                    className="input !py-1 text-sm"
                                    value={Number(ctrl[field])}
                                    onChange={(e) => {
                                      const updated = { ...genSettings.autoplace_controls };
                                      updated[key] = { ...ctrl, [field]: Number(e.target.value) };
                                      patchGen({ autoplace_controls: updated });
                                    }}
                                  >
                                    {FREQ_OPTIONS.map((opt) => (
                                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                                    ))}
                                  </select>
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-factorio-border shrink-0">
          <button className="btn-secondary" onClick={onCancel} disabled={creating}>
            Cancel
          </button>
          <button className="btn-primary" onClick={handleCreate} disabled={creating || !loaded}>
            {creating ? 'Creating...' : 'Create Save'}
          </button>
        </div>
      </div>
    </div>
  );
}
