import fs from 'fs/promises';
import path from 'path';
import { spawn } from 'child_process';
import { app, shell } from 'electron';
import type { SaveFile } from '../../shared/types';
import { FACTORIO_EXE_RELATIVE, SAVES_DIR } from '../util/constants';

export async function listSaves(savesDir: string): Promise<SaveFile[]> {
  try {
    const entries = await fs.readdir(savesDir);
    const saves: SaveFile[] = [];

    for (const entry of entries) {
      if (!entry.endsWith('.zip')) continue;
      const filePath = path.join(savesDir, entry);
      try {
        const stat = await fs.stat(filePath);
        if (stat.isFile()) {
          saves.push({
            name: path.basename(entry, '.zip'),
            fileName: entry,
            filePath,
            sizeBytes: stat.size,
            lastModified: stat.mtimeMs,
          });
        }
      } catch {
        // skip files we can't stat
      }
    }

    saves.sort((a, b) => b.lastModified - a.lastModified);
    return saves;
  } catch (err: unknown) {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') {
      return [];
    }
    throw err;
  }
}

export async function createSave(factorioPath: string, saveName: string, savesDir?: string): Promise<void> {
  const exePath = path.join(factorioPath, FACTORIO_EXE_RELATIVE);
  const targetDir = savesDir || path.join(factorioPath, SAVES_DIR);
  const savePath = path.join(targetDir, `${saveName}.zip`);

  const configPath = path.join(app.getPath('userData'), 'server-data', 'config.ini');

  return new Promise<void>((resolve, reject) => {
    const child = spawn(exePath, ['--config', configPath, '--create', savePath], {
      cwd: factorioPath,
      windowsHide: true,
    });

    let stderr = '';
    child.stderr?.on('data', (data: Buffer) => {
      stderr += data.toString();
    });

    child.on('exit', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`Failed to create save (exit code ${code}): ${stderr}`));
      }
    });

    child.on('error', (err) => {
      reject(new Error(`Failed to spawn factorio.exe: ${err.message}`));
    });
  });
}

export async function deleteSave(filePath: string): Promise<void> {
  await shell.trashItem(filePath);
}

export async function importSave(sourcePath: string, destDir: string, overwrite = false): Promise<string> {
  await fs.mkdir(destDir, { recursive: true });
  const fileName = path.basename(sourcePath);
  const destPath = path.join(destDir, fileName);

  if (!overwrite) {
    try {
      await fs.access(destPath);
      throw Object.assign(new Error(`Save "${fileName}" already exists`), { code: 'EEXIST' });
    } catch (err: unknown) {
      if ((err as NodeJS.ErrnoException).code === 'EEXIST') throw err;
      // ENOENT = file doesn't exist, safe to proceed
    }
  }

  await fs.copyFile(sourcePath, destPath);
  return destPath;
}
