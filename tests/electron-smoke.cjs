const { app, BrowserWindow, protocol, net } = require('electron');
const path = require('node:path');
const fs = require('node:fs/promises');
const os = require('node:os');
const assert = require('node:assert/strict');
const { pathToFileURL } = require('node:url');

protocol.registerSchemesAsPrivileged([
  { scheme: 'app', privileges: { standard: true, secure: true, supportFetchAPI: true } },
]);

const artifacts = path.join(__dirname, 'artifacts');
const distDirectory = path.join(__dirname, '..', 'dist');

async function run() {
  await fs.mkdir(artifacts, { recursive: true });
  await app.whenReady();
  protocol.handle('app', (request) => {
    const pathname = decodeURIComponent(new URL(request.url).pathname);
    const filePath = path.resolve(distDirectory, `.${pathname}`);
    if (filePath !== distDirectory && !filePath.startsWith(`${distDirectory}${path.sep}`)) return new Response('Non consentito', { status: 403 });
    return net.fetch(pathToFileURL(filePath).toString());
  });
  const window = new BrowserWindow({
    width: 1440,
    height: 920,
    show: false,
    webPreferences: { contextIsolation: true, nodeIntegration: false, sandbox: true },
  });
  await window.loadURL('app://localhost/index.html');

  const richResult = await window.webContents.executeJavaScript(`(async () => {
    document.querySelector('#resetOptions').click();
    const editor = document.querySelector('#richEditor');
    editor.innerHTML = '<div style="background-color: rgb(17, 24, 39); color: white; font-family: Comic Sans MS"><h1>Titolo di prova</h1><p><strong>Testo importante</strong> su sfondo scuro.</p><ul><li>Primo punto</li><li>Secondo punto</li></ul></div>';
    editor.dispatchEvent(new Event('input', { bubbles: true }));
    await new Promise(resolve => setTimeout(resolve, 80));
    const preview = document.querySelector('#preview');
    return {
      html: preview.innerHTML,
      text: preview.innerText,
      role: preview.getAttribute('role'),
      tabIndex: preview.tabIndex,
      wordCount: document.querySelector('#wordCount').textContent
    };
  })()`);
  console.log('Risultato testo formattato:', JSON.stringify(richResult));
  assert(richResult.html.includes('<strong>Testo importante</strong>'));
  assert(!richResult.html.includes('background-color'));
  assert(!richResult.html.includes('color: white'));
  assert(richResult.html.includes('<ul>'));
  assert.equal(richResult.role, 'document');
  assert.equal(richResult.tabIndex, 0);
  assert(richResult.text.includes('Titolo di prova'));

  const markdownResult = await window.webContents.executeJavaScript(`(async () => {
    document.querySelector('#markdownTab').click();
    const editor = document.querySelector('#markdownEditor');
    editor.value = '# Relazione trimestrale\\n\\nQuesto è **testo convertito** da Markdown.\\n\\n| Voce | Valore |\\n| --- | ---: |\\n| Ricavi | 125.000 € |\\n\\n- Prima attività\\n- Seconda attività\\n\\n> Una citazione leggibile.\\n\\n<script>alert("non sicuro")</script>';
    editor.dispatchEvent(new Event('input', { bubbles: true }));
    await new Promise(resolve => setTimeout(resolve, 80));
    const preview = document.querySelector('#preview');
    return { html: preview.innerHTML, text: preview.innerText, title: document.title };
  })()`);
  assert(markdownResult.html.includes('<h1>Relazione trimestrale</h1>'));
  assert(markdownResult.html.includes('<strong>testo convertito</strong>'));
  assert(markdownResult.html.includes('<table>'));
  assert(markdownResult.html.includes('<blockquote>'));
  assert(!markdownResult.html.includes('<script>'));
  assert(markdownResult.text.includes('125.000 €'));

  const previewThemeResult = await window.webContents.executeJavaScript(`(() => {
    const preview = document.querySelector('#preview');
    if (preview.dataset.previewTheme === 'dark') document.querySelector('#previewThemeButton').click();
    document.querySelector('#previewThemeButton').click();
    return {
      theme: preview.dataset.previewTheme,
      background: getComputedStyle(preview).backgroundColor,
      saved: localStorage.getItem('testo-chiaro-preview-theme'),
      copyButton: Boolean(document.querySelector('#previewCopyButton'))
    };
  })()`);
  assert.equal(previewThemeResult.theme, 'dark');
  assert.equal(previewThemeResult.background, 'rgb(17, 24, 39)');
  assert.equal(previewThemeResult.saved, 'dark');
  assert.equal(previewThemeResult.copyButton, true);

  await window.webContents.executeJavaScript(`document.querySelector('#focusPreviewButton').click()`);
  const focused = await window.webContents.executeJavaScript(`document.activeElement.id`);
  assert.equal(focused, 'preview');
  const screenshot = await window.webContents.capturePage();
  await fs.writeFile(path.join(artifacts, 'testo-chiaro-windows.png'), screenshot.toPNG());

  const updatePanelResult = await window.webContents.executeJavaScript(`(async () => {
    document.querySelector('#updateButton').click();
    await new Promise(resolve => setTimeout(resolve, 100));
    const result = {
      open: document.querySelector('#updateDialog').open,
      text: document.querySelector('#updateStatusText').textContent,
      version: document.querySelector('#currentVersion').textContent
    };
    document.querySelector('#closeUpdateDialog').click();
    result.closed = !document.querySelector('#updateDialog').open;
    return result;
  })()`);
  assert.equal(updatePanelResult.open, true);
  assert.equal(updatePanelResult.closed, true);
  assert(updatePanelResult.text.includes('versione desktop installata'));
  assert(updatePanelResult.version.includes('1.4.0'));

  const legalResult = await window.webContents.executeJavaScript(`(() => {
    document.querySelector('#helpButton').click();
    document.querySelector('#openLegalButton').click();
    const result = {
      open: document.querySelector('#legalDialog').open,
      text: document.querySelector('#legalDialog').textContent
    };
    document.querySelector('#legalConfirm').click();
    document.querySelector('#closeHelp').click();
    return result;
  })()`);
  assert.equal(legalResult.open, true);
  assert(legalResult.text.includes('GDPR'));
  assert(legalResult.text.includes('WCAG 2.1 AA'));

  const printWindow = new BrowserWindow({ show: false, webPreferences: { sandbox: true, javascript: false } });
  const printable = `<!doctype html><html lang="it"><head><meta charset="utf-8"><style>@page{size:A4;margin:22mm}body{font-family:Arial,sans-serif;font-size:11pt;line-height:1.5;color:#111827}table{border-collapse:collapse;width:100%}td,th{border:1px solid #bbb;padding:8px}</style></head><body><main>${markdownResult.html}</main></body></html>`;
  await printWindow.loadURL(`data:text/html;charset=utf-8;base64,${Buffer.from(printable).toString('base64')}`);
  const pdf = await printWindow.webContents.printToPDF({ printBackground: true, preferCSSPageSize: true, tagged: true, generateDocumentOutline: true });
  await fs.writeFile(path.join(artifacts, 'anteprima-test.pdf'), pdf);
  assert(pdf.length > 5000);
  assert.equal(pdf.subarray(0, 4).toString(), '%PDF');
  printWindow.destroy();

  console.log(JSON.stringify({
    result: 'OK',
    platform: process.platform,
    osRelease: os.release(),
    richText: richResult.text,
    markdownText: markdownResult.text,
    wordCount: richResult.wordCount,
    pdfBytes: pdf.length,
    screenshot: path.join(artifacts, 'testo-chiaro-windows.png'),
    pdf: path.join(artifacts, 'anteprima-test.pdf'),
  }, null, 2));
  window.destroy();
  app.exit(0);
}

run().catch((error) => {
  console.error(error);
  app.exit(1);
});
