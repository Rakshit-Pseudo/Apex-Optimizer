const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('apexAPI', {
    getMetrics: () => ipcRenderer.invoke('metrics:get'),
    runOptimization: (mode) => ipcRenderer.invoke('optimize:run', mode)
});
