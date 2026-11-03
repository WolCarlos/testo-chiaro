process.noAsar = true;

const path = require('node:path');
const { build, Platform } = require('electron-builder');
const { version } = require('../package.json');

const configuration = {
  win32: { platform: Platform.WINDOWS, target: 'nsis' },
  darwin: { platform: Platform.MAC, target: 'dmg' },
  linux: { platform: Platform.LINUX, target: 'AppImage' },
}[process.platform];

if (!configuration) {
  console.error(`Sistema operativo non supportato: ${process.platform}`);
  process.exit(1);
}

build({
  targets: configuration.platform.createTarget([configuration.target]),
  config: {
    directories: { output: path.join('packages', version) },
  },
})
  .then((artifacts) => {
    console.log('Pacchetti creati:');
    artifacts.forEach((artifact) => console.log(artifact));
  })
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
