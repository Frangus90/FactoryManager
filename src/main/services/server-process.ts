import { ChildProcess, spawn } from 'child_process';
import { EventEmitter } from 'events';
import { app } from 'electron';
import fs from 'fs';
import path from 'path';
import readline from 'readline';

import type { LogEntry, ServerProfile, ServerStatus } from '../../shared/types';
import { DEFAULT_SERVER_PORT, FACTORIO_EXE_RELATIVE, resolveUserDataPath } from '../util/constants';
import { DEFAULT_SERVER_SETTINGS } from '../../shared/server-settings.schema';
import { rconClient } from './rcon-client';

const GRACEFUL_SHUTDOWN_TIMEOUT_MS = 15_000;
const RCON_CONNECT_MAX_RETRIES = 3;
const RCON_CONNECT_RETRY_DELAY_MS = 2_000;

/**
 * Manages the lifecycle of a Factorio dedicated server child process.
 *
 * Emitted events:
 *   - 'statusChange' (status: ServerStatus)
 *   - 'log' (entry: LogEntry)
 */
export class ServerProcessManager extends EventEmitter {
  private status: ServerStatus = 'stopped';
  private child: ChildProcess | null = null;
  private activeProfile: ServerProfile | null = null;

  // ──────────────────────────────────────────────
  //  Public API
  // ──────────────────────────────────────────────

  getStatus(): ServerStatus {
    return this.status;
  }

  /**
   * Spawn the Factorio dedicated server for the given profile.
   * Resolves once the process has been spawned (not once the server is
   * fully ready -- listen for the 'statusChange' event for that).
   */
  async start(profile: ServerProfile): Promise<void> {
    if (this.status !== 'stopped' && this.status !== 'errored') {
      throw new Error(`Cannot start server while status is "${this.status}"`);
    }

    // --- Validate executable path ---
    const exePath = path.join(profile.factorioPath, FACTORIO_EXE_RELATIVE);
    if (!fs.existsSync(exePath)) {
      throw new Error(`Factorio executable not found at: ${exePath}`);
    }

    // --- Build CLI argument list ---
    const args = this.buildArgs(profile);

    // --- Transition to starting ---
    this.setStatus('starting');
    this.activeProfile = profile;

    // --- Spawn child process ---
    const child = spawn(exePath, args, {
      cwd: profile.factorioPath,
      stdio: ['ignore', 'pipe', 'pipe'],
      windowsHide: true,
    });

    this.child = child;

    // --- Wire up stdout ---
    if (child.stdout) {
      const stdoutRL = readline.createInterface({ input: child.stdout });
      stdoutRL.on('line', (line) => {
        this.emitLog('stdout', line);

        // Detect the server becoming ready for connections.
        if (line.includes('Hosting game at')) {
          this.setStatus('running');
          this.autoConnectRcon(profile);
        }
      });
    }

    // --- Wire up stderr ---
    if (child.stderr) {
      const stderrRL = readline.createInterface({ input: child.stderr });
      stderrRL.on('line', (line) => {
        this.emitLog('stderr', line);
      });
    }

    // --- Handle process exit ---
    child.on('exit', (code, signal) => {
      this.child = null;
      this.activeProfile = null;

      if (this.status === 'stopping') {
        this.setStatus('stopped');
      } else {
        // Unexpected exit.
        this.emitLog(
          'stderr',
          `Server process exited unexpectedly (code=${code}, signal=${signal})`,
        );
        this.setStatus('errored');
      }
    });

    // --- Handle spawn errors (e.g. ENOENT) ---
    child.on('error', (err) => {
      this.child = null;
      this.activeProfile = null;
      this.emitLog('stderr', `Failed to start server process: ${err.message}`);
      this.setStatus('errored');
    });
  }

  /**
   * Gracefully stop the running Factorio server.
   *
   * 1. Send `/quit` via RCON (if connected).
   * 2. Wait up to 15 seconds for the process to exit on its own.
   * 3. Force-kill the process if it is still running after the timeout.
   */
  async stop(): Promise<void> {
    if (!this.child) {
      // Nothing to stop; ensure we are in a clean state.
      this.setStatus('stopped');
      return;
    }

    this.setStatus('stopping');

    // Attempt a graceful shutdown through RCON.
    try {
      await rconClient.execute('/quit');
    } catch {
      // RCON may not be connected -- fall through to force-kill path.
    }

    // Wait for the process to exit on its own within the timeout.
    const exited = await this.waitForExit(GRACEFUL_SHUTDOWN_TIMEOUT_MS);

    if (!exited && this.child) {
      // Force-kill as a last resort.
      this.child.kill();
      // Give a moment for the kill signal to be processed.
      await this.waitForExit(3_000);
    }

    // Ensure final state regardless of what happened above.
    this.child = null;
    this.activeProfile = null;

    if (this.status !== 'stopped') {
      this.setStatus('stopped');
    }
  }

  // ──────────────────────────────────────────────
  //  Private helpers
  // ──────────────────────────────────────────────

  private buildArgs(profile: ServerProfile): string[] {
    const args: string[] = [];
    const userDataDir = resolveUserDataPath(profile.factorioPath);

    // --- Isolated server data directory ---
    // The game client and dedicated server both try to acquire a .lock file
    // in the write-data directory (%APPDATA%\Factorio by default). Running
    // both at the same time fails with "Couldn't create lock file". We solve
    // this by giving the server its own write-data directory via a custom
    // config.ini so each instance gets its own .lock file.
    const serverDataDir = path.join(app.getPath('userData'), 'server-data');
    if (!fs.existsSync(serverDataDir)) {
      fs.mkdirSync(serverDataDir, { recursive: true });
    }
    const configPath = path.join(serverDataDir, 'config.ini');
    if (!fs.existsSync(configPath)) {
      // Minimal config — only override write-data so the .lock file lands
      // in our own directory instead of %APPDATA%\Factorio.
      const configContent = [
        '[path]',
        `write-data=${serverDataDir.replace(/\\/g, '/')}`,
        '',
      ].join('\n');
      fs.writeFileSync(configPath, configContent, 'utf-8');
    }
    args.push('--config', configPath);

    // --- Save selection ---
    // Server saves live in our isolated server-data/saves/ directory.
    // We scan that directory for the latest save when useLatestSave is on.
    const serverSavesDir = path.join(serverDataDir, 'saves');
    if (profile.useLatestSave) {
      const latestSave = this.findLatestSave(serverSavesDir);
      if (!latestSave) {
        throw new Error('No save files found. Import a save or create one first.');
      }
      args.push('--start-server', latestSave);
    } else if (profile.selectedSave) {
      args.push('--start-server', profile.selectedSave);
    } else {
      throw new Error('No save selected');
    }

    // --- Server settings ---
    const settingsPath =
      profile.serverSettingsPath ??
      path.join(profile.factorioPath, 'data', 'server-settings.json');
    // Auto-create if missing — prefer the example file shipped with Factorio,
    // fall back to our built-in defaults. Either way, force visibility.public
    // to false so the server doesn't try to register on factorio.com without
    // an auth token (which would produce a "Missing token" error).
    if (!fs.existsSync(settingsPath)) {
      const dir = path.dirname(settingsPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      const examplePath = path.join(profile.factorioPath, 'data', 'server-settings.example.json');
      let settings: Record<string, unknown>;
      if (fs.existsSync(examplePath)) {
        settings = JSON.parse(fs.readFileSync(examplePath, 'utf-8'));
      } else {
        settings = { ...DEFAULT_SERVER_SETTINGS };
      }
      // Safe default: don't try to list on the public server browser
      if (settings.visibility && typeof settings.visibility === 'object') {
        (settings.visibility as Record<string, unknown>).public = false;
      }
      fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2), 'utf-8');
    }
    args.push('--server-settings', settingsPath);

    // --- RCON ---
    args.push('--rcon-port', String(profile.rconPort));
    args.push('--rcon-password', profile.rconPassword);

    // --- Game port (only if non-default) ---
    if (profile.serverPort !== DEFAULT_SERVER_PORT) {
      args.push('--port', String(profile.serverPort));
    }

    // --- Mod directory ---
    // Ensure the server loads mods from the user data directory, which for
    // Steam/installer installs is %APPDATA%\Factorio\mods rather than the
    // installation directory.
    const modsDir = path.join(userDataDir, 'mods');
    if (fs.existsSync(modsDir)) {
      args.push('--mod-directory', modsDir);
    }

    // --- Optional list files ---
    // Use the profile path if set, otherwise check for the file at the
    // default location in the user data directory. This way, files created
    // through the Players tab are picked up automatically.
    const adminList = profile.adminListPath
      ?? path.join(userDataDir, 'server-adminlist.json');
    if (fs.existsSync(adminList)) {
      args.push('--server-adminlist', adminList);
    }

    const banList = profile.banListPath
      ?? path.join(userDataDir, 'server-banlist.json');
    if (fs.existsSync(banList)) {
      args.push('--server-banlist', banList);
    }

    const whitelist = profile.whitelistPath
      ?? path.join(userDataDir, 'server-whitelist.json');
    if (fs.existsSync(whitelist)) {
      args.push('--server-whitelist', whitelist);
    }

    return args;
  }

  /**
   * Scan a saves directory and return the absolute path of the most recently
   * modified .zip file, or null if none are found.
   */
  private findLatestSave(savesDir: string): string | null {
    if (!fs.existsSync(savesDir)) return null;
    let latestPath: string | null = null;
    let latestMtime = 0;
    for (const entry of fs.readdirSync(savesDir)) {
      if (!entry.endsWith('.zip')) continue;
      const fullPath = path.join(savesDir, entry);
      try {
        const stat = fs.statSync(fullPath);
        if (stat.isFile() && stat.mtimeMs > latestMtime) {
          latestMtime = stat.mtimeMs;
          latestPath = fullPath;
        }
      } catch {
        // skip files we can't stat
      }
    }
    return latestPath;
  }

  /**
   * After the server reaches RUNNING state, attempt to connect the RCON
   * client with up to {@link RCON_CONNECT_MAX_RETRIES} retries.
   */
  private async autoConnectRcon(profile: ServerProfile): Promise<void> {
    for (let attempt = 1; attempt <= RCON_CONNECT_MAX_RETRIES; attempt++) {
      // Bail out if the server was stopped while we were waiting.
      if (this.status !== 'running') return;

      try {
        await rconClient.connect('127.0.0.1', profile.rconPort, profile.rconPassword);
        return; // Connected successfully.
      } catch (err) {
        const message =
          err instanceof Error ? err.message : String(err);
        this.emitLog(
          'stderr',
          `RCON connection attempt ${attempt}/${RCON_CONNECT_MAX_RETRIES} failed: ${message}`,
        );

        if (attempt < RCON_CONNECT_MAX_RETRIES) {
          await this.delay(RCON_CONNECT_RETRY_DELAY_MS);
        }
      }
    }

    this.emitLog('stderr', 'All RCON connection attempts exhausted. Connect manually via the RCON tab.');
  }

  /**
   * Returns a promise that resolves to `true` if the child process exits
   * within the given timeout, or `false` if it does not.
   */
  private waitForExit(timeoutMs: number): Promise<boolean> {
    return new Promise<boolean>((resolve) => {
      if (!this.child) {
        resolve(true);
        return;
      }

      let settled = false;

      const onExit = () => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        resolve(true);
      };

      const timer = setTimeout(() => {
        if (settled) return;
        settled = true;
        this.child?.removeListener('exit', onExit);
        resolve(false);
      }, timeoutMs);

      this.child.once('exit', onExit);
    });
  }

  private setStatus(status: ServerStatus): void {
    if (this.status === status) return;
    this.status = status;
    this.emit('statusChange', status);
  }

  private emitLog(stream: 'stdout' | 'stderr', text: string): void {
    const entry: LogEntry = {
      timestamp: Date.now(),
      stream,
      text,
    };
    this.emit('log', entry);
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

export const serverProcess = new ServerProcessManager();
