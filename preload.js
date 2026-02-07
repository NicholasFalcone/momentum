const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electron', {
    search: (query) => ipcRenderer.invoke('search', query),
    launch: (path) => ipcRenderer.invoke('launch', path),
    openUrl: (url) => ipcRenderer.invoke('open-url', url),
    executeCommand: (command) => ipcRenderer.invoke('execute-command', command),
    copyToClipboard: (text) => ipcRenderer.invoke('copy-to-clipboard', text),
    getSettings: () => ipcRenderer.invoke('get-settings'),
    saveSettings: (settings) => ipcRenderer.invoke('save-settings', settings),
    onSetQuery: (callback) => ipcRenderer.on('set-query', (event, query) => callback(query)),
    onSetView: (callback) => ipcRenderer.on('set-view', (event, view) => callback(view)),
});
