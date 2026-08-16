const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('logAPI', {
  onLine:     (cb) => ipcRenderer.on('log_line',        (_, v) => cb(v)),
  onClear:    (cb) => ipcRenderer.on('log_clear',       ()     => cb()),
  onProgress: (cb) => ipcRenderer.on('launch_progress', (_, v) => cb(v)),
});
