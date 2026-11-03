const { app, BrowserWindow, ipcMain, dialog, shell, protocol, net } = require('electron');
const { autoUpdater } = require('electron-updater');
const path = require('node:path');
const fs = require('node:fs/promises');
const { pathToFileURL } = require('node:url');

protocol.registerSchemesAsPrivileged([
  { scheme: 'app', privileges: { standard: true, secure: true, supportFetchAPI: true } },
]);

const distDirectory = path.join(__dirname, '..', 'dist');
let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 920,
    minWidth: 900,
    minHeight: 650,
    show: false,
    backgroundColor: '#f2f5f2',
    autoHideMenuBar: true,
    title: 'Testo Chiaro',
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  mainWindow.once('ready-to-show', () => mainWindow.show());
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:\/\//i.test(url)) shell.openExternal(url);
    return { action: 'deny' };
  });
  mainWindow.webContents.on('will-navigate', (event, url) => {
    const current = mainWindow.webContents.getURL();
    if (url !== current) {
      event.preventDefault();
      if (/^https?:\/\//i.test(url)) shell.openExternal(url);
    }
  });

  if (process.env.VITE_DEV_SERVER_URL) mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL);
  else mainWindow.loadURL('app://localhost/index.html');
}

const pdfMarginTypes = { normal: 0, narrow: 1, wide: 0 };

function pdfCss(options) {
  const margins = { normal: '22mm', narrow: '12mm', wide: '32mm' };
  const margin = margins[options.pdfMargins] || margins.normal;
  const fontFamily = String(options.fontFamily || 'Arial, sans-serif').replace(/[{}<>]/g, '');
  const fontSize = Math.min(48, Math.max(8, Number(options.fontSize) || 11));
  const lineHeight = String(options.lineHeight || '1.5').replace(/[^0-9.]/g, '');
  const color = options.forceLight ? '#111827' : '#17211b';
  return `
    @page { size: ${options.pdfPageSize === 'Letter' ? 'Letter' : 'A4'} ${options.pdfLandscape === 'true' ? 'landscape' : 'portrait'}; margin: ${margin}; }
    * { box-sizing: border-box; }
    html, body { margin: 0; padding: 0; background: #fff; }
    body { color: ${color}; font-family: ${fontFamily}; font-size: ${fontSize}pt; line-height: ${lineHeight}; }
    main { width: 100%; overflow-wrap: break-word; }
    h1, h2, h3, h4, h5, h6 { line-height: 1.25; break-after: avoid-page; }
    h1 { font-size: 2em; } h2 { font-size: 1.55em; } h3 { font-size: 1.25em; }
    p, li { orphans: 3; widows: 3; }
    img { max-width: 100%; height: auto; break-inside: avoid-page; }
    table { border-collapse: collapse; width: 100%; margin: 1em 0; break-inside: auto; }
    tr { break-inside: avoid-page; }
    th, td { border: 1px solid #b8c2ba; padding: 7px 9px; text-align: left; vertical-align: top; }
    pre { white-space: pre-wrap; overflow-wrap: anywhere; padding: 14px; background: #f1f5f9; color: #17211b; break-inside: avoid-page; }
    code { font-family: Consolas, monospace; font-size: .9em; }
    blockquote { margin-left: 0; padding-left: 16px; border-left: 4px solid #a9b7ae; color: #49584e; }
    a { color: #075ea8; text-decoration: underline; }
    hr { border: 0; border-top: 1px solid #ccd5ce; }
    .pdf-title { font-size: 1.6em; margin: 0 0 1em; }
  `;
}

ipcMain.handle('save-text', async (event, { content, fileName, extension }) => {
  const window = BrowserWindow.fromWebContents(event.sender);
  const filters = {
    html: [{ name: 'Documento HTML', extensions: ['html'] }],
    md: [{ name: 'Documento Markdown', extensions: ['md'] }],
    txt: [{ name: 'Testo semplice', extensions: ['txt'] }],
  };
  const result = await dialog.showSaveDialog(window, {
    title: 'Esporta documento',
    defaultPath: fileName,
    filters: filters[extension] || filters.txt,
  });
  if (result.canceled || !result.filePath) return { canceled: true };
  await fs.writeFile(result.filePath, String(content), 'utf8');
  return { canceled: false, filePath: result.filePath };
});

ipcMain.handle('export-pdf', async (event, { html, title, options }) => {
  const window = BrowserWindow.fromWebContents(event.sender);
  const result = await dialog.showSaveDialog(window, {
    title: 'Esporta in PDF',
    defaultPath: `${title}.pdf`,
    filters: [{ name: 'Documento PDF', extensions: ['pdf'] }],
  });
  if (result.canceled || !result.filePath) return { canceled: true };

  let printWindow;
  try {
    printWindow = new BrowserWindow({
      show: false,
      webPreferences: {
        sandbox: true,
        contextIsolation: true,
        javascript: false,
        nodeIntegration: false,
      },
    });
    printWindow.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
    printWindow.webContents.on('will-navigate', (navigationEvent) => navigationEvent.preventDefault());
    const escapedTitle = String(title).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    const heading = options.pdfIncludeTitle ? `<h1 class="pdf-title">${escapedTitle}</h1>` : '';
    const documentHtml = `<!doctype html><html lang="it"><head><meta charset="utf-8"><title>${escapedTitle}</title><style>${pdfCss(options)}</style></head><body><main>${heading}${html}</main></body></html>`;
    const dataUrl = `data:text/html;charset=utf-8;base64,${Buffer.from(documentHtml).toString('base64')}`;
    await printWindow.loadURL(dataUrl);
    await new Promise((resolve) => setTimeout(resolve, 500));
    const pdf = await printWindow.webContents.printToPDF({
      printBackground: true,
      pageSize: options.pdfPageSize === 'Letter' ? 'Letter' : 'A4',
      landscape: options.pdfLandscape === 'true',
      margins: { marginType: pdfMarginTypes[options.pdfMargins] ?? 0 },
      preferCSSPageSize: true,
      displayHeaderFooter: false,
      tagged: true,
      generateDocumentOutline: true,
    });
    await fs.writeFile(result.filePath, pdf);
    return { canceled: false, filePath: result.filePath };
  } catch (error) {
    return { canceled: false, error: error.message };
  } finally {
    if (printWindow && !printWindow.isDestroyed()) printWindow.destroy();
  }
});

const updatesDisabled = !app.isPackaged || process.env.TESTO_CHIARO_DISABLE_UPDATES === '1';
let downloadedUpdateVersion = null;
let updatePromptOpen = false;

function sendUpdateStatus(status, details = {}) {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('updates:status', { status, ...details });
  }
}

function updateErrorMessage(error) {
  const message = String(error?.message || error || 'Errore sconosciuto');
  if (/ENOTFOUND|ECONN|ETIMEDOUT|ERR_INTERNET|ERR_NETWORK/i.test(message)) {
    return 'Connessione a GitHub non disponibile. Controlla la rete e riprova.';
  }
  if (/404|not found/i.test(message)) {
    return 'Nessuna release compatibile è ancora disponibile su GitHub.';
  }
  return message.slice(0, 240);
}

ipcMain.handle('updates:get-version', () => app.getVersion());

ipcMain.handle('updates:check', async () => {
  if (updatesDisabled) {
    return { ok: false, status: 'development', message: 'Gli aggiornamenti automatici sono disponibili nella versione installata.' };
  }
  try {
    await autoUpdater.checkForUpdates();
    return { ok: true };
  } catch (error) {
    const message = updateErrorMessage(error);
    sendUpdateStatus('error', { message });
    return { ok: false, error: message };
  }
});

ipcMain.handle('updates:install', () => {
  if (!downloadedUpdateVersion) return { ok: false, error: 'Nessun aggiornamento scaricato.' };
  const version = downloadedUpdateVersion;
  setImmediate(() => autoUpdater.quitAndInstall(false, true));
  return { ok: true, version };
});

function setupAutoUpdates() {
  if (updatesDisabled) return;
  autoUpdater.autoDownload = true;
  autoUpdater.autoInstallOnAppQuit = true;
  autoUpdater.allowPrerelease = false;

  autoUpdater.on('checking-for-update', () => sendUpdateStatus('checking'));
  autoUpdater.on('update-available', (info) => {
    downloadedUpdateVersion = null;
    sendUpdateStatus('available', { version: info.version });
  });
  autoUpdater.on('update-not-available', (info) => sendUpdateStatus('up-to-date', { version: info.version }));
  autoUpdater.on('download-progress', (progress) => {
    sendUpdateStatus('downloading', { percent: Math.round(progress.percent || 0) });
  });
  autoUpdater.on('update-downloaded', async (info) => {
    downloadedUpdateVersion = info.version;
    sendUpdateStatus('downloaded', { version: info.version });
    if (updatePromptOpen) return;
    updatePromptOpen = true;
    try {
      const result = await dialog.showMessageBox(mainWindow, {
        type: 'info',
        buttons: ['Aggiorna e riavvia', 'Più tardi'],
        defaultId: 0,
        cancelId: 1,
        title: 'Aggiornamento pronto',
        message: `Testo Chiaro ${info.version} è pronto per essere installato.`,
        detail: 'Il download è completato. Riavvia ora per applicare l’aggiornamento oppure installalo alla prossima chiusura dell’app.',
      });
      if (result.response === 0) autoUpdater.quitAndInstall(false, true);
    } finally {
      updatePromptOpen = false;
    }
  });
  autoUpdater.on('error', (error) => sendUpdateStatus('error', { message: updateErrorMessage(error) }));

  setTimeout(() => {
    autoUpdater.checkForUpdates().catch(() => {});
  }, 4000);
}

app.whenReady().then(() => {
  protocol.handle('app', (request) => {
    const pathname = decodeURIComponent(new URL(request.url).pathname);
    const filePath = path.resolve(distDirectory, `.${pathname}`);
    if (filePath !== distDirectory && !filePath.startsWith(`${distDirectory}${path.sep}`)) return new Response('Non consentito', { status: 403 });
    return net.fetch(pathToFileURL(filePath).toString());
  });
  createWindow();
  setupAutoUpdates();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
