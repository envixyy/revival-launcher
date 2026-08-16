const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  invoke: (channel, args) => ipcRenderer.invoke(channel, args),
  onLog: (callback) => ipcRenderer.on('launch_log', (_, value) => callback(value)),
  onProgress: (callback) => ipcRenderer.on('launch_progress', (_, value) => callback(value)),
  onImportProgress: (callback) => ipcRenderer.on('import_progress', (_, value) => callback(value)),
  removeListeners: () => {
    ipcRenderer.removeAllListeners('launch_log');
    ipcRenderer.removeAllListeners('launch_progress');
    ipcRenderer.removeAllListeners('import_progress');
  },
  minimize: () => ipcRenderer.invoke('window_minimize'),
  maximize: () => ipcRenderer.invoke('window_maximize'),
  close:    () => ipcRenderer.invoke('window_close'),
  onInstanceState: (cb) => ipcRenderer.on('instance_state', (_, v) => cb(v)),
  removeInstanceListeners: () => ipcRenderer.removeAllListeners('instance_state'),
});
