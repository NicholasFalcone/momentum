const { clipboard } = require('electron');

class ClipboardService {
    constructor() {
        this.history = [];
        this.historyLimit = 20;
        this.lastText = '';
        this.interval = null;
    }

    startMonitoring() {
        this.lastText = clipboard.readText();
        this.interval = setInterval(() => {
            const currentText = clipboard.readText();
            if (currentText && currentText !== this.lastText) {
                this.lastText = currentText;
                this.addToHistory(currentText);
            }
        }, 1000);
    }

    stopMonitoring() {
        if (this.interval) {
            clearInterval(this.interval);
        }
    }

    addToHistory(text) {
        // Remove if already exists to move it to the top
        const index = this.history.indexOf(text);
        if (index !== -1) {
            this.history.splice(index, 1);
        }

        this.history.unshift(text);

        if (this.history.length > this.historyLimit) {
            this.history.pop();
        }
    }

    getHistory() {
        return this.history;
    }
}

module.exports = new ClipboardService();
