const fs = require('fs');
const path = require('path');
const { app } = require('electron');

class SettingsManager {
    constructor() {
        this.settingsPath = path.join(app.getPath('userData'), 'settings.json');
        this.defaults = {
            hotkey: 'Alt+Space',
            webSearches: [
                { name: 'Google', keyword: 'g', url: 'https://www.google.com/search?q={query}', icon: '🔍' },
                { name: 'YouTube', keyword: 'yt', url: 'https://www.youtube.com/results?search_query={query}', icon: '📺' },
                { name: 'GitHub', keyword: 'gh', url: 'https://github.com/search?q={query}', icon: '🐙' },
                { name: 'Wikipedia', keyword: 'w', url: 'https://en.wikipedia.org/wiki/Special:Search?search={query}', icon: '📖' }
            ],
            theme: 'dark'
        };
        this.settings = this.load();
    }

    load() {
        try {
            if (fs.existsSync(this.settingsPath)) {
                const data = fs.readFileSync(this.settingsPath, 'utf8');
                return { ...this.defaults, ...JSON.parse(data) };
            }
        } catch (e) {
            console.error('Error loading settings:', e);
        }
        return { ...this.defaults };
    }

    save(newSettings) {
        try {
            this.settings = { ...this.settings, ...newSettings };
            fs.writeFileSync(this.settingsPath, JSON.stringify(this.settings, null, 2));
            return true;
        } catch (e) {
            console.error('Error saving settings:', e);
            return false;
        }
    }

    getSettings() {
        return this.settings;
    }
}

module.exports = new SettingsManager();
