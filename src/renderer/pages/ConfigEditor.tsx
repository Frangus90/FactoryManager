import React, { useState, useEffect, useCallback } from 'react';
import type { ServerSettings } from '../../shared/types';
import { DEFAULT_SERVER_SETTINGS } from '../../shared/server-settings.schema';
import { useProfile } from '../context/ProfileContext';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function deepEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (typeof a !== typeof b) return false;
  if (a === null || b === null) return a === b;
  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) return false;
    return a.every((v, i) => deepEqual(v, b[i]));
  }
  if (typeof a === 'object' && typeof b === 'object') {
    const keysA = Object.keys(a as Record<string, unknown>);
    const keysB = Object.keys(b as Record<string, unknown>);
    if (keysA.length !== keysB.length) return false;
    return keysA.every((k) =>
      deepEqual(
        (a as Record<string, unknown>)[k],
        (b as Record<string, unknown>)[k],
      ),
    );
  }
  return false;
}

function resolveSettingsPath(profile: {
  factorioPath: string;
  serverSettingsPath: string | null;
}): string {
  if (profile.serverSettingsPath) return profile.serverSettingsPath;
  const base = profile.factorioPath.replace(/[\\/]+$/, '');
  return `${base}/data/server-settings.json`;
}

// ---------------------------------------------------------------------------
// Collapsible Section
// ---------------------------------------------------------------------------

interface SectionProps {
  title: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}

function Section({ title, defaultOpen = true, children }: SectionProps) {
  return (
    <details open={defaultOpen} className="card mb-4 group">
      <summary className="cursor-pointer select-none flex items-center justify-between text-factorio-orange font-semibold text-sm">
        <span>{title}</span>
        <span className="text-factorio-muted text-xs transition-transform group-open:rotate-90">
          &#9654;
        </span>
      </summary>
      <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
        {children}
      </div>
    </details>
  );
}

// ---------------------------------------------------------------------------
// Field Components
// ---------------------------------------------------------------------------

interface TextFieldProps {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: 'text' | 'password';
  placeholder?: string;
  rows?: number;
  hint?: string;
  fullWidth?: boolean;
}

function TextField({
  label,
  value,
  onChange,
  type = 'text',
  placeholder,
  rows,
  hint,
  fullWidth,
}: TextFieldProps) {
  const wrapperClass = fullWidth ? 'md:col-span-2' : '';
  return (
    <div className={wrapperClass}>
      <label className="label">{label}</label>
      {rows ? (
        <textarea
          className="input w-full resize-y"
          rows={rows}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
        />
      ) : (
        <input
          className="input w-full"
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
        />
      )}
      {hint && <p className="text-xs text-factorio-muted mt-1">{hint}</p>}
    </div>
  );
}

interface NumberFieldProps {
  label: string;
  value: number;
  onChange: (v: number) => void;
  min?: number;
  hint?: string;
}

function NumberField({ label, value, onChange, min = 0, hint }: NumberFieldProps) {
  return (
    <div>
      <label className="label">{label}</label>
      <input
        className="input w-full"
        type="number"
        min={min}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
      />
      {hint && <p className="text-xs text-factorio-muted mt-1">{hint}</p>}
    </div>
  );
}

interface CheckboxFieldProps {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}

function CheckboxField({ label, checked, onChange }: CheckboxFieldProps) {
  return (
    <label className="flex items-center gap-2 cursor-pointer select-none">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="accent-factorio-orange w-4 h-4"
      />
      <span className="text-sm text-factorio-text">{label}</span>
    </label>
  );
}

interface SelectFieldProps {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}

function SelectField({ label, value, onChange, options }: SelectFieldProps) {
  return (
    <div>
      <label className="label">{label}</label>
      <select
        className="input w-full"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export default function ConfigEditor() {
  const { activeProfile } = useProfile();

  const [settings, setSettings] = useState<ServerSettings>({ ...DEFAULT_SERVER_SETTINGS });
  const [savedSnapshot, setSavedSnapshot] = useState<ServerSettings>({ ...DEFAULT_SERVER_SETTINGS });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const isDirty = !deepEqual(settings, savedSnapshot);

  // Dismiss toast after a delay
  useEffect(() => {
    if (!toast) return;
    const id = setTimeout(() => setToast(null), 3000);
    return () => clearTimeout(id);
  }, [toast]);

  // Load settings when profile changes
  const loadSettings = useCallback(async () => {
    if (!activeProfile) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const filePath = resolveSettingsPath(activeProfile);
      const loaded = await window.electronAPI.config.read(filePath);
      setSettings(loaded);
      setSavedSnapshot(loaded);
    } catch (err) {
      console.error('Failed to load server settings:', err);
      setError('Failed to load server-settings.json. Using defaults.');
      setSettings({ ...DEFAULT_SERVER_SETTINGS });
      setSavedSnapshot({ ...DEFAULT_SERVER_SETTINGS });
    } finally {
      setLoading(false);
    }
  }, [activeProfile]);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  // --- Mutation helpers ---

  function patch(partial: Partial<ServerSettings>) {
    setSettings((prev) => ({ ...prev, ...partial }));
  }

  function patchVisibility(partial: Partial<ServerSettings['visibility']>) {
    setSettings((prev) => ({
      ...prev,
      visibility: { ...prev.visibility, ...partial },
    }));
  }

  // --- Save handler ---

  const handleSave = async () => {
    if (!activeProfile) return;
    setSaving(true);
    try {
      const filePath = resolveSettingsPath(activeProfile);
      await window.electronAPI.config.write(filePath, settings);
      setSavedSnapshot({ ...settings });
      setToast('Server settings saved successfully.');
    } catch (err) {
      console.error('Failed to save server settings:', err);
      setToast('Failed to save settings. Check file permissions.');
    } finally {
      setSaving(false);
    }
  };

  // --- Reset to defaults ---

  const handleResetDefaults = () => {
    setSettings({ ...DEFAULT_SERVER_SETTINGS });
  };

  // --- Render: no profile ---

  if (!activeProfile) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="card text-center max-w-md">
          <h2 className="text-lg font-semibold mb-2">No Profile Selected</h2>
          <p className="text-factorio-muted text-sm">
            Create or select a server profile in{' '}
            <span className="text-factorio-orange">Settings</span> before
            editing the server configuration.
          </p>
        </div>
      </div>
    );
  }

  // --- Render: loading ---

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-factorio-muted text-sm animate-pulse">
          Loading server settings...
        </div>
      </div>
    );
  }

  // --- Render: editor ---

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Toast / Banner */}
      {toast && (
        <div className="toast-success mx-4 mt-4 flex items-center justify-between">
          <span>{toast}</span>
          <button
            className="text-green-400 hover:text-green-200 ml-4"
            onClick={() => setToast(null)}
          >
            &times;
          </button>
        </div>
      )}

      {/* Error banner */}
      {error && (
        <div className="toast-error mx-4 mt-4 flex items-center justify-between">
          <span>{error}</span>
          <button
            className="text-red-400 hover:text-red-200 ml-4"
            onClick={() => setError(null)}
          >
            &times;
          </button>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-factorio-border shrink-0">
        <div>
          <h2 className="text-lg font-semibold">Server Configuration</h2>
          <p className="text-factorio-muted text-xs mt-0.5">
            Editing: {resolveSettingsPath(activeProfile)}
          </p>
        </div>
        <div className="flex gap-3">
          <button
            className="btn-secondary"
            onClick={handleResetDefaults}
            disabled={saving}
          >
            Reset to Defaults
          </button>
          <button
            className="btn-primary"
            onClick={handleSave}
            disabled={!isDirty || saving}
          >
            {saving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>

      {/* Form */}
      <div className="flex-1 overflow-y-auto p-6 space-y-0">
        {/* ---- General ---- */}
        <Section title="General">
          <TextField
            label="Server Name"
            value={settings.name}
            onChange={(v) => patch({ name: v })}
            placeholder="My Factorio Server"
            fullWidth
          />
          <TextField
            label="Description"
            value={settings.description}
            onChange={(v) => patch({ description: v })}
            placeholder="A short description of your server"
            rows={3}
            fullWidth
          />
          <TextField
            label="Tags"
            value={settings.tags.join(', ')}
            onChange={(v) =>
              patch({
                tags: v
                  .split(',')
                  .map((t) => t.trim())
                  .filter(Boolean),
              })
            }
            placeholder="vanilla, modded, chill"
            hint="Comma-separated list of tags"
            fullWidth
          />
        </Section>

        {/* ---- Players ---- */}
        <Section title="Players">
          <NumberField
            label="Max Players"
            value={settings.max_players}
            onChange={(v) => patch({ max_players: v })}
            hint="0 = unlimited"
          />
          <TextField
            label="Game Password"
            value={settings.game_password}
            onChange={(v) => patch({ game_password: v })}
            type="password"
            placeholder="Leave blank for no password"
          />
          <SelectField
            label="Allow Commands"
            value={settings.allow_commands}
            onChange={(v) =>
              patch({ allow_commands: v as ServerSettings['allow_commands'] })
            }
            options={[
              { value: 'true', label: 'Everyone' },
              { value: 'false', label: 'Nobody' },
              { value: 'admins-only', label: 'Admins Only' },
            ]}
          />
          <NumberField
            label="AFK Auto-kick Interval (minutes)"
            value={settings.afk_autokick_interval}
            onChange={(v) => patch({ afk_autokick_interval: v })}
            hint="0 = disabled"
          />
          <div className="md:col-span-2">
            <CheckboxField
              label="Ignore player limit for returning players"
              checked={settings.ignore_player_limit_for_returning_players}
              onChange={(v) =>
                patch({ ignore_player_limit_for_returning_players: v })
              }
            />
          </div>
        </Section>

        {/* ---- Visibility ---- */}
        <Section title="Visibility">
          <CheckboxField
            label="Public (visible in server browser)"
            checked={settings.visibility.public}
            onChange={(v) => patchVisibility({ public: v })}
          />
          <CheckboxField
            label="LAN (visible on local network)"
            checked={settings.visibility.lan}
            onChange={(v) => patchVisibility({ lan: v })}
          />
        </Section>

        {/* ---- Authentication ---- */}
        <Section title="Authentication" defaultOpen={false}>
          <TextField
            label="Factorio Username"
            value={settings.username}
            onChange={(v) => patch({ username: v })}
            placeholder="Your factorio.com username"
          />
          <TextField
            label="Factorio Password"
            value={settings.password}
            onChange={(v) => patch({ password: v })}
            type="password"
          />
          <TextField
            label="Auth Token"
            value={settings.token}
            onChange={(v) => patch({ token: v })}
            type="password"
            hint="Alternative to password. Obtain from factorio.com profile."
          />
          <div className="md:col-span-2">
            <CheckboxField
              label="Require user verification"
              checked={settings.require_user_verification}
              onChange={(v) => patch({ require_user_verification: v })}
            />
          </div>
        </Section>

        {/* ---- Network ---- */}
        <Section title="Network" defaultOpen={false}>
          <NumberField
            label="Max Upload (KB/s)"
            value={settings.max_upload_in_kilobytes_per_second}
            onChange={(v) =>
              patch({ max_upload_in_kilobytes_per_second: v })
            }
            hint="0 = unlimited"
          />
          <NumberField
            label="Max Upload Slots"
            value={settings.max_upload_slots}
            onChange={(v) => patch({ max_upload_slots: v })}
          />
          <NumberField
            label="Minimum Latency (ticks)"
            value={settings.minimum_latency_in_ticks}
            onChange={(v) => patch({ minimum_latency_in_ticks: v })}
          />
          <NumberField
            label="Max Heartbeats per Second"
            value={settings.max_heartbeats_per_second}
            onChange={(v) => patch({ max_heartbeats_per_second: v })}
          />
        </Section>

        {/* ---- Segments ---- */}
        <Section title="Segments" defaultOpen={false}>
          <NumberField
            label="Minimum Segment Size"
            value={settings.minimum_segment_size}
            onChange={(v) => patch({ minimum_segment_size: v })}
          />
          <NumberField
            label="Min Segment Size Peer Count"
            value={settings.minimum_segment_size_peer_count}
            onChange={(v) =>
              patch({ minimum_segment_size_peer_count: v })
            }
          />
          <NumberField
            label="Maximum Segment Size"
            value={settings.maximum_segment_size}
            onChange={(v) => patch({ maximum_segment_size: v })}
          />
          <NumberField
            label="Max Segment Size Peer Count"
            value={settings.maximum_segment_size_peer_count}
            onChange={(v) =>
              patch({ maximum_segment_size_peer_count: v })
            }
          />
        </Section>

        {/* ---- Auto-save ---- */}
        <Section title="Auto-save">
          <NumberField
            label="Autosave Interval (minutes)"
            value={settings.autosave_interval}
            onChange={(v) => patch({ autosave_interval: v })}
          />
          <NumberField
            label="Autosave Slots"
            value={settings.autosave_slots}
            onChange={(v) => patch({ autosave_slots: v })}
          />
          <CheckboxField
            label="Autosave only on server"
            checked={settings.autosave_only_on_server}
            onChange={(v) => patch({ autosave_only_on_server: v })}
          />
          <CheckboxField
            label="Non-blocking saving"
            checked={settings.non_blocking_saving}
            onChange={(v) => patch({ non_blocking_saving: v })}
          />
        </Section>

        {/* ---- Game Pause ---- */}
        <Section title="Game Pause">
          <CheckboxField
            label="Auto-pause when no players"
            checked={settings.auto_pause}
            onChange={(v) => patch({ auto_pause: v })}
          />
          <CheckboxField
            label="Auto-pause when players connect"
            checked={settings.auto_pause_when_players_connect}
            onChange={(v) =>
              patch({ auto_pause_when_players_connect: v })
            }
          />
          <CheckboxField
            label="Only admins can pause the game"
            checked={settings.only_admins_can_pause_the_game}
            onChange={(v) =>
              patch({ only_admins_can_pause_the_game: v })
            }
          />
        </Section>
      </div>

      {/* Sticky dirty bar */}
      {isDirty && (
        <div className="px-6 py-3 border-t border-factorio-border bg-factorio-dark flex items-center justify-between shrink-0">
          <span className="text-factorio-orange text-sm font-medium">
            You have unsaved changes
          </span>
          <div className="flex gap-3">
            <button
              className="btn-secondary"
              onClick={loadSettings}
              disabled={saving}
            >
              Discard
            </button>
            <button
              className="btn-primary"
              onClick={handleSave}
              disabled={saving}
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
