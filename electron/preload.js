
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  logError: (message) => ipcRenderer.send('log-error', message)
});
