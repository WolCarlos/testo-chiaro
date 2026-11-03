const { spawn } = require('node:child_process');
const electron = require('electron');

const environment = { ...process.env };
delete environment.ELECTRON_RUN_AS_NODE;
const args = process.argv.slice(2);
const child = spawn(electron, args.length ? args : ['.'], {
  stdio: 'inherit',
  env: environment,
  windowsHide: false,
});

child.on('error', (error) => {
  console.error('Impossibile avviare Testo Chiaro:', error.message);
  process.exit(1);
});
child.on('close', (code) => process.exit(code ?? 1));
