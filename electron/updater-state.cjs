const fs = require('node:fs/promises');
const path = require('node:path');

const RELEASE_NOTES = {
  '1.4.0': [
    'Nuova schermata Novità al primo avvio di ogni versione.',
    'Download e installazione degli aggiornamenti solo dopo la tua conferma.',
    'Nessuna installazione automatica alla chiusura dell’app.',
    'Pulizia dei vecchi installer dalla cache dopo un aggiornamento.',
    'Informativa privacy, accessibilità e licenze disponibili nella guida.',
  ],
};

async function removeStaleCacheEntries(cacheDirectory, maxAgeMs = 7 * 24 * 60 * 60 * 1000) {
  if (!cacheDirectory) return 0;
  const cutoff = Date.now() - maxAgeMs;
  let removed = 0;

  async function visit(directory) {
    let entries;
    try {
      entries = await fs.readdir(directory, { withFileTypes: true });
    } catch (error) {
      if (error.code === 'ENOENT') return;
      throw error;
    }
    for (const entry of entries) {
      const target = path.join(directory, entry.name);
      if (entry.isDirectory()) {
        await visit(target);
        await fs.rmdir(target).catch(() => {});
      } else {
        const stats = await fs.stat(target).catch(() => null);
        if (stats && stats.mtimeMs < cutoff) {
          await fs.unlink(target).catch(() => {});
          removed += 1;
        }
      }
    }
  }

  await visit(cacheDirectory);
  return removed;
}

async function prepareVersionState({ userDataPath, currentVersion, cacheDirectory, cleanCache = true }) {
  const statePath = path.join(userDataPath, 'update-state.json');
  let previousVersion = null;
  try {
    const stored = JSON.parse(await fs.readFile(statePath, 'utf8'));
    previousVersion = stored.version || null;
  } catch {}

  const versionChanged = previousVersion !== currentVersion;
  if (cleanCache) {
    if (previousVersion && versionChanged) {
      await fs.rm(cacheDirectory, { recursive: true, force: true });
    } else {
      await removeStaleCacheEntries(cacheDirectory);
    }
  }

  await fs.mkdir(userDataPath, { recursive: true });
  await fs.writeFile(statePath, JSON.stringify({ version: currentVersion, updatedAt: new Date().toISOString() }), 'utf8');
  return {
    currentVersion,
    previousVersion,
    showWhatsNew: versionChanged,
    notes: RELEASE_NOTES[currentVersion] || ['Miglioramenti generali e correzioni.'],
  };
}

module.exports = { RELEASE_NOTES, prepareVersionState, removeStaleCacheEntries };
