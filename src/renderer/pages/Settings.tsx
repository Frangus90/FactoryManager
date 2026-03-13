import React, { useState, useEffect, useCallback } from 'react';
import { useProfile } from '../context/ProfileContext';
import type { ServerProfile } from '../../shared/types';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const EMPTY_PROFILE: Omit<ServerProfile, 'id'> = {
  name: '',
  factorioPath: '',
  selectedSave: null,
  useLatestSave: true,
  rconPort: 27015,
  rconPassword: '',
  serverPort: 34197,
  serverSettingsPath: null,
  adminListPath: null,
  banListPath: null,
  whitelistPath: null,
};

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
  const [form, setForm] = useState<ProfileFormData>(formFromProfile(EMPTY_PROFILE));
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
        ...EMPTY_PROFILE,
        name: form.name,
        factorioPath: form.factorioPath,
        rconPort: form.rconPort,
        rconPassword: form.rconPassword,
        serverPort: form.serverPort,
        serverSettingsPath: form.serverSettingsPath,
        adminListPath: form.adminListPath,
        banListPath: form.banListPath,
        whitelistPath: form.whitelistPath,
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
    formFromProfile(EMPTY_PROFILE),
  );
  const [createDetecting, setCreateDetecting] = useState(false);
  const [creating, setCreating] = useState(false);

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
        ...EMPTY_PROFILE,
        name: createForm.name,
        factorioPath: createForm.factorioPath,
        rconPort: createForm.rconPort,
        rconPassword: createForm.rconPassword,
        serverPort: createForm.serverPort,
        serverSettingsPath: createForm.serverSettingsPath,
        adminListPath: createForm.adminListPath,
        banListPath: createForm.banListPath,
        whitelistPath: createForm.whitelistPath,
      };
      setCreating(true);
      try {
        const created = await window.electronAPI.profiles.create(data);
        await refreshProfiles();
        setActiveProfile(created);
        setShowCreate(false);
        setCreateForm(formFromProfile(EMPTY_PROFILE));
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
        <div className="mx-4 mt-4 px-4 py-2 rounded bg-green-900/60 border border-green-700 text-green-300 text-sm flex items-center justify-between">
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
          <div className="flex flex-wrap gap-2">
            {profiles.map((p) => (
              <button
                key={p.id}
                className={`px-3 py-1.5 rounded text-sm transition-colors border ${
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
      </div>
    </div>
  );
}
