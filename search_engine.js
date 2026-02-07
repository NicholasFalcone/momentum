const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
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

        const searchPaths = [
            path.join(process.env.ProgramData || '', 'Microsoft/Windows/Start Menu/Programs'),
            path.join(process.env.AppData || '', 'Microsoft/Windows/Start Menu/Programs'),
        ];

        const apps = [];
        for (const startMenuPath of searchPaths) {
            if (fs.existsSync(startMenuPath)) {
                this.scanDir(startMenuPath, apps);
            }
        }

        this.apps = apps;
        this.indexing = false;
        return this.apps;
    }

    scanDir(dir, results) {
        try {
            const files = fs.readdirSync(dir);
            for (const file of files) {
                const fullPath = path.join(dir, file);
                const stats = fs.statSync(fullPath);
                if (stats.isDirectory()) {
                    this.scanDir(fullPath, results);
                } else if (file.endsWith('.lnk')) {
                    results.push({
                        name: path.basename(file, '.lnk'),
                        path: fullPath,
                        type: 'app'
                    });
                }
            }
        } catch (e) {
            console.error(`Error scanning ${dir}:`, e);
        }
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
            .filter(app => app.name.toLowerCase().includes(lowerQuery))
            .slice(0, 5);

        return results;
    }
}

module.exports = new SearchEngine();
