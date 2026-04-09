const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const { shell } = require('electron');
const clipboardService = require('./clipboard_service');
const settingsManager = require('./settings_manager');

class SearchEngine {
    constructor() {
        this.apps = [];
        this.indexing = false;
    }

    async indexApps() {
        if (this.indexing) return;
        this.indexing = true;

        try {
            const apps = [];
            const seenKeys = new Set();

            for (const source of this.getShortcutSources()) {
                if (fs.existsSync(source.path)) {
                    this.scanDir(source.path, apps, seenKeys, source.kind);
                }
            }

            for (const app of this.collectRegistryApps()) {
                this.addApp(apps, seenKeys, app);
            }

            this.apps = apps.sort((left, right) => left.name.localeCompare(right.name));
            return this.apps;
        } finally {
            this.indexing = false;
        }
    }

    getShortcutSources() {
        return [
            {
                path: path.join(process.env.ProgramData || '', 'Microsoft/Windows/Start Menu/Programs'),
                kind: 'start-menu',
            },
            {
                path: path.join(process.env.AppData || '', 'Microsoft/Windows/Start Menu/Programs'),
                kind: 'start-menu',
            },
            {
                path: path.join(process.env.PUBLIC || '', 'Desktop'),
                kind: 'desktop',
            },
            {
                path: path.join(process.env.USERPROFILE || '', 'Desktop'),
                kind: 'desktop',
            },
        ].filter(source => source.path);
    }

    scanDir(dir, results, seenKeys, sourceKind) {
        try {
            const files = fs.readdirSync(dir);
            for (const file of files) {
                const fullPath = path.join(dir, file);
                const stats = fs.statSync(fullPath);
                if (stats.isDirectory()) {
                    this.scanDir(fullPath, results, seenKeys, sourceKind);
                } else if (file.endsWith('.lnk')) {
                    this.addApp(results, seenKeys, this.createShortcutApp(fullPath, sourceKind));
                }
            }
        } catch (e) {
            console.error(`Error scanning ${dir}:`, e);
        }
    }

    createShortcutApp(shortcutPath, sourceKind) {
        const shortcutName = this.normalizeName(path.basename(shortcutPath, '.lnk'));
        let targetPath = shortcutPath;

        try {
            const shortcut = shell.readShortcutLink(shortcutPath);
            if (shortcut && shortcut.target) {
                targetPath = shortcut.target;
            }
        } catch (error) {
            // Some system shortcuts cannot be resolved reliably. Keep the shortcut path as fallback.
        }

        return {
            name: shortcutName,
            path: shortcutPath,
            targetPath,
            sourceKind,
            type: 'app'
        };
    }

    collectRegistryApps() {
        try {
            const command = [
                "$paths = @('HKLM:\\Software\\Microsoft\\Windows\\CurrentVersion\\App Paths', 'HKLM:\\Software\\WOW6432Node\\Microsoft\\Windows\\CurrentVersion\\App Paths', 'HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\App Paths')",
                "$apps = foreach ($registryPath in $paths) {",
                "  if (Test-Path $registryPath) {",
                "    Get-ChildItem $registryPath -ErrorAction SilentlyContinue | ForEach-Object {",
                "      try {",
                "        $item = Get-ItemProperty $_.PSPath",
                "        $target = $item.'(default)'",
                "        if ($target -and (Test-Path $target)) {",
                "          [PSCustomObject]@{",
                "            name = [System.IO.Path]::GetFileNameWithoutExtension($_.PSChildName)",
                "            path = $target",
                "            targetPath = $target",
                "            sourceKind = 'app-path'",
                "            type = 'app'",
                "          }",
                "        }",
                "      } catch {}",
                "    }",
                "  }",
                "}",
                "$apps | ConvertTo-Json -Compress"
            ].join('\n');

            const output = execFileSync('powershell.exe', ['-NoProfile', '-Command', command], {
                encoding: 'utf8',
                windowsHide: true,
            }).trim();

            if (!output) {
                return [];
            }

            const parsed = JSON.parse(output);
            const entries = Array.isArray(parsed) ? parsed : [parsed];

            return entries.map(entry => ({
                ...entry,
                name: this.normalizeName(entry.name),
            }));
        } catch (error) {
            console.error('Failed to collect registry apps:', error);
            return [];
        }
    }

    addApp(results, seenKeys, app) {
        if (!app || !app.name || !app.path) {
            return;
        }

        const targetKey = this.normalizePath(app.targetPath || app.path);
        const nameKey = this.normalizeName(app.name).toLowerCase();
        const sourceKey = `${targetKey}::${nameKey}`;

        if (seenKeys.has(sourceKey) || (targetKey && seenKeys.has(targetKey))) {
            return;
        }

        if (targetKey) {
            seenKeys.add(targetKey);
        }
        seenKeys.add(sourceKey);
        results.push(app);
    }

    normalizeName(name) {
        return String(name || '')
            .replace(/[_-]+/g, ' ')
            .replace(/\s+/g, ' ')
            .trim();
    }

    normalizePath(filePath) {
        return String(filePath || '').trim().toLowerCase();
    }

    scoreApp(app, lowerQuery) {
        const appName = app.name.toLowerCase();
        const words = appName.split(/\s+/);

        if (appName === lowerQuery) return 400;
        if (appName.startsWith(lowerQuery)) return 300;
        if (words.some(word => word.startsWith(lowerQuery))) return 220;
        if (appName.includes(lowerQuery)) return 120;
        return 0;
    }

    search(query) {
        if (!query) return [];

        const lowerQuery = query.toLowerCase();
        const parts = query.split(' ');
        const firstWord = parts[0].toLowerCase();
        const remainingQuery = parts.slice(1).join(' ');

        // 1. Settings command
        if (lowerQuery === 'settings' || lowerQuery === ',') {
            return [{
                name: 'Open Settings',
                type: 'ui',
                value: 'settings'
            }];
        }

        // 2. Web Search Keyword check
        const settings = settingsManager.getSettings();
        const webSearch = settings.webSearches.find(s => s.keyword === firstWord);
        if (webSearch && remainingQuery) {
            return [{
                name: `Search ${webSearch.name} for: ${remainingQuery}`,
                type: 'web',
                value: webSearch.url.replace('{query}', encodeURIComponent(remainingQuery)),
                icon: webSearch.icon
            }];
        }

        // 3. Command Execution check ($ prefix)
        if (query.startsWith('$')) {
            const command = query.slice(1).trim();
            if (command) {
                return [{
                    name: `Run: ${command}`,
                    type: 'cmd',
                    value: command
                }];
            }
        }

        // 4. Math check
        if (/^[0-9+\-*/().\s]+$/.test(query)) {
            try {
                const result = eval(query);
                if (typeof result === 'number') {
                    return [{
                        name: `${query} = ${result}`,
                        type: 'calc',
                        value: result
                    }];
                }
            } catch (e) { }
        }

        // 5. Clipboard search
        if (lowerQuery === 'clipboard' || lowerQuery === 'cb') {
            return clipboardService.getHistory().map(text => ({
                name: text.length > 50 ? text.substring(0, 50).replace(/\n/g, ' ') + '...' : text.replace(/\n/g, ' '),
                type: 'clipboard',
                value: text
            }));
        }

        // 6. App search
        const results = this.apps
            .map(app => ({
                app,
                score: this.scoreApp(app, lowerQuery),
            }))
            .filter(item => item.score > 0)
            .sort((left, right) => right.score - left.score || left.app.name.localeCompare(right.app.name))
            .map(item => item.app)
            .slice(0, 5);

        return results;
    }
}

module.exports = new SearchEngine();
