const { app, BrowserWindow, globalShortcut, ipcMain, shell, Tray, Menu, nativeImage, Notification } = require('electron');
const path = require('path');
const searchEngine = require('./search_engine');
const clipboardService = require('./clipboard_service');
const settingsManager = require('./settings_manager');
const { exec, spawn } = require('child_process');

let mainWindow;
let tray;
let isQuitting = false;
let isRestartingFromSecondLaunch = false;

const SEARCH_WINDOW_BOUNDS = {
    width: 650,
    height: 450,
};

const SETTINGS_WINDOW_BOUNDS = {
    width: 760,
    height: 720,
};

const hasSingleInstanceLock = app.requestSingleInstanceLock();

if (!hasSingleInstanceLock) {
    app.quit();
}

app.setAppUserModelId('com.onemoment.launcher');

function supportsLaunchAtStartup() {
    return app.isPackaged && process.platform === 'win32';
}

function getLaunchAtStartupSetting() {
    if (!supportsLaunchAtStartup()) {
        return false;
    }

    try {
        return app.getLoginItemSettings().openAtLogin;
    } catch (error) {
        console.error('Failed to read launch at startup setting:', error);
        return false;
    }
}

function applyLaunchAtStartupSetting(enabled) {
    if (!supportsLaunchAtStartup()) {
        return false;
    }

    try {
        app.setLoginItemSettings({
            openAtLogin: enabled,
            path: app.getPath('exe'),
        });
        return app.getLoginItemSettings().openAtLogin;
    } catch (error) {
        console.error('Failed to update launch at startup setting:', error);
        return false;
    }
}

function showStartupNotification() {
    if (!Notification.isSupported()) {
        return;
    }

    const notification = new Notification({
        title: 'One Moment attivo',
        body: 'One Moment e in esecuzione in background. Aprilo dalla tray o con la hotkey.',
        silent: true,
        icon: path.join(__dirname, 'assets/icon.png'),
    });

    notification.show();
}

function launchCommandInTerminal(command) {
    if (!command || !command.trim()) {
        return false;
    }

    const terminalCommand = command.trim();

    try {
        const windowsTerminal = spawn(
            'wt.exe',
            ['new-tab', 'powershell.exe', '-NoExit', '-Command', terminalCommand],
            {
                detached: true,
                stdio: 'ignore',
                windowsHide: false,
            }
        );

        windowsTerminal.on('error', () => {
            spawn('powershell.exe', ['-NoExit', '-Command', terminalCommand], {
                detached: true,
                stdio: 'ignore',
                windowsHide: false,
            }).unref();
        });

        windowsTerminal.unref();
        return true;
    } catch (error) {
        console.error('Failed to launch command in Windows Terminal:', error);

        try {
            const powershell = spawn('powershell.exe', ['-NoExit', '-Command', terminalCommand], {
                detached: true,
                stdio: 'ignore',
                windowsHide: false,
            });
            powershell.unref();
            return true;
        } catch (fallbackError) {
            console.error('Failed to launch command in PowerShell:', fallbackError);
            return false;
        }
    }
}

function applyWindowBounds(view) {
    if (!mainWindow || mainWindow.isDestroyed()) {
        return;
    }

    const bounds = view === 'settings' ? SETTINGS_WINDOW_BOUNDS : SEARCH_WINDOW_BOUNDS;
    mainWindow.setSize(bounds.width, bounds.height, true);
    mainWindow.center();
}

function createWindow() {
    mainWindow = new BrowserWindow({
        width: SEARCH_WINDOW_BOUNDS.width,
        height: SEARCH_WINDOW_BOUNDS.height,
        minWidth: SEARCH_WINDOW_BOUNDS.width,
        minHeight: SEARCH_WINDOW_BOUNDS.height,
        frame: false,
        transparent: true,
        alwaysOnTop: true,
        skipTaskbar: true,
        icon: path.join(__dirname, 'assets/icon.png'),
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
    const icon = nativeImage.createFromPath(path.join(__dirname, 'assets/icon.png'));
    tray = new Tray(icon);

    const contextMenu = Menu.buildFromTemplate([
        {
            label: 'Show One Moment',
            click: () => {
                applyWindowBounds('search');
                mainWindow.center();
                mainWindow.show();
                mainWindow.focus();
            }
        },
        {
            label: 'Settings',
            click: () => {
                applyWindowBounds('settings');
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

    tray.setToolTip('One Moment');
    tray.setContextMenu(contextMenu);

    tray.on('click', () => {
        if (mainWindow.isVisible()) {
            mainWindow.hide();
        } else {
            applyWindowBounds('search');
            mainWindow.center();
            mainWindow.show();
            mainWindow.focus();
        }
    });
}

app.on('second-instance', () => {
    if (isRestartingFromSecondLaunch) {
        return;
    }

    isRestartingFromSecondLaunch = true;
    isQuitting = true;
    app.relaunch();
    app.quit();
});

if (hasSingleInstanceLock) {
    app.whenReady().then(() => {
        createWindow();
        createTray();
        searchEngine.indexApps();
        clipboardService.startMonitoring();

        const settings = settingsManager.getSettings();
        if (supportsLaunchAtStartup()) {
            const launchAtStartup = applyLaunchAtStartupSetting(Boolean(settings.launchAtStartup));

            if (settings.launchAtStartup !== launchAtStartup) {
                settingsManager.save({ launchAtStartup });
            }
        }

        showStartupNotification();

        // Alt+Space for Search (from settings)
        globalShortcut.register(settings.hotkey || 'Alt+Space', () => {
            if (mainWindow.isVisible()) {
                mainWindow.hide();
            } else {
                applyWindowBounds('search');
                mainWindow.center();
                mainWindow.show();
                mainWindow.focus();
                mainWindow.webContents.send('set-view', 'search');
            }
        });

        // Win+Alt+Space for direct Clipboard
        globalShortcut.register('CommandOrControl+Alt+Space', () => {
            applyWindowBounds('search');
            mainWindow.center();
            mainWindow.show();
            mainWindow.focus();
            mainWindow.webContents.send('set-view', 'search');
            mainWindow.webContents.send('set-query', 'clipboard');
        });
    });
}

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
                        if (shortcut && shortcut.target && typeof shortcut.target === 'string' && shortcut.target.length > 0) {
                            iconPath = shortcut.target;
                        }
                    } catch (e) {
                        console.error(`Failed to read shortcut ${result.path}:`, e);
                    }
                }
                const icon = await app.getFileIcon(iconPath, { size: 'normal' });
                return { ...result, icon: (icon && typeof icon.toDataURL === 'function') ? icon.toDataURL() : null };
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
    return launchCommandInTerminal(command);
});

ipcMain.handle('copy-to-clipboard', async (event, text) => {
    const { clipboard } = require('electron');
    clipboard.writeText(text);
});

ipcMain.handle('hide-window', async () => {
    if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.hide();
    }
});

ipcMain.handle('set-window-view', async (event, view) => {
    applyWindowBounds(view);
});

ipcMain.handle('get-settings', async () => {
    const settings = settingsManager.getSettings();
    const launchAtStartup = supportsLaunchAtStartup()
        ? getLaunchAtStartupSetting()
        : Boolean(settings.launchAtStartup);

    if (supportsLaunchAtStartup() && settings.launchAtStartup !== launchAtStartup) {
        settingsManager.save({ launchAtStartup });
    }

    return {
        ...settingsManager.getSettings(),
        launchAtStartup,
        startupSupported: supportsLaunchAtStartup(),
    };
});

ipcMain.handle('save-settings', async (event, newSettings) => {
    if (Object.prototype.hasOwnProperty.call(newSettings, 'launchAtStartup')) {
        newSettings = {
            ...newSettings,
            launchAtStartup: supportsLaunchAtStartup()
                ? applyLaunchAtStartupSetting(Boolean(newSettings.launchAtStartup))
                : Boolean(newSettings.launchAtStartup),
        };
    }

    return settingsManager.save(newSettings);
});
