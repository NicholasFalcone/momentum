interface Window {
    electron: {
        search: (query: string) => Promise<any[]>;
        launch: (path: string) => Promise<void>;
        openUrl: (url: string) => Promise<void>;
        executeCommand: (command: string) => Promise<void>;
        copyToClipboard: (text: string) => Promise<void>;
        getSettings: () => Promise<any>;
        saveSettings: (settings: any) => Promise<boolean>;
        onSetQuery: (callback: (query: string) => void) => void;
        onSetView: (callback: (view: string) => void) => void;
    }
}
