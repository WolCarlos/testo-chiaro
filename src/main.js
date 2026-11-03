import './styles.css';
import {
  DEFAULT_OPTIONS, PRESETS, cleanHtml, htmlToPlainText, plainTextToHtml,
  buildPortableHtml, outputWrapperStyle,
} from './cleaner.js';
import { renderMarkdown, getMarkdownTitle } from './markdown.js';

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => [...document.querySelectorAll(selector)];
const richEditor = $('#richEditor');
const markdownEditor = $('#markdownEditor');
const preview = $('#preview');
const statusMessage = $('#statusMessage');
const optionInputs = $$('[data-option]');

let mode = 'rich';
let options = loadOptions();
let history = [];
let historyIndex = -1;
let historyTimer;
let statusTimer;
let currentCleanHtml = '';
let isRestoring = false;

function loadOptions() {
  try {
    const stored = JSON.parse(localStorage.getItem('testo-chiaro-options') || '{}');
    return { ...DEFAULT_OPTIONS, ...stored };
  } catch {
    return { ...DEFAULT_OPTIONS };
  }
}

function saveOptions() {
  localStorage.setItem('testo-chiaro-options', JSON.stringify(options));
}

function syncOptionInputs() {
  optionInputs.forEach((input) => {
    const key = input.dataset.option;
    if (input.type === 'checkbox') input.checked = Boolean(options[key]);
    else input.value = options[key];
  });
}

function announce(message, isError = false) {
  clearTimeout(statusTimer);
  statusMessage.textContent = message;
  statusMessage.classList.toggle('error', isError);
  statusTimer = setTimeout(() => {
    statusMessage.textContent = 'Pronto. Il testo resta sul tuo dispositivo.';
    statusMessage.classList.remove('error');
  }, 5000);
}

function sourceHtml() {
  return mode === 'rich' ? richEditor.innerHTML : renderMarkdown(markdownEditor.value, options);
}

function updatePreview() {
  const hasContent = mode === 'rich'
    ? Boolean(richEditor.textContent.trim() || richEditor.querySelector('img, table'))
    : Boolean(markdownEditor.value.trim());

  if (!hasContent) {
    currentCleanHtml = '';
    preview.innerHTML = '<p class="empty-preview">L’anteprima del testo pulito apparirà qui.</p>';
    preview.removeAttribute('style');
  } else {
    currentCleanHtml = mode === 'rich' ? cleanHtml(richEditor.innerHTML, options) : renderMarkdown(markdownEditor.value, options);
    preview.innerHTML = currentCleanHtml;
    preview.style.cssText = outputWrapperStyle(options);
  }
  const text = hasContent ? htmlToPlainText(currentCleanHtml) : '';
  const words = text.match(/[\p{L}\p{N}]+(?:['’][\p{L}]+)?/gu) || [];
  $('#wordCount').textContent = `${words.length} ${words.length === 1 ? 'parola' : 'parole'} · ${text.length} caratteri`;
}

function snapshot() {
  return { mode, rich: richEditor.innerHTML, markdown: markdownEditor.value };
}

function pushHistory() {
  clearTimeout(historyTimer);
  if (isRestoring) return;
  const state = snapshot();
  const current = history[historyIndex];
  if (current && JSON.stringify(current) === JSON.stringify(state)) return;
  history = history.slice(0, historyIndex + 1);
  history.push(state);
  if (history.length > 100) history.shift();
  historyIndex = history.length - 1;
  updateHistoryButtons();
}

function scheduleHistory() {
  clearTimeout(historyTimer);
  historyTimer = setTimeout(pushHistory, 350);
}

function updateHistoryButtons() {
  $('#undoButton').disabled = historyIndex <= 0;
  $('#redoButton').disabled = historyIndex < 0 || historyIndex >= history.length - 1;
}

function restoreHistory(index) {
  if (index < 0 || index >= history.length) return;
  clearTimeout(historyTimer);
  isRestoring = true;
  historyIndex = index;
  const state = history[index];
  setMode(state.mode, false);
  richEditor.innerHTML = state.rich;
  markdownEditor.value = state.markdown;
  updatePreview();
  updateHistoryButtons();
  isRestoring = false;
  announce(index < history.length - 1 ? 'Modifica annullata.' : 'Modifica ripetuta.');
}

function setMode(nextMode, focus = true) {
  mode = nextMode;
  const isRich = mode === 'rich';
  richEditor.hidden = !isRich;
  markdownEditor.hidden = isRich;
  $('#richTab').setAttribute('aria-selected', String(isRich));
  $('#markdownTab').setAttribute('aria-selected', String(!isRich));
  $('#richTab').tabIndex = isRich ? 0 : -1;
  $('#markdownTab').tabIndex = isRich ? -1 : 0;
  $('#editorHint').textContent = isRich
    ? 'I contenuti vengono elaborati solo localmente.'
    : 'Markdown sicuro: il codice HTML incorporato viene mostrato come testo.';
  $('#exportFormat').querySelector('option[value="md"]').disabled = !isRich;
  if (isRich && $('#exportFormat').value === 'md') $('#exportFormat').value = 'pdf';
  updatePreview();
  if (focus) (isRich ? richEditor : markdownEditor).focus();
}

function insertAtCursor(html, plainText = '') {
  richEditor.focus();
  const selection = window.getSelection();
  if (!selection.rangeCount || !richEditor.contains(selection.anchorNode)) {
    richEditor.innerHTML += html;
    return;
  }
  const range = selection.getRangeAt(0);
  range.deleteContents();
  const template = document.createElement('template');
  template.innerHTML = html || plainTextToHtml(plainText);
  const fragment = template.content;
  const lastNode = fragment.lastChild;
  range.insertNode(fragment);
  if (lastNode) {
    range.setStartAfter(lastNode);
    range.collapse(true);
    selection.removeAllRanges();
    selection.addRange(range);
  }
}

async function pasteFromClipboard() {
  try {
    if (navigator.clipboard.read) {
      const items = await navigator.clipboard.read();
      for (const item of items) {
        if (mode === 'rich' && item.types.includes('text/html')) {
          const html = await (await item.getType('text/html')).text();
          setMode('rich', false);
          richEditor.innerHTML = cleanHtml(html, PRESETS.structure);
          pushHistory();
          updatePreview();
          announce('Testo formattato incollato. Scegli i formati da rimuovere.');
          return;
        }
        if (item.types.includes('text/plain')) {
          const text = await (await item.getType('text/plain')).text();
          if (mode === 'rich') richEditor.innerHTML = plainTextToHtml(text);
          else markdownEditor.value = text;
          pushHistory();
          updatePreview();
          announce('Testo incollato dagli appunti.');
          return;
        }
      }
    }
    const text = await navigator.clipboard.readText();
    if (mode === 'rich') richEditor.innerHTML = plainTextToHtml(text);
    else markdownEditor.value = text;
    pushHistory();
    updatePreview();
    announce('Testo incollato dagli appunti.');
  } catch (error) {
    (mode === 'rich' ? richEditor : markdownEditor).focus();
    announce('Il browser non ha consentito l’accesso diretto. Premi Ctrl+V nell’area di modifica.', true);
  }
}

async function copyCleanText() {
  if (!currentCleanHtml) {
    announce('Non c’è ancora testo da copiare.', true);
    return;
  }
  const plain = htmlToPlainText(currentCleanHtml);
  const portable = buildPortableHtml(currentCleanHtml, options);
  try {
    if (window.ClipboardItem && navigator.clipboard.write) {
      const item = new ClipboardItem({
        'text/html': new Blob([portable], { type: 'text/html' }),
        'text/plain': new Blob([plain], { type: 'text/plain' }),
      });
      await navigator.clipboard.write([item]);
    } else {
      await navigator.clipboard.writeText(plain);
    }
    announce('Testo pulito copiato: pronto per Thunderbird, Word o altri programmi.');
  } catch {
    try {
      await navigator.clipboard.writeText(plain);
      announce('Copiato come testo semplice.');
    } catch {
      announce('Copia non riuscita. Seleziona l’anteprima e premi Ctrl+C.', true);
    }
  }
}

function safeFileName() {
  const markdownTitle = mode === 'markdown' ? getMarkdownTitle(markdownEditor.value) : '';
  const raw = options.documentTitle.trim() || markdownTitle || 'Documento pulito';
  return raw.replace(/[<>:"/\\|?*\x00-\x1F]/g, '-').slice(0, 100) || 'Documento pulito';
}

async function saveTextFile(content, extension) {
  const fileName = `${safeFileName()}.${extension}`;
  if (window.testoChiaro?.saveText) {
    const result = await window.testoChiaro.saveText({ content, fileName, extension });
    if (!result.canceled) announce(`File ${extension.toUpperCase()} salvato correttamente.`);
    return;
  }
  const mimeTypes = { html: 'text/html;charset=utf-8', md: 'text/markdown;charset=utf-8', txt: 'text/plain;charset=utf-8' };
  const blob = new Blob([content], { type: mimeTypes[extension] });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  announce(`File ${extension.toUpperCase()} esportato.`);
}

function standaloneHtml() {
  const title = safeFileName();
  const escapedTitle = title.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  return `<!doctype html><html lang="it"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapedTitle}</title><style>body{margin:0;background:#f3f4f6}main{box-sizing:border-box;max-width:850px;margin:32px auto;padding:48px;${outputWrapperStyle(options)}}img{max-width:100%;height:auto}table{border-collapse:collapse;width:100%}th,td{border:1px solid #cbd5e1;padding:8px;text-align:left}pre{white-space:pre-wrap;background:#f1f5f9;padding:16px}blockquote{border-left:4px solid #94a3b8;margin-left:0;padding-left:16px}@media(max-width:600px){main{margin:0;padding:24px}}</style></head><body><main>${currentCleanHtml}</main></body></html>`;
}

async function exportPdf() {
  if (!currentCleanHtml) {
    announce('Non c’è ancora testo da esportare.', true);
    return;
  }
  if (window.testoChiaro?.exportPdf) {
    announce('Creazione del PDF in corso…');
    const result = await window.testoChiaro.exportPdf({
      html: currentCleanHtml,
      title: safeFileName(),
      options,
    });
    if (result.error) announce(`Errore durante l’esportazione: ${result.error}`, true);
    else if (!result.canceled) announce('PDF salvato correttamente con testo selezionabile.');
  } else {
    const printWindow = window.open('', '_blank', 'width=900,height=700');
    if (!printWindow) {
      announce('Consenti i popup per stampare o salvare in PDF.', true);
      return;
    }
    printWindow.document.write(standaloneHtml());
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => printWindow.print(), 300);
  }
}

async function exportDocument() {
  const format = $('#exportFormat').value;
  if (!currentCleanHtml) {
    announce('Non c’è ancora testo da esportare.', true);
    return;
  }
  if (format === 'pdf') return exportPdf();
  if (format === 'html') return saveTextFile(standaloneHtml(), 'html');
  if (format === 'txt') return saveTextFile(htmlToPlainText(currentCleanHtml), 'txt');
  if (format === 'md' && mode === 'markdown') return saveTextFile(markdownEditor.value, 'md');
}

async function importFile(file) {
  if (!file) return;
  if (file.size > 10 * 1024 * 1024) {
    announce('Il file supera il limite di 10 MB.', true);
    return;
  }
  const text = await file.text();
  const isHtml = /\.html?$/i.test(file.name) || file.type === 'text/html';
  const isMarkdown = /\.(md|markdown)$/i.test(file.name) || file.type === 'text/markdown';
  if (isHtml) {
    setMode('rich', false);
    richEditor.innerHTML = cleanHtml(text, PRESETS.structure);
  } else if (isMarkdown) {
    setMode('markdown', false);
    markdownEditor.value = text;
    const title = getMarkdownTitle(text);
    if (title && !options.documentTitle.trim()) options.documentTitle = title;
  } else {
    setMode('rich', false);
    richEditor.innerHTML = plainTextToHtml(text);
  }
  pushHistory();
  updatePreview();
  announce(`${file.name} importato correttamente.`);
}

optionInputs.forEach((input) => {
  input.addEventListener('input', () => {
    const key = input.dataset.option;
    options[key] = input.type === 'checkbox' ? input.checked : input.value;
    if (input.type === 'number') options[key] = Math.min(48, Math.max(8, Number(input.value) || 11));
    $('#preset').value = 'custom';
    saveOptions();
    updatePreview();
  });
});

$('#preset').addEventListener('change', (event) => {
  const preset = event.target.value;
  if (preset === 'custom') return;
  const pdfAndTitle = {
    pdfPageSize: options.pdfPageSize,
    pdfLandscape: options.pdfLandscape,
    pdfMargins: options.pdfMargins,
    pdfIncludeTitle: options.pdfIncludeTitle,
    documentTitle: options.documentTitle,
  };
  options = { ...PRESETS[preset], ...pdfAndTitle };
  syncOptionInputs();
  saveOptions();
  updatePreview();
  announce(preset === 'plain' ? 'Configurazione “Solo testo semplice” applicata.' : 'Configurazione rapida applicata.');
});

$('#resetOptions').addEventListener('click', () => {
  options = { ...DEFAULT_OPTIONS };
  $('#preset').value = 'recommended';
  syncOptionInputs();
  saveOptions();
  updatePreview();
  announce('Impostazioni ripristinate.');
});

$$('[data-mode]').forEach((tab) => tab.addEventListener('click', () => setMode(tab.dataset.mode)));
$('.segmented').addEventListener('keydown', (event) => {
  if (!['ArrowLeft', 'ArrowRight'].includes(event.key)) return;
  event.preventDefault();
  setMode(mode === 'rich' ? 'markdown' : 'rich');
  $(`[data-mode="${mode}"]`).focus();
});

richEditor.addEventListener('input', () => { updatePreview(); scheduleHistory(); });
markdownEditor.addEventListener('input', () => { updatePreview(); scheduleHistory(); });
richEditor.addEventListener('paste', (event) => {
  event.preventDefault();
  const html = event.clipboardData.getData('text/html');
  const text = event.clipboardData.getData('text/plain');
  if (event.shiftKey || !html) insertAtCursor(plainTextToHtml(text));
  else insertAtCursor(cleanHtml(html, PRESETS.structure));
  updatePreview();
  pushHistory();
});

$('#pasteButton').addEventListener('click', pasteFromClipboard);
$('#copyButton').addEventListener('click', copyCleanText);
$('#previewCopyButton').addEventListener('click', copyCleanText);
$('#exportButton').addEventListener('click', exportDocument);
$('#importButton').addEventListener('click', () => $('#fileInput').click());
$('#fileInput').addEventListener('change', (event) => {
  importFile(event.target.files[0]);
  event.target.value = '';
});
$('#undoButton').addEventListener('click', () => restoreHistory(historyIndex - 1));
$('#redoButton').addEventListener('click', () => restoreHistory(historyIndex + 1));
$('#clearButton').addEventListener('click', () => {
  if (mode === 'rich') richEditor.innerHTML = '';
  else markdownEditor.value = '';
  pushHistory();
  updatePreview();
  (mode === 'rich' ? richEditor : markdownEditor).focus();
  announce('Area di modifica svuotata.');
});

$('#focusPreviewButton').addEventListener('click', () => {
  preview.focus({ preventScroll: false });
  preview.scrollIntoView({ behavior: 'smooth', block: 'center' });
  announce(currentCleanHtml ? 'Area di lettura attiva. Ora premi Ctrl+Alt+Invio.' : 'L’anteprima è vuota: incolla prima un testo.', !currentCleanHtml);
});

preview.addEventListener('click', (event) => {
  const link = event.target.closest('a');
  if (link) event.preventDefault();
});

const helpDialog = $('#helpDialog');
$('#helpButton').addEventListener('click', () => helpDialog.showModal());
$('#closeHelp').addEventListener('click', () => helpDialog.close());
helpDialog.addEventListener('click', (event) => {
  if (event.target === helpDialog) helpDialog.close();
});

function setTheme(theme) {
  document.documentElement.dataset.theme = theme;
  localStorage.setItem('testo-chiaro-theme', theme);
  $('#themeIcon').textContent = theme === 'dark' ? '☀' : '☾';
  $('#themeButton').setAttribute('aria-label', theme === 'dark' ? 'Attiva tema chiaro' : 'Attiva tema scuro');
}

function setPreviewTheme(theme) {
  preview.dataset.previewTheme = theme;
  localStorage.setItem('testo-chiaro-preview-theme', theme);
  const action = theme === 'dark' ? 'Attiva anteprima chiara' : 'Attiva anteprima scura';
  $('#previewThemeIcon').textContent = theme === 'dark' ? '☀' : '☾';
  $('#previewThemeButton').setAttribute('aria-label', action);
  $('#previewThemeButton').title = action;
}

const preferredDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
setTheme(localStorage.getItem('testo-chiaro-theme') || (preferredDark ? 'dark' : 'light'));
setPreviewTheme(localStorage.getItem('testo-chiaro-preview-theme') || 'light');
$('#themeButton').addEventListener('click', () => setTheme(document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark'));
$('#previewThemeButton').addEventListener('click', () => setPreviewTheme(preview.dataset.previewTheme === 'dark' ? 'light' : 'dark'));

const updateDialog = $('#updateDialog');
let lastUpdateStatus = 'idle';

function renderUpdateStatus(payload = {}) {
  const status = payload.status || 'idle';
  lastUpdateStatus = status;
  const messages = {
    idle: 'Controlla se è disponibile una nuova versione.',
    checking: 'Controllo delle GitHub Releases in corso…',
    available: payload.version ? `Versione ${payload.version} disponibile. Download in corso…` : 'Nuova versione disponibile. Download in corso…',
    downloading: `Download dell’aggiornamento: ${payload.percent || 0}%.`,
    downloaded: `Versione ${payload.version || ''} pronta. Riavvia per completare l’aggiornamento.`,
    'up-to-date': 'Hai già l’ultima versione disponibile.',
    development: 'Gli aggiornamenti automatici sono attivi nella versione desktop installata.',
    error: payload.message || 'Non è stato possibile controllare gli aggiornamenti.',
  };
  const icons = { checking: '↻', available: '↧', downloading: '↧', downloaded: '✓', 'up-to-date': '✓', error: '!', development: 'i', idle: '↻' };
  $('#updateStatusText').textContent = messages[status] || messages.idle;
  $('#updateStatusIcon').textContent = icons[status] || '↻';
  $('#checkUpdatesButton').disabled = ['checking', 'available', 'downloading'].includes(status);
  $('#installUpdateButton').hidden = status !== 'downloaded';
  const progress = $('#updateProgress');
  progress.hidden = !['available', 'downloading'].includes(status);
  if (status === 'available') progress.removeAttribute('value');
  if (status === 'downloading') progress.value = payload.percent || 0;

  const busy = ['checking', 'available', 'downloading'].includes(status);
  $('#updateButton').classList.toggle('has-update', busy || status === 'downloaded');
  $('#updateButtonLabel').textContent = status === 'downloaded' ? 'Aggiorna e riavvia'
    : status === 'downloading' ? `Aggiornamento ${payload.percent || 0}%`
      : status === 'available' ? 'Download…'
        : status === 'checking' ? 'Controllo…' : 'Aggiornamenti';
  if (status === 'downloaded') announce(`Testo Chiaro ${payload.version || ''} è pronto per l’installazione.`);
}

async function checkForUpdates() {
  if (!window.testoChiaro?.checkForUpdates) {
    renderUpdateStatus({ status: 'development' });
    return;
  }
  renderUpdateStatus({ status: 'checking' });
  const result = await window.testoChiaro.checkForUpdates();
  if (result.status === 'development') renderUpdateStatus({ status: 'development' });
  else if (!result.ok && result.error) renderUpdateStatus({ status: 'error', message: result.error });
}

$('#updateButton').addEventListener('click', () => {
  updateDialog.showModal();
  if (!['checking', 'available', 'downloading', 'downloaded'].includes(lastUpdateStatus)) checkForUpdates();
});
$('#checkUpdatesButton').addEventListener('click', checkForUpdates);
$('#installUpdateButton').addEventListener('click', async () => {
  if (!window.testoChiaro?.installUpdate) return;
  $('#installUpdateButton').disabled = true;
  const result = await window.testoChiaro.installUpdate();
  if (!result.ok) {
    $('#installUpdateButton').disabled = false;
    renderUpdateStatus({ status: 'error', message: result.error });
  }
});
$('#closeUpdateDialog').addEventListener('click', () => updateDialog.close());
updateDialog.addEventListener('click', (event) => {
  if (event.target === updateDialog) updateDialog.close();
});
if (window.testoChiaro?.onUpdateStatus) window.testoChiaro.onUpdateStatus(renderUpdateStatus);
if (window.testoChiaro?.getVersion) {
  window.testoChiaro.getVersion().then((version) => {
    $('#currentVersion').textContent = `Versione installata: ${version}`;
  });
}

document.addEventListener('keydown', (event) => {
  const modifier = event.ctrlKey || event.metaKey;
  if (!modifier) return;
  if (event.key.toLowerCase() === 's') {
    event.preventDefault();
    exportDocument();
  } else if (event.key.toLowerCase() === 'z' && !event.shiftKey && event.target !== richEditor && event.target !== markdownEditor) {
    event.preventDefault();
    restoreHistory(historyIndex - 1);
  } else if ((event.key.toLowerCase() === 'y' || (event.key.toLowerCase() === 'z' && event.shiftKey)) && event.target !== richEditor && event.target !== markdownEditor) {
    event.preventDefault();
    restoreHistory(historyIndex + 1);
  }
});

for (const editor of [richEditor, markdownEditor]) {
  editor.addEventListener('dragover', (event) => { event.preventDefault(); editor.classList.add('drag-over'); });
  editor.addEventListener('dragleave', () => editor.classList.remove('drag-over'));
  editor.addEventListener('drop', (event) => {
    event.preventDefault();
    editor.classList.remove('drag-over');
    const file = event.dataTransfer.files[0];
    if (file) importFile(file);
  });
}

syncOptionInputs();
pushHistory();
updatePreview();
