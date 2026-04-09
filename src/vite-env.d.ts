interface Window {
    electron: {
        search: (query: string) => Promise<any[]>;
        launch: (path: string) => Promise<void>;
        openUrl: (url: string) => Promise<void>;
        executeCommand: (command: string) => Promise<void>;
        copyToClipboard: (text: string) => Promise<void>;
        hideWindow: () => Promise<void>;
        setWindowView: (view: string) => Promise<void>;
        getSettings: () => Promise<any>;
        saveSettings: (settings: any) => Promise<boolean>;
        onSetQuery: (callback: (query: string) => void) => void;
        onSetView: (callback: (view: string) => void) => void;
    }
}

interface LauncherSettings {
    hotkey: string;
    launchAtStartup: boolean;
    overlayOpacity: number;
    startupSupported?: boolean;
    webSearches: Array<{
        name: string;
        keyword: string;
        url: string;
        icon: string;
    }>;
    theme?: string;
    accentColor?: string;
}
