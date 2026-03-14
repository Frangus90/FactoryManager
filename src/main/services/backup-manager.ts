import fs from 'fs';
import fsp from 'fs/promises';
import path from 'path';
import { app } from 'electron';
import type { BackupEntry } from '../../shared/types';

function defaultBackupDir(): string {
  return path.join(app.getPath('userData'), 'backups');
}

function timestampId(): string {
  const d = new Date();
  return [
    d.getFullYear(),
    String(d.getMonth() + 1).padStart(2, '0'),
    String(d.getDate()).padStart(2, '0'),
    '_',
    String(d.getHours()).padStart(2, '0'),
    String(d.getMinutes()).padStart(2, '0'),
    String(d.getSeconds()).padStart(2, '0'),
  ].join('');
}

export async function createBackup(savesDir: string, backupDir?: string | null): Promise<string> {
  const baseDir = backupDir || defaultBackupDir();
  const id = timestampId();
  const dest = path.join(baseDir, id);
  await fsp.mkdir(dest, { recursive: true });

  // Copy all .zip files from saves dir
  let files: string[] = [];
  try {
    const entries = await fsp.readdir(savesDir);
    files = entries.filter((f) => f.endsWith('.zip'));
  } catch {
    // No saves to backup
  }

  for (const file of files) {
    await fsp.copyFile(path.join(savesDir, file), path.join(dest, file));
  }

  // Write manifest
  await fsp.writeFile(
    path.join(dest, 'backup.json'),
    JSON.stringify({ timestamp: Date.now(), files }, null, 2),
    'utf-8',
  );

  return dest;
}

export async function listBackups(backupDir?: string | null): Promise<BackupEntry[]> {
  const baseDir = backupDir || defaultBackupDir();
  let dirs: string[];
  try {
    const entries = await fsp.readdir(baseDir, { withFileTypes: true });
    dirs = entries.filter((e) => e.isDirectory()).map((e) => e.name);
  } catch {
    return [];
  }

  const results: BackupEntry[] = [];
  for (const dir of dirs) {
    const dirPath = path.join(baseDir, dir);
    const manifestPath = path.join(dirPath, 'backup.json');
    try {
      const raw = await fsp.readFile(manifestPath, 'utf-8');
      const manifest = JSON.parse(raw) as { timestamp: number; files: string[] };

      let totalSize = 0;
      for (const file of manifest.files) {
        try {
          const stat = await fsp.stat(path.join(dirPath, file));
          totalSize += stat.size;
        } catch {
          // File may have been manually deleted
        }
      }

      results.push({
        id: dir,
        timestamp: manifest.timestamp,
        path: dirPath,
        saveCount: manifest.files.length,
        totalSizeBytes: totalSize,
      });
    } catch {
      // Invalid backup dir — skip
    }
  }

  return results.sort((a, b) => b.timestamp - a.timestamp);
}

export async function restoreBackup(backupPath: string, savesDir: string): Promise<void> {
  await fsp.mkdir(savesDir, { recursive: true });

  const entries = await fsp.readdir(backupPath);
  const zips = entries.filter((f) => f.endsWith('.zip'));

  for (const file of zips) {
    await fsp.copyFile(path.join(backupPath, file), path.join(savesDir, file));
  }
}

export async function deleteBackup(backupPath: string, backupDir?: string | null): Promise<void> {
  const baseDir = backupDir || defaultBackupDir();
  const resolved = path.resolve(backupPath);
  if (!resolved.startsWith(path.resolve(baseDir))) {
    throw new Error('Path traversal blocked');
  }
  await fsp.rm(resolved, { recursive: true, force: true });
}

export async function pruneBackups(maxCount: number, backupDir?: string | null): Promise<void> {
  const backups = await listBackups(backupDir);
  if (backups.length <= maxCount) return;

  // Sorted newest first — delete the oldest
  const toDelete = backups.slice(maxCount);
  for (const backup of toDelete) {
    await deleteBackup(backup.path, backupDir);
  }
}
