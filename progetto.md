# Stato Attuale

- App Electron multipiattaforma con frontend Vite/JavaScript.
- Pulizia selettiva HTML e copia HTML/testo semplice in `src/cleaner.js` e `src/main.js`.
- Conversione Markdown sicura in `src/markdown.js`.
- Anteprima semantica per Lettura automatica, con tema chiaro/scuro indipendente e copia dedicata.
- Esportazione TXT, HTML, Markdown e PDF tramite `electron/main.cjs`.
- Aggiornamenti automatici con `electron-updater` e GitHub Releases, repository `WolCarlos/testo-chiaro`.
- Installer NSIS aggiornabile sopra l’installazione esistente; impostazioni conservate.
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
