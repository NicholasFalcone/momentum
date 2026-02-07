const { app, BrowserWindow, globalShortcut, ipcMain, shell, Tray, Menu, nativeImage } = require('electron');
const path = require('path');
const searchEngine = require('./search_engine');
const clipboardService = require('./clipboard_service');
const settingsManager = require('./settings_manager');
const { exec } = require('child_process');

let mainWindow;
let tray;
let isQuitting = false;

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 650,
        height: 450,
        frame: false,
        transparent: true,
        alwaysOnTop: true,
        skipTaskbar: true,
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            preload: path.join(__dirname, 'preload.js'),
        },
    });

    const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;
    if (isDev) {
        mainWindow.loadURL('http://localhost:5173');
    } else {
        mainWindow.loadFile(path.join(__dirname, 'dist/index.html'));
    }

    mainWindow.hide();

    mainWindow.on('blur', () => {
        if (mainWindow.isVisible()) {
            mainWindow.hide();
        }
    });

    mainWindow.on('close', (event) => {
        if (!isQuitting) {
            event.preventDefault();
            mainWindow.hide();
        }
        return false;
    });
}

function createTray() {
    // Create a simple red dot as a placeholder icon if no file exists
    // In a real app, you'd use path.join(__dirname, 'assets/icon.png')
    const icon = nativeImage.createFromDataURL('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAABmJLR0QA/wD/AP+gvaeTAAAACXBIWXMAAAsTAAALEwEAmpwYAAAAB3RJTUUH5gMREBEy5m8xGAAAADJJREFUOMtjYKAiYGFgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYIADAFv8AbXmH5dDAAAAAElFTkSuQmCC');
    tray = new Tray(icon);

    const contextMenu = Menu.buildFromTemplate([
        {
            label: 'Show Momentum',
            click: () => {
                mainWindow.center();
                mainWindow.show();
                mainWindow.focus();
            }
        },
        {
            label: 'Settings',
            click: () => {
                mainWindow.center();
                mainWindow.show();
                mainWindow.focus();
                mainWindow.webContents.send('set-view', 'settings');
            }
        },
        { type: 'separator' },
        {
            label: 'Quit',
            click: () => {
                isQuitting = true;
                app.quit();
            }
        }
    ]);

    tray.setToolTip('Momentum');
    tray.setContextMenu(contextMenu);

    tray.on('click', () => {
        if (mainWindow.isVisible()) {
            mainWindow.hide();
        } else {
            mainWindow.center();
            mainWindow.show();
            mainWindow.focus();
        }
    });
}

app.whenReady().then(() => {
    createWindow();
    createTray();
    searchEngine.indexApps();
    clipboardService.startMonitoring();

    const settings = settingsManager.getSettings();

    // Alt+Space for Search (from settings)
    globalShortcut.register(settings.hotkey || 'Alt+Space', () => {
        if (mainWindow.isVisible()) {
            mainWindow.hide();
        } else {
            mainWindow.center();
            mainWindow.show();
            mainWindow.focus();
            mainWindow.webContents.send('set-view', 'search');
        }
    });

    // Win+Alt+Space for direct Clipboard
    globalShortcut.register('CommandOrControl+Alt+Space', () => {
        mainWindow.center();
        mainWindow.show();
        mainWindow.focus();
        mainWindow.webContents.send('set-view', 'search');
        mainWindow.webContents.send('set-query', 'clipboard');
    });
});

app.on('window-all-closed', () => {
    // Prevent app from quitting on window close
    // app.quit() is handled via isQuitting in tray
});

app.on('before-quit', () => {
    clipboardService.stopMonitoring();
    isQuitting = true;
});

ipcMain.handle('search', async (event, query) => {
    const results = await searchEngine.search(query);

    // Enrich app results with icons
    const enrichedResults = await Promise.all(results.map(async (result) => {
        if (result.type === 'app' && result.path) {
            try {
                let iconPath = result.path;
                if (result.path && typeof result.path === 'string' && result.path.toLowerCase().endsWith('.lnk')) {
                    try {
                        const shortcut = shell.readShortcutLink(result.path);
                        if (shortcut && shortcut.target) {
                            iconPath = shortcut.target;
                        }
                    } catch (e) {
                        console.error(`Failed to read shortcut ${result.path}:`, e);
                    }
                }
                const icon = await app.getFileIcon(iconPath, { size: 'normal' });
                return { ...result, icon: icon.toDataURL() };
            } catch (err) {
                console.error(`Failed to get icon for ${result.path}:`, err);
            }
        }
        return result;
    }));

    return enrichedResults;
});

ipcMain.handle('launch', async (event, filePath) => {
    return shell.openPath(filePath);
});

ipcMain.handle('open-url', async (event, url) => {
    return shell.openExternal(url);
});

ipcMain.handle('execute-command', async (event, command) => {
    // For Windows, using shell: true helps with built-in commands and paths with spaces
    exec(command, { shell: true }, (error, stdout, stderr) => {
        if (error) {
            console.error(`exec error: ${error}`);
            return;
        }
        if (stderr) console.error(`exec stderr: ${stderr}`);
    });
});

ipcMain.handle('copy-to-clipboard', async (event, text) => {
    const { clipboard } = require('electron');
    clipboard.writeText(text);
});

ipcMain.handle('get-settings', async () => {
    return settingsManager.getSettings();
});

ipcMain.handle('save-settings', async (event, newSettings) => {
    return settingsManager.save(newSettings);
});
