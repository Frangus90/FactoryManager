import https from 'https';
import fs from 'fs/promises';
import { createWriteStream, createReadStream } from 'fs';
import path from 'path';
import crypto from 'crypto';
import { BrowserWindow } from 'electron';
import { IPC } from '../../shared/ipc-channels';
import type {
  PortalMod,
  PortalModFull,
  PortalRelease,
  ModUpdate,
  ModPortalAuth,
  ModInfo,
  DownloadProgress,
} from '../../shared/types';
import { setModEnabled } from './mod-manager';

const BASE_URL = 'https://mods.factorio.com';
const API_BASE = `${BASE_URL}/api`;

// ---- Version comparison ----

function isNewerVersion(latest: string, installed: string): boolean {
  const parse = (v: string) => v.split('.').map((s) => parseInt(s, 10) || 0);
  const a = parse(latest);
  const b = parse(installed);
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    const av = a[i] ?? 0;
    const bv = b[i] ?? 0;
    if (av > bv) return true;
    if (av < bv) return false;
  }
  return false;
}

// ---- HTTP helpers ----

function httpsGet(url: string, maxRedirects = 5): Promise<{ statusCode: number; body: string }> {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      if ((res.statusCode === 301 || res.statusCode === 302) && res.headers.location) {
        res.resume();
        if (maxRedirects <= 0) {
          reject(new Error('Too many redirects'));
          return;
        }
        httpsGet(res.headers.location, maxRedirects - 1).then(resolve, reject);
        return;
      }

      const chunks: Buffer[] = [];
      res.on('data', (chunk: Buffer) => chunks.push(chunk));
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode ?? 0,
          body: Buffer.concat(chunks).toString('utf-8'),
        });
      });
      res.on('error', reject);
    }).on('error', reject);
  });
}

function httpsDownload(
  url: string,
  destPath: string,
  onProgress: (percent: number) => void,
  maxRedirects = 5,
): Promise<void> {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      if (res.statusCode === 302 || res.statusCode === 301) {
        res.resume();
        const location = res.headers.location;
        if (!location) {
          reject(new Error('Redirect without location header'));
          return;
        }
        if (maxRedirects <= 0) {
          reject(new Error('Too many redirects'));
          return;
        }
        httpsDownload(location, destPath, onProgress, maxRedirects - 1).then(resolve, reject);
        return;
      }

      if (res.statusCode !== 200) {
        res.resume();
        reject(new Error(`Download failed with status ${res.statusCode}`));
        return;
      }

      const totalBytes = parseInt(res.headers['content-length'] ?? '0', 10);
      let receivedBytes = 0;
      const fileStream = createWriteStream(destPath);

      res.on('data', (chunk: Buffer) => {
        receivedBytes += chunk.length;
        if (totalBytes > 0) {
          onProgress(Math.round((receivedBytes / totalBytes) * 100));
        }
      });

      res.pipe(fileStream);
      fileStream.on('finish', () => {
        fileStream.close();
        resolve();
      });
      fileStream.on('error', (err) => {
        fileStream.close();
        fs.unlink(destPath).catch(() => {});
        reject(err);
      });
      res.on('error', (err) => {
        res.destroy();
        fileStream.close();
        fs.unlink(destPath).catch(() => {});
        reject(err);
      });
    }).on('error', reject);
  });
}

// ---- Safe JSON parse ----

function parseJsonResponse(body: string, statusCode: number): unknown {
  try {
    return JSON.parse(body);
  } catch {
    throw new Error(`Mod portal returned invalid JSON (status ${statusCode})`);
  }
}

// ---- Send progress to renderer ----

function sendProgress(progress: DownloadProgress): void {
  for (const win of BrowserWindow.getAllWindows()) {
    win.webContents.send(IPC.MOD_PORTAL_DOWNLOAD_PROGRESS, progress);
  }
}

// ---- Download concurrency guard ----

const activeDownloads = new Map<string, Promise<string>>();

// ---- Catalog ----

export async function fetchCatalog(factorioVersion: string): Promise<PortalMod[]> {
  const url = `${API_BASE}/mods?page_size=max&hide_deprecated=true&version=${factorioVersion}`;
  const { statusCode, body } = await httpsGet(url);

  if (statusCode !== 200) {
    throw new Error(`Mod portal returned status ${statusCode}`);
  }

  const data = parseJsonResponse(body, statusCode) as { results?: PortalMod[] };
  return data.results ?? [];
}

// ---- Mod Details ----

export async function fetchModDetails(modName: string): Promise<PortalModFull> {
  const url = `${API_BASE}/mods/${encodeURIComponent(modName)}/full`;
  const { statusCode, body } = await httpsGet(url);

  if (statusCode !== 200) {
    throw new Error(`Mod portal returned status ${statusCode} for ${modName}`);
  }

  return parseJsonResponse(body, statusCode) as PortalModFull;
}

// ---- Download + Install ----

function verifySha1(filePath: string, expectedSha1: string): Promise<boolean> {
  return new Promise((resolve, reject) => {
    const hash = crypto.createHash('sha1');
    const stream = createReadStream(filePath);
    stream.on('data', (chunk) => hash.update(chunk));
    stream.on('end', () => resolve(hash.digest('hex') === expectedSha1));
    stream.on('error', reject);
  });
}

export async function downloadMod(
  modName: string,
  release: PortalRelease,
  modsDir: string,
  auth: ModPortalAuth,
): Promise<string> {
  // Concurrency guard: if already downloading this mod, return existing promise
  const existing = activeDownloads.get(modName);
  if (existing) return existing;

  const promise = doDownload(modName, release, modsDir, auth);
  activeDownloads.set(modName, promise);
  promise.finally(() => activeDownloads.delete(modName));
  return promise;
}

async function doDownload(
  modName: string,
  release: PortalRelease,
  modsDir: string,
  auth: ModPortalAuth,
): Promise<string> {
  const downloadUrl = `${BASE_URL}${release.download_url}?username=${encodeURIComponent(auth.username)}&token=${encodeURIComponent(auth.token)}`;
  const destFileName = release.file_name;

  // Path traversal guard
  const resolvedDir = path.resolve(modsDir);
  const finalPath = path.resolve(modsDir, destFileName);
  if (!finalPath.startsWith(resolvedDir + path.sep)) {
    throw new Error('Invalid file name: path traversal detected');
  }
  const tempPath = finalPath + '.tmp';

  sendProgress({ modName, phase: 'downloading', percent: 0 });

  try {
    await httpsDownload(downloadUrl, tempPath, (percent) => {
      sendProgress({ modName, phase: 'downloading', percent });
    });

    sendProgress({ modName, phase: 'verifying', percent: 100 });

    if (release.sha1) {
      const valid = await verifySha1(tempPath, release.sha1);
      if (!valid) {
        await fs.unlink(tempPath).catch(() => {});
        const error = 'SHA1 verification failed';
        sendProgress({ modName, phase: 'error', percent: 0, error });
        throw new Error(error);
      }
    }

    // Move temp to final (overwrite if exists for updates)
    await fs.rename(tempPath, finalPath);

    // Enable in mod-list.json
    await setModEnabled(modsDir, modName, true);

    sendProgress({ modName, phase: 'complete', percent: 100 });
    return finalPath;
  } catch (err) {
    await fs.unlink(tempPath).catch(() => {});
    if ((err as Error).message !== 'SHA1 verification failed') {
      sendProgress({
        modName,
        phase: 'error',
        percent: 0,
        error: (err as Error).message,
      });
    }
    throw err;
  }
}

// ---- Update Checking ----

export async function checkUpdates(
  installedMods: ModInfo[],
  factorioVersion: string,
): Promise<ModUpdate[]> {
  // Filter out 'base' and mods without names
  const modsToCheck = installedMods.filter((m) => m.name && m.name !== 'base');
  if (modsToCheck.length === 0) return [];

  // Build namelist query
  const nameParams = modsToCheck.map((m) => `namelist=${encodeURIComponent(m.name)}`).join('&');
  const url = `${API_BASE}/mods?${nameParams}&page_size=max`;
  const { statusCode, body } = await httpsGet(url);

  if (statusCode !== 200) {
    throw new Error(`Mod portal returned status ${statusCode}`);
  }

  const data = parseJsonResponse(body, statusCode) as { results?: PortalMod[] };
  const portalMods: PortalMod[] = data.results ?? [];

  const updates: ModUpdate[] = [];
  const installedMap = new Map(modsToCheck.map((m) => [m.name, m]));

  for (const portalMod of portalMods) {
    const installed = installedMap.get(portalMod.name);
    if (!installed || !portalMod.latest_release) continue;

    const latestVersion = portalMod.latest_release.version;
    const latestFactorioVersion = portalMod.latest_release.info_json?.factorio_version;

    // Only suggest updates that match current factorio version
    if (latestFactorioVersion && latestFactorioVersion !== factorioVersion) continue;

    // Only suggest if portal version is strictly newer (not just different)
    if (isNewerVersion(latestVersion, installed.version)) {
      updates.push({
        name: portalMod.name,
        title: portalMod.title,
        installedVersion: installed.version,
        latestVersion,
        release: portalMod.latest_release,
      });
    }
  }

  return updates;
}
