import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createRequire } from 'node:module';
import path from 'node:path';
import fs from 'node:fs/promises';

const require = createRequire(import.meta.url);
const { prepareVersionState, removeStaleCacheEntries } = require('../electron/updater-state.cjs');
const root = path.join(process.cwd(), 'tests', 'artifacts', 'updater-state-tests');
const userDataPath = path.join(root, 'userData');
const cacheDirectory = path.join(root, 'cache');

beforeEach(async () => {
  await fs.mkdir(userDataPath, { recursive: true });
  await fs.mkdir(cacheDirectory, { recursive: true });
});

afterEach(async () => {
  await fs.rm(root, { recursive: true, force: true });
});

describe('stato versione e novità', () => {
  it('mostra le novità solo al primo avvio della stessa versione', async () => {
    const first = await prepareVersionState({ userDataPath, currentVersion: '1.4.0', cacheDirectory, cleanCache: false });
    expect(first.showWhatsNew).toBe(true);
    expect(first.previousVersion).toBe(null);
    expect(first.notes.length).toBeGreaterThan(2);

    const second = await prepareVersionState({ userDataPath, currentVersion: '1.4.0', cacheDirectory, cleanCache: false });
    expect(second.showWhatsNew).toBe(false);
    expect(second.previousVersion).toBe('1.4.0');
  });

  it('elimina la cache degli installer dopo un cambio di versione', async () => {
    const installer = path.join(cacheDirectory, 'vecchio-installer.exe');
    await fs.writeFile(installer, 'installer simulato');
    await prepareVersionState({ userDataPath, currentVersion: '1.4.0', cacheDirectory, cleanCache: false });
    const updated = await prepareVersionState({ userDataPath, currentVersion: '1.5.0', cacheDirectory, cleanCache: true });

    expect(updated.previousVersion).toBe('1.4.0');
    expect(updated.showWhatsNew).toBe(true);
    await expect(fs.stat(cacheDirectory)).rejects.toMatchObject({ code: 'ENOENT' });
  });

  it('rimuove solo i file obsoleti quando la versione non cambia', async () => {
    const stale = path.join(cacheDirectory, 'vecchio.exe');
    const fresh = path.join(cacheDirectory, 'recente.exe');
    await fs.writeFile(stale, 'vecchio');
    await fs.writeFile(fresh, 'recente');
    const tenDaysAgo = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000);
    await fs.utimes(stale, tenDaysAgo, tenDaysAgo);

    const removed = await removeStaleCacheEntries(cacheDirectory);
    expect(removed).toBe(1);
    await expect(fs.stat(stale)).rejects.toMatchObject({ code: 'ENOENT' });
    await expect(fs.stat(fresh)).resolves.toBeTruthy();
  });
});
