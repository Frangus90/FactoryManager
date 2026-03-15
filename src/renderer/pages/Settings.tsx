import React, { useState, useEffect, useCallback } from 'react';
import { useProfile } from '../context/ProfileContext';
import type { ServerProfile, AppSettings, RestartSchedule, ScheduledCommand, ModPortalAuth } from '../../shared/types';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

function generateRconPassword(): string {
  const bytes = new Uint8Array(18);
  crypto.getRandomValues(bytes);
  // base64url encoding without padding
  return btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

function makeEmptyProfile(): Omit<ServerProfile, 'id'> {
  return {
    name: '',
    factorioPath: '',
    selectedSave: null,
    useLatestSave: true,
    rconPort: 27015,
    rconPassword: generateRconPassword(),
    serverPort: 34197,
    serverSettingsPath: null,
    adminListPath: null,
    banListPath: null,
    whitelistPath: null,
    autoRestart: false,
    restartSchedule: { type: 'off', intervalHours: 6, dailyTime: '04:00' },
    scheduledCommands: [],
  };
}

// ---------------------------------------------------------------------------
// Small UI primitives
// ---------------------------------------------------------------------------

function PathValidationIcon({ path }: { path: string }) {
  if (!path) {
    return <span className="text-factorio-muted text-lg leading-none" title="No path set">--</span>;
  }
  // Basic client-side validation: path is non-empty and looks plausible
  const looksValid = path.trim().length > 0;
  return looksValid ? (
    <span className="text-green-400 text-lg leading-none" title="Path set">&#10003;</span>
  ) : (
    <span className="text-red-400 text-lg leading-none" title="Invalid path">&#10007;</span>
  );
}

interface PasswordInputProps {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}

interface ToggleSettingProps {
  label: string;
  description?: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}

function ToggleSetting({ label, description, checked, onChange }: ToggleSettingProps) {
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
      <div>
        <span className="text-sm text-factorio-text">{label}</span>
        {description && <p className="text-xs text-factorio-muted">{description}</p>}
      </div>
    </div>
  );
}

function PasswordInput({ value, onChange, placeholder }: PasswordInputProps) {
  const [visible, setVisible] = useState(false);
  return (
    <div className="relative">
      <input
        className="input w-full pr-10"
        type={visible ? 'text' : 'password'}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
      />
      <button
        type="button"
        className="absolute right-2 top-1/2 -translate-y-1/2 text-factorio-muted hover:text-factorio-text text-xs select-none"
        onClick={() => setVisible((v) => !v)}
        tabIndex={-1}
      >
        {visible ? 'Hide' : 'Show'}
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Profile Form (shared between edit and create)
// ---------------------------------------------------------------------------

interface ProfileFormData {
  name: string;
  factorioPath: string;
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

function formFromProfile(profile: Omit<ServerProfile, 'id'> | ServerProfile): ProfileFormData {
  return {
    name: profile.name,
    factorioPath: profile.factorioPath,
    rconPort: profile.rconPort,
    rconPassword: profile.rconPassword,
    serverPort: profile.serverPort,
    serverSettingsPath: profile.serverSettingsPath,
    adminListPath: profile.adminListPath,
    banListPath: profile.banListPath,
    whitelistPath: profile.whitelistPath,
    autoRestart: profile.autoRestart ?? false,
    restartSchedule: profile.restartSchedule ?? { type: 'off', intervalHours: 6, dailyTime: '04:00' },
    scheduledCommands: profile.scheduledCommands ?? [],
  };
}

interface ProfileFormProps {
  form: ProfileFormData;
  onChange: (form: ProfileFormData) => void;
  onAutoDetect: () => void;
  detecting: boolean;
}

function ProfileForm({ form, onChange, onAutoDetect, detecting }: ProfileFormProps) {
  function patch(partial: Partial<ProfileFormData>) {
    onChange({ ...form, ...partial });
  }

  async function browseDirectory(field: keyof ProfileFormData) {
    const result = await window.electronAPI.util.browseForDirectory();
    if (result) patch({ [field]: result });
  }

  async function browseFile(field: keyof ProfileFormData) {
    const result = await window.electronAPI.util.browseForFile();
    if (result) patch({ [field]: result });
  }

  return (
    <div className="space-y-5">
      {/* Profile Name */}
      <div>
        <label className="label">Profile Name</label>
        <input
          className="input w-full"
          type="text"
          value={form.name}
          onChange={(e) => patch({ name: e.target.value })}
          placeholder="My Server"
        />
      </div>

      {/* Factorio Path */}
      <div>
        <label className="label">Factorio Installation Path</label>
        <div className="flex items-center gap-2">
          <input
            className="input flex-1"
            type="text"
            value={form.factorioPath}
            onChange={(e) => patch({ factorioPath: e.target.value })}
            placeholder="C:\\Program Files\\Factorio"
          />
          <PathValidationIcon path={form.factorioPath} />
          <button
            className="btn-secondary whitespace-nowrap"
            onClick={() => browseDirectory('factorioPath')}
            type="button"
          >
            Browse
          </button>
          <button
            className="btn-secondary whitespace-nowrap"
            onClick={onAutoDetect}
            disabled={detecting}
            type="button"
          >
            {detecting ? 'Detecting...' : 'Auto-detect'}
          </button>
        </div>
      </div>

      {/* Ports row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="label">RCON Port</label>
          <input
            className="input w-full"
            type="number"
            min={1}
            max={65535}
            value={form.rconPort}
            onChange={(e) => patch({ rconPort: Number(e.target.value) })}
          />
        </div>
        <div>
          <label className="label">Server Port</label>
          <input
            className="input w-full"
            type="number"
            min={1}
            max={65535}
            value={form.serverPort}
            onChange={(e) => patch({ serverPort: Number(e.target.value) })}
          />
        </div>
      </div>

      {/* RCON Password */}
      <div>
        <label className="label">RCON Password</label>
        <PasswordInput
          value={form.rconPassword}
          onChange={(v) => patch({ rconPassword: v })}
          placeholder="RCON password"
        />
      </div>

      {/* Auto-restart toggle */}
      <div className="flex items-center gap-3">
        <label className="relative inline-flex items-center cursor-pointer">
          <input
            type="checkbox"
            className="sr-only peer"
            checked={form.autoRestart}
            onChange={(e) => patch({ autoRestart: e.target.checked })}
          />
          <div className="w-9 h-5 bg-factorio-darker border border-factorio-border peer-checked:bg-factorio-orange transition-colors after:content-[''] after:absolute after:top-[3px] after:left-[3px] after:bg-factorio-text after:w-3.5 after:h-3.5 peer-checked:after:translate-x-4 after:transition-transform" />
        </label>
        <div>
          <span className="text-sm text-factorio-text">Auto-restart on crash</span>
          <p className="text-xs text-factorio-muted">Automatically restart the server if it exits unexpectedly (max 3 attempts in 5 minutes)</p>
        </div>
      </div>

      {/* Scheduled restart */}
      <div className="space-y-3">
        <label className="label">Scheduled Restart</label>
        <div className="flex items-center gap-3">
          <select
            className="input"
            value={form.restartSchedule.type}
            onChange={(e) =>
              patch({
                restartSchedule: {
                  ...form.restartSchedule,
                  type: e.target.value as RestartSchedule['type'],
                },
              })
            }
          >
            <option value="off">Off</option>
            <option value="interval">Every N hours</option>
            <option value="daily">Daily at time</option>
          </select>

          {form.restartSchedule.type === 'interval' && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-factorio-muted">Every</span>
              <input
                className="input w-20"
                type="number"
                min={1}
                max={168}
                value={form.restartSchedule.intervalHours}
                onChange={(e) =>
                  patch({
                    restartSchedule: {
                      ...form.restartSchedule,
                      intervalHours: Math.max(1, Number(e.target.value)),
                    },
                  })
                }
              />
              <span className="text-sm text-factorio-muted">hours</span>
            </div>
          )}

          {form.restartSchedule.type === 'daily' && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-factorio-muted">At</span>
              <input
                className="input w-28"
                type="time"
                value={form.restartSchedule.dailyTime}
                onChange={(e) =>
                  patch({
                    restartSchedule: {
                      ...form.restartSchedule,
                      dailyTime: e.target.value,
                    },
                  })
                }
              />
            </div>
          )}
        </div>
        <p className="text-xs text-factorio-muted">
          {form.restartSchedule.type === 'off'
            ? 'No scheduled restarts'
            : 'Players will be warned at 5 min, 1 min, and 10 sec before restart'}
        </p>
      </div>

      {/* Scheduled commands */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <label className="label">Scheduled Commands</label>
          <button
            className="btn-secondary text-xs"
            type="button"
            onClick={() => {
              const newCmd: ScheduledCommand = {
                id: crypto.randomUUID(),
                command: '/server-save',
                intervalMinutes: 15,
                enabled: true,
                label: 'Auto-save',
              };
              patch({ scheduledCommands: [...(form.scheduledCommands ?? []), newCmd] });
            }}
          >
            + Add
          </button>
        </div>

        {(form.scheduledCommands ?? []).map((cmd, i) => (
          <div key={cmd.id} className="flex items-center gap-2 bg-factorio-darker border border-factorio-border p-2">
            <input
              type="checkbox"
              checked={cmd.enabled}
              onChange={(e) => {
                const updated = form.scheduledCommands.map((c, j) => j === i ? { ...c, enabled: e.target.checked } : c);
                patch({ scheduledCommands: updated });
              }}
              className="accent-factorio-orange shrink-0"
            />
            <input
              className="input flex-1 !py-1 font-mono text-sm"
              value={cmd.command}
              onChange={(e) => {
                const updated = form.scheduledCommands.map((c, j) => j === i ? { ...c, command: e.target.value } : c);
                patch({ scheduledCommands: updated });
              }}
              placeholder="/server-save"
            />
            <input
              className="input w-16 !py-1 text-sm"
              type="number"
              min={1}
              value={cmd.intervalMinutes}
              onChange={(e) => {
                const updated = form.scheduledCommands.map((c, j) => j === i ? { ...c, intervalMinutes: Math.max(1, Number(e.target.value)) } : c);
                patch({ scheduledCommands: updated });
              }}
            />
            <span className="text-xs text-factorio-muted shrink-0">min</span>
            <input
              className="input flex-1 !py-1 text-sm"
              value={cmd.label}
              onChange={(e) => {
                const updated = form.scheduledCommands.map((c, j) => j === i ? { ...c, label: e.target.value } : c);
                patch({ scheduledCommands: updated });
              }}
              placeholder="Label"
            />
            <button
              type="button"
              className="text-red-400 hover:text-red-200 text-sm px-1"
              onClick={() => {
                patch({ scheduledCommands: form.scheduledCommands.filter((_, j) => j !== i) });
              }}
            >
              &times;
            </button>
          </div>
        ))}

        <p className="text-xs text-factorio-muted">
          Commands run via RCON at the set interval while the server is running.
        </p>
      </div>

      {/* Optional file paths */}
      <div className="space-y-4">
        <h4 className="text-sm font-medium text-factorio-muted border-b border-factorio-border pb-1">
          Optional File Overrides
        </h4>

        {/* Server Settings */}
        <div>
          <label className="label">Server Settings Path</label>
          <div className="flex items-center gap-2">
            <input
              className="input flex-1"
              type="text"
              value={form.serverSettingsPath ?? ''}
              onChange={(e) =>
                patch({
                  serverSettingsPath: e.target.value || null,
                })
              }
              placeholder="Default: <factorioPath>/data/server-settings.json"
            />
            <button
              className="btn-secondary whitespace-nowrap"
              onClick={() => browseFile('serverSettingsPath')}
              type="button"
            >
              Browse
            </button>
          </div>
        </div>

        {/* Admin List */}
        <div>
          <label className="label">Admin List Path</label>
          <div className="flex items-center gap-2">
            <input
              className="input flex-1"
              type="text"
              value={form.adminListPath ?? ''}
              onChange={(e) =>
                patch({ adminListPath: e.target.value || null })
              }
              placeholder="Optional"
            />
            <button
              className="btn-secondary whitespace-nowrap"
              onClick={() => browseFile('adminListPath')}
              type="button"
            >
              Browse
            </button>
          </div>
        </div>

        {/* Ban List */}
        <div>
          <label className="label">Ban List Path</label>
          <div className="flex items-center gap-2">
            <input
              className="input flex-1"
              type="text"
              value={form.banListPath ?? ''}
              onChange={(e) =>
                patch({ banListPath: e.target.value || null })
              }
              placeholder="Optional"
            />
            <button
              className="btn-secondary whitespace-nowrap"
              onClick={() => browseFile('banListPath')}
              type="button"
            >
              Browse
            </button>
          </div>
        </div>

        {/* Whitelist */}
        <div>
          <label className="label">Whitelist Path</label>
          <div className="flex items-center gap-2">
            <input
              className="input flex-1"
              type="text"
              value={form.whitelistPath ?? ''}
              onChange={(e) =>
                patch({ whitelistPath: e.target.value || null })
              }
              placeholder="Optional"
            />
            <button
              className="btn-secondary whitespace-nowrap"
              onClick={() => browseFile('whitelistPath')}
              type="button"
            >
              Browse
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// First-time Setup Wizard
// ---------------------------------------------------------------------------

interface SetupWizardProps {
  onCreate: (profile: Omit<ServerProfile, 'id'>) => Promise<void>;
}

function SetupWizard({ onCreate }: SetupWizardProps) {
  const [form, setForm] = useState<ProfileFormData>(formFromProfile(makeEmptyProfile()));
  const [detecting, setDetecting] = useState(false);
  const [creating, setCreating] = useState(false);

  const handleAutoDetect = async () => {
    setDetecting(true);
    try {
      const detected = await window.electronAPI.util.detectFactorioPath();
      if (detected) {
        setForm((prev) => ({ ...prev, factorioPath: detected }));
      }
    } finally {
      setDetecting(false);
    }
  };

  const handleCreate = async () => {
    if (!form.name.trim() || !form.factorioPath.trim()) return;
    setCreating(true);
    try {
      await onCreate({
        ...makeEmptyProfile(),
        name: form.name,
        factorioPath: form.factorioPath,
        rconPort: form.rconPort,
        rconPassword: form.rconPassword,
        serverPort: form.serverPort,
        serverSettingsPath: form.serverSettingsPath,
        adminListPath: form.adminListPath,
        banListPath: form.banListPath,
        whitelistPath: form.whitelistPath,
        autoRestart: form.autoRestart,
        restartSchedule: form.restartSchedule,
        scheduledCommands: form.scheduledCommands,
      });
    } finally {
      setCreating(false);
    }
  };

  const isValid = form.name.trim().length > 0 && form.factorioPath.trim().length > 0;

  return (
    <div className="flex items-center justify-center h-full">
      <div className="card max-w-2xl w-full mx-4">
        <div className="mb-6">
          <h2 className="text-xl font-bold text-factorio-orange">
            Welcome to FactoryManager
          </h2>
          <p className="text-factorio-muted text-sm mt-1">
            Set up your first server profile to get started. You can always add
            more profiles later.
          </p>
        </div>

        <ProfileForm
          form={form}
          onChange={setForm}
          onAutoDetect={handleAutoDetect}
          detecting={detecting}
        />

        <div className="mt-6 flex justify-end">
          <button
            className="btn-primary"
            onClick={handleCreate}
            disabled={!isValid || creating}
          >
            {creating ? 'Creating...' : 'Create Profile & Get Started'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Settings Component
// ---------------------------------------------------------------------------

export default function Settings() {
  const { profiles, activeProfile, setActiveProfile, refreshProfiles } = useProfile();

  // Edit form state for the active profile
  const [editForm, setEditForm] = useState<ProfileFormData | null>(null);
  const [detecting, setDetecting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  // Create-new-profile state
  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState<ProfileFormData>(
    formFromProfile(makeEmptyProfile()),
  );
  const [createDetecting, setCreateDetecting] = useState(false);
  const [creating, setCreating] = useState(false);

  // App settings state
  const [appSettings, setAppSettings] = useState<AppSettings | null>(null);

  // Mod portal auth state
  const [portalAuth, setPortalAuth] = useState<ModPortalAuth | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [manualUsername, setManualUsername] = useState('');
  const [manualToken, setManualToken] = useState('');
  const [authSaving, setAuthSaving] = useState(false);

  useEffect(() => {
    window.electronAPI.appSettings.get().then(setAppSettings);
    window.electronAPI.modPortal.getAuth().then((auth) => {
      setPortalAuth(auth);
      setAuthLoading(false);
    });
  }, []);

  const updateAppSetting = useCallback(async (partial: Partial<AppSettings>) => {
    const updated = await window.electronAPI.appSettings.update(partial);
    setAppSettings(updated);
  }, []);

  // Sync edit form when activeProfile changes
  useEffect(() => {
    if (activeProfile) {
      setEditForm(formFromProfile(activeProfile));
    } else {
      setEditForm(null);
    }
  }, [activeProfile]);

  // Dismiss toast
  useEffect(() => {
    if (!toast) return;
    const id = setTimeout(() => setToast(null), 3000);
    return () => clearTimeout(id);
  }, [toast]);

  // --- Handlers ---

  const handleAutoDetect = useCallback(async () => {
    setDetecting(true);
    try {
      const detected = await window.electronAPI.util.detectFactorioPath();
      if (detected) {
        setEditForm((prev) =>
          prev ? { ...prev, factorioPath: detected } : prev,
        );
      }
    } finally {
      setDetecting(false);
    }
  }, []);

  const handleSaveProfile = useCallback(async () => {
    if (!activeProfile || !editForm) return;
    setSaving(true);
    try {
      await window.electronAPI.profiles.update(activeProfile.id, {
        name: editForm.name,
        factorioPath: editForm.factorioPath,
        rconPort: editForm.rconPort,
        rconPassword: editForm.rconPassword,
        serverPort: editForm.serverPort,
        serverSettingsPath: editForm.serverSettingsPath,
        adminListPath: editForm.adminListPath,
        banListPath: editForm.banListPath,
        whitelistPath: editForm.whitelistPath,
        autoRestart: editForm.autoRestart,
        restartSchedule: editForm.restartSchedule,
        scheduledCommands: editForm.scheduledCommands,
      });
      await refreshProfiles();
      setToast('Profile saved successfully.');
    } catch (err) {
      console.error('Failed to save profile:', err);
      setToast('Failed to save profile.');
    } finally {
      setSaving(false);
    }
  }, [activeProfile, editForm, refreshProfiles]);

  const handleCreateProfile = useCallback(
    async (profileData?: Omit<ServerProfile, 'id'>) => {
      const data = profileData ?? {
        ...makeEmptyProfile(),
        name: createForm.name,
        factorioPath: createForm.factorioPath,
        rconPort: createForm.rconPort,
        rconPassword: createForm.rconPassword,
        serverPort: createForm.serverPort,
        serverSettingsPath: createForm.serverSettingsPath,
        adminListPath: createForm.adminListPath,
        banListPath: createForm.banListPath,
        whitelistPath: createForm.whitelistPath,
        autoRestart: createForm.autoRestart,
        restartSchedule: createForm.restartSchedule,
        scheduledCommands: createForm.scheduledCommands,
      };
      setCreating(true);
      try {
        const created = await window.electronAPI.profiles.create(data);
        await refreshProfiles();
        setActiveProfile(created);
        setShowCreate(false);
        setCreateForm(formFromProfile(makeEmptyProfile()));
        setToast('Profile created successfully.');
      } catch (err) {
        console.error('Failed to create profile:', err);
        setToast('Failed to create profile.');
      } finally {
        setCreating(false);
      }
    },
    [createForm, refreshProfiles, setActiveProfile],
  );

  const handleDeleteProfile = useCallback(async () => {
    if (!activeProfile) return;
    const confirmed = window.confirm(
      `Delete profile "${activeProfile.name}"? This cannot be undone.`,
    );
    if (!confirmed) return;
    try {
      await window.electronAPI.profiles.delete(activeProfile.id);
      await refreshProfiles();
      setToast('Profile deleted.');
    } catch (err) {
      console.error('Failed to delete profile:', err);
      setToast('Failed to delete profile.');
    }
  }, [activeProfile, refreshProfiles]);

  const handleCreateAutoDetect = useCallback(async () => {
    setCreateDetecting(true);
    try {
      const detected = await window.electronAPI.util.detectFactorioPath();
      if (detected) {
        setCreateForm((prev) => ({ ...prev, factorioPath: detected }));
      }
    } finally {
      setCreateDetecting(false);
    }
  }, []);

  // --- First-time setup ---

  if (profiles.length === 0) {
    return <SetupWizard onCreate={handleCreateProfile} />;
  }

  // --- Normal settings page ---

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Toast */}
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

      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-factorio-border shrink-0">
        <h2 className="text-lg font-semibold">Settings</h2>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-8">
        {/* ---- Profile Selector ---- */}
        <div className="card">
          <h3 className="text-factorio-orange font-semibold text-sm mb-3">
            Server Profiles
          </h3>
          <div className="flex flex-wrap gap-2 mb-3">
            {profiles.map((p) => (
              <button
                key={p.id}
                className={`px-3 py-1.5 text-sm transition-colors border ${
                  activeProfile?.id === p.id
                    ? 'bg-factorio-orange text-factorio-darker border-factorio-orange font-medium'
                    : 'bg-factorio-darker text-factorio-text border-factorio-border hover:border-factorio-orange'
                }`}
                onClick={() => setActiveProfile(p)}
              >
                {p.name}
              </button>
            ))}
          </div>
          <div className="flex gap-2">
            <button
              className="btn-secondary text-xs"
              disabled={!activeProfile}
              onClick={async () => {
                if (!activeProfile) return;
                const path = await window.electronAPI.profiles.export(activeProfile.id);
                if (path) setToast('Profile exported.');
              }}
            >
              Export Profile
            </button>
            <button
              className="btn-secondary text-xs"
              onClick={async () => {
                try {
                  const imported = await window.electronAPI.profiles.import();
                  if (imported) {
                    await refreshProfiles();
                    setActiveProfile(imported);
                    setToast('Profile imported.');
                  }
                } catch (err) {
                  setToast(err instanceof Error ? err.message : 'Failed to import profile.');
                }
              }}
            >
              Import Profile
            </button>
          </div>
        </div>

        {/* ---- Edit Active Profile ---- */}
        {activeProfile && editForm && (
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-factorio-orange font-semibold text-sm">
                Edit Profile: {activeProfile.name}
              </h3>
              <button
                className="btn-danger text-xs"
                onClick={handleDeleteProfile}
              >
                Delete Profile
              </button>
            </div>

            <ProfileForm
              form={editForm}
              onChange={setEditForm}
              onAutoDetect={handleAutoDetect}
              detecting={detecting}
            />

            <div className="mt-6 flex justify-end">
              <button
                className="btn-primary"
                onClick={handleSaveProfile}
                disabled={saving}
              >
                {saving ? 'Saving...' : 'Save Profile'}
              </button>
            </div>
          </div>
        )}

        {/* ---- Create New Profile ---- */}
        <div className="card">
          {!showCreate ? (
            <button
              className="btn-secondary w-full"
              onClick={() => setShowCreate(true)}
            >
              + Create New Profile
            </button>
          ) : (
            <>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-factorio-orange font-semibold text-sm">
                  Create New Profile
                </h3>
                <button
                  className="text-factorio-muted hover:text-factorio-text text-sm"
                  onClick={() => setShowCreate(false)}
                >
                  Cancel
                </button>
              </div>

              <ProfileForm
                form={createForm}
                onChange={setCreateForm}
                onAutoDetect={handleCreateAutoDetect}
                detecting={createDetecting}
              />

              <div className="mt-6 flex justify-end">
                <button
                  className="btn-primary"
                  onClick={() => handleCreateProfile()}
                  disabled={
                    creating ||
                    !createForm.name.trim() ||
                    !createForm.factorioPath.trim()
                  }
                >
                  {creating ? 'Creating...' : 'Create Profile'}
                </button>
              </div>
            </>
          )}
        </div>

        {/* ---- App Settings ---- */}
        {appSettings && (
          <div className="card">
            <h3 className="text-factorio-orange font-semibold text-sm mb-4">
              App Settings
            </h3>
            <div className="space-y-4">
              <ToggleSetting
                label="Close to tray"
                description="Minimize to system tray instead of quitting when closing the window"
                checked={appSettings.closeToTray}
                onChange={(v) => updateAppSetting({ closeToTray: v })}
              />
              <ToggleSetting
                label="Auto-start server on launch"
                description="Automatically start the server using the active profile when the app opens"
                checked={appSettings.autoStartServer}
                onChange={(v) => updateAppSetting({ autoStartServer: v })}
              />
              <div className="border-t border-factorio-border pt-4">
                <ToggleSetting
                  label="Automatic backups"
                  description="Back up save files before server start and prune old backups"
                  checked={appSettings.backupEnabled}
                  onChange={(v) => updateAppSetting({ backupEnabled: v })}
                />
                {appSettings.backupEnabled && (
                  <div className="ml-12 mt-3 space-y-3">
                    <ToggleSetting
                      label="Backup before server start"
                      checked={appSettings.backupBeforeStart}
                      onChange={(v) => updateAppSetting({ backupBeforeStart: v })}
                    />
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-factorio-text">Max backups</span>
                      <input
                        className="input w-20"
                        type="number"
                        min={1}
                        max={100}
                        value={appSettings.maxBackups}
                        onChange={(e) => updateAppSetting({ maxBackups: Math.max(1, Number(e.target.value)) })}
                      />
                    </div>
                  </div>
                )}
              </div>
              <div className="border-t border-factorio-border pt-4">
                <ToggleSetting
                  label="UPnP port forwarding"
                  description="Automatically forward the server port on your router via UPnP when the server starts"
                  checked={appSettings.upnpEnabled}
                  onChange={(v) => updateAppSetting({ upnpEnabled: v })}
                />
              </div>
              <div className="border-t border-factorio-border pt-4">
                <ToggleSetting
                  label="Desktop notifications"
                  description="Show native OS notifications for server events"
                  checked={appSettings.notificationsEnabled}
                  onChange={(v) => updateAppSetting({ notificationsEnabled: v })}
                />
                {appSettings.notificationsEnabled && (
                  <div className="ml-12 mt-3 space-y-3">
                    <ToggleSetting
                      label="Server started"
                      checked={appSettings.notifyOnStart}
                      onChange={(v) => updateAppSetting({ notifyOnStart: v })}
                    />
                    <ToggleSetting
                      label="Server stopped"
                      checked={appSettings.notifyOnStop}
                      onChange={(v) => updateAppSetting({ notifyOnStop: v })}
                    />
                    <ToggleSetting
                      label="Server crashed"
                      checked={appSettings.notifyOnCrash}
                      onChange={(v) => updateAppSetting({ notifyOnCrash: v })}
                    />
                    <ToggleSetting
                      label="Player joined / left"
                      checked={appSettings.notifyOnPlayerJoin}
                      onChange={(v) => updateAppSetting({ notifyOnPlayerJoin: v })}
                    />
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ---- Factorio Account (Mod Portal Auth) ---- */}
        <div className="card">
          <h3 className="text-factorio-orange font-semibold text-sm mb-4">
            Factorio Account
          </h3>
          <p className="text-xs text-factorio-muted mb-4">
            Required for downloading mods from the mod portal. Credentials are auto-detected from your Factorio game installation. Set them manually if auto-detection fails.
          </p>

          {authLoading ? (
            <p className="text-sm text-factorio-muted">Checking credentials...</p>
          ) : portalAuth ? (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <span className="text-green-400 text-sm">&#10003;</span>
                <span className="text-sm text-factorio-text">
                  Logged in as <span className="font-medium text-factorio-orange">{portalAuth.username}</span>
                </span>
              </div>
              <button
                className="btn-secondary text-xs"
                onClick={async () => {
                  await window.electronAPI.modPortal.clearAuth();
                  setPortalAuth(null);
                  setManualUsername('');
                  setManualToken('');
                }}
              >
                Clear Saved Credentials
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-factorio-muted text-sm">&#10007;</span>
                <span className="text-sm text-factorio-muted">
                  No credentials detected. Enter your Factorio username and token below.
                </span>
              </div>
              <div>
                <label className="label">Username</label>
                <input
                  className="input w-full"
                  type="text"
                  value={manualUsername}
                  onChange={(e) => setManualUsername(e.target.value)}
                  placeholder="Factorio username"
                />
              </div>
              <div>
                <label className="label">Token</label>
                <PasswordInput
                  value={manualToken}
                  onChange={setManualToken}
                  placeholder="Token from player-data.json or factorio.com/profile"
                />
              </div>
              <button
                className="btn-primary text-xs"
                disabled={!manualUsername.trim() || !manualToken.trim() || authSaving}
                onClick={async () => {
                  setAuthSaving(true);
                  try {
                    await window.electronAPI.modPortal.setAuth(
                      manualUsername.trim(),
                      manualToken.trim(),
                    );
                    setPortalAuth({ username: manualUsername.trim(), token: manualToken.trim() });
                    setToast('Mod portal credentials saved.');
                  } catch {
                    setToast('Failed to save credentials.');
                  } finally {
                    setAuthSaving(false);
                  }
                }}
              >
                {authSaving ? 'Saving...' : 'Save Credentials'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
