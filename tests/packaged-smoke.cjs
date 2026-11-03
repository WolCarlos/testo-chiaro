const { spawn } = require('node:child_process');
const path = require('node:path');
const assert = require('node:assert/strict');
const { version } = require('../package.json');

const executable = path.join(__dirname, '..', 'packages', version, 'win-unpacked', 'Testo Chiaro.exe');
const onlineUpdateTest = process.env.TESTO_CHIARO_ONLINE_TEST === '1';
const environment = { ...process.env };
delete environment.ELECTRON_RUN_AS_NODE;
delete environment.VITE_DEV_SERVER_URL;
environment.TESTO_CHIARO_DISABLE_UPDATES = onlineUpdateTest ? '0' : '1';
const child = spawn(executable, ['--remote-debugging-port=9223', '--no-first-run'], {
  env: environment,
  stdio: 'ignore',
  windowsHide: false,
});

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function findPage() {
  for (let attempt = 0; attempt < 60; attempt += 1) {
    try {
      const response = await fetch('http://127.0.0.1:9223/json/list');
      const pages = await response.json();
      const page = pages.find((item) => item.type === 'page' && item.url.startsWith('app://'));
      if (page) return page;
    } catch {}
    await delay(250);
  }
  throw new Error('Finestra dell’app pacchettizzata non trovata.');
}

async function run() {
  const page = await findPage();
  const socket = new WebSocket(page.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => {
    socket.addEventListener('open', resolve, { once: true });
    socket.addEventListener('error', reject, { once: true });
  });
  let nextId = 0;
  const pending = new Map();
  socket.addEventListener('message', (event) => {
    const message = JSON.parse(event.data);
    if (!message.id || !pending.has(message.id)) return;
    const { resolve, reject } = pending.get(message.id);
    pending.delete(message.id);
    if (message.error) reject(new Error(message.error.message));
    else resolve(message.result);
  });
  const send = (method, params = {}) => new Promise((resolve, reject) => {
    const id = ++nextId;
    pending.set(id, { resolve, reject });
    socket.send(JSON.stringify({ id, method, params }));
  });
  await send('Runtime.enable');
  const evaluation = await send('Runtime.evaluate', {
    expression: `(async () => {
      const editor = document.querySelector('#richEditor');
      editor.innerHTML = '<p style="background-color:#111;color:white"><strong>Versione installata</strong></p>';
      editor.dispatchEvent(new Event('input', { bubbles: true }));
      await new Promise(resolve => setTimeout(resolve, 100));
      const updateCheck = await window.testoChiaro.checkForUpdates();
      await new Promise(resolve => setTimeout(resolve, 300));
      return {
        title: document.title,
        html: document.querySelector('#preview').innerHTML,
        pdfBridge: typeof window.testoChiaro?.exportPdf === 'function',
        saveBridge: typeof window.testoChiaro?.saveText === 'function',
        updateBridge: typeof window.testoChiaro?.installUpdate === 'function',
        updateStatus: updateCheck.status,
        updateOk: updateCheck.ok,
        updatePanelText: document.querySelector('#updateStatusText').textContent,
        appVersion: await window.testoChiaro.getVersion(),
        readingRole: document.querySelector('#preview').getAttribute('role')
      };
    })()`,
    awaitPromise: true,
    returnByValue: true,
  });
  if (evaluation.exceptionDetails) throw new Error(evaluation.exceptionDetails.text);
  const result = evaluation.result.value;
  assert.equal(result.title, 'Testo Chiaro');
  assert(result.html.includes('<strong>Versione installata</strong>'));
  assert(!result.html.includes('background-color'));
  assert.equal(result.pdfBridge, true);
  assert.equal(result.saveBridge, true);
  assert.equal(result.updateBridge, true);
  if (onlineUpdateTest) {
    assert.equal(result.updateOk, true);
    assert(result.updatePanelText.includes('ultima versione'));
  } else {
    assert.equal(result.updateStatus, 'development');
  }
  assert.equal(result.appVersion, version);
  assert.equal(result.readingRole, 'document');
  console.log(JSON.stringify({ result: 'OK', packagedApp: result }, null, 2));
  socket.close();
}

run()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await delay(250);
    if (process.platform === 'win32') {
      const killer = spawn('taskkill.exe', ['/pid', String(child.pid), '/T', '/F'], { stdio: 'ignore' });
      await new Promise((resolve) => killer.on('close', resolve));
    } else {
      child.kill('SIGTERM');
    }
  });
