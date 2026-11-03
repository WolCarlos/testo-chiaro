# Stato Attuale

- App desktop **Wol Edit Text** (dalla 1.3.0), Electron multipiattaforma con frontend Vite/JavaScript.
- `appId` storico `it.testochiaro.desktop` e repository `WolCarlos/testo-chiaro` invariati per compatibilità aggiornamenti.
- Icona e grafiche NSIS generate da `scripts/generate_assets.py` in `build/`.
- Pulizia selettiva HTML e copia HTML/testo semplice in `src/cleaner.js` e `src/main.js`.
- Conversione Markdown sicura in `src/markdown.js`.
- Anteprima semantica per Lettura automatica, con tema chiaro/scuro indipendente e copia dedicata.
- Esportazione TXT, HTML, Markdown e PDF tramite `electron/main.cjs`.
- Aggiornamenti automatici con `electron-updater` e GitHub Releases.
- Installer NSIS aggiornabile sopra l’installazione esistente; preferenze conservate nella cartella utente storica `Testo Chiaro`.
- Release Windows automatizzata da `.github/workflows/release.yml` al push dei tag `v*`.

# Database Schema

- Nessun database. Preferenze locali in `localStorage`; dati utente non eliminati dall’aggiornamento.

# API Endpoints

- Nessun backend proprio.
- IPC `save-text`, `export-pdf`, `updates:get-version`, `updates:check`, `updates:install`.
- Evento IPC `updates:status` per stato controllo/download/installazione.
- Provider aggiornamenti: GitHub Releases pubbliche.

# AI Tasks

- Nessun modello o prompt AI configurato nell’app.
