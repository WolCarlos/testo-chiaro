const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('testoChiaro', {
  saveText: (payload) => ipcRenderer.invoke('save-text', payload),
  exportPdf: (payload) => ipcRenderer.invoke('export-pdf', payload),
  getVersion: () => ipcRenderer.invoke('updates:get-version'),
  getReleaseInfo: () => ipcRenderer.invoke('updates:get-release-info'),
  checkForUpdates: () => ipcRenderer.invoke('updates:check'),
  downloadUpdate: () => ipcRenderer.invoke('updates:download'),
  installUpdate: () => ipcRenderer.invoke('updates:install'),
  onUpdateStatus: (callback) => {
    const listener = (_event, payload) => callback(payload);
    ipcRenderer.on('updates:status', listener);
    return () => ipcRenderer.removeListener('updates:status', listener);
  },
});
