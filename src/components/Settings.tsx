import React, { useState, useEffect } from 'react';

interface SettingsProps {
    onClose: () => void;
}

const Settings: React.FC<SettingsProps> = ({ onClose }) => {
    const [settings, setSettings] = useState<any>(null);

    const applyAppearance = (nextSettings: any) => {
        if (nextSettings.accentColor) {
            document.documentElement.style.setProperty('--accent', nextSettings.accentColor);
        }

        document.documentElement.style.setProperty(
            '--overlay-opacity',
            String(nextSettings.overlayOpacity ?? 0.7)
        );
    };

    useEffect(() => {
        window.electron.getSettings().then((s: any) => {
            setSettings(s);
            applyAppearance(s);
        });
    }, []);

    const handleSave = async () => {
        const success = await window.electron.saveSettings(settings);
        if (success) onClose();
    };

    if (!settings) return null;

    return (
        <div className="settings-view">
            <div className="settings-header">
                <h2>Settings</h2>
                <button onClick={onClose} className="close-btn">✕</button>
            </div>

            <div className="settings-content">
                <section>
                    <h3>General</h3>
                    <div className="field">
                        <label>Master Hotkey</label>
                        <input
                            type="text"
                            value={settings.hotkey}
                            onChange={(e) => setSettings({ ...settings, hotkey: e.target.value })}
                        />
                    </div>
                    <div className="field" style={{ marginTop: '16px' }}>
                        <label>Accent Color</label>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <input
                                type="color"
                                value={settings.accentColor || '#00A3FF'}
                                onChange={(e) => {
                                    const color = e.target.value;
                                    const newSettings = { ...settings, accentColor: color };
                                    setSettings(newSettings);
                                    applyAppearance(newSettings);
                                    window.electron.saveSettings(newSettings);
                                }}
                                style={{
                                    padding: '0',
                                    border: 'none',
                                    width: '32px',
                                    height: '32px',
                                    borderRadius: '4px',
                                    background: 'transparent',
                                    cursor: 'pointer'
                                }}
                            />
                            <span style={{ fontSize: '14px', fontFamily: 'monospace' }}>
                                {settings.accentColor || '#00A3FF'}
                            </span>
                        </div>
                    </div>
                    <div className="field" style={{ marginTop: '16px' }}>
                        <label>Overlay Opacity</label>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <input
                                type="range"
                                min="0.35"
                                max="1"
                                step="0.05"
                                value={settings.overlayOpacity ?? 0.7}
                                onChange={(e) => {
                                    const overlayOpacity = Number(e.target.value);
                                    const newSettings = { ...settings, overlayOpacity };
                                    setSettings(newSettings);
                                    applyAppearance(newSettings);
                                }}
                                style={{ flex: 1 }}
                            />
                            <span style={{ minWidth: '48px', textAlign: 'right', fontSize: '14px', fontFamily: 'monospace' }}>
                                {Math.round((settings.overlayOpacity ?? 0.7) * 100)}%
                            </span>
                        </div>
                        <span className="setting-toggle-note" style={{ marginTop: '6px' }}>
                            Applica la trasparenza sia all’overlay di ricerca sia alla schermata Settings.
                        </span>
                    </div>
                    <div className="field setting-toggle-card" style={{ marginTop: '16px' }}>
                        <label className="setting-toggle-row">
                            <span className="setting-toggle-text">
                                <strong>Launch at Windows startup</strong>
                                <small>
                                    Avvia One Moment automaticamente quando accedi a Windows.
                                </small>
                            </span>
                            <input
                                className="setting-toggle-input"
                                type="checkbox"
                                checked={Boolean(settings.launchAtStartup)}
                                disabled={!settings.startupSupported}
                                onChange={(e) => setSettings({
                                    ...settings,
                                    launchAtStartup: e.target.checked,
                                })}
                            />
                        </label>
                        <span className="setting-toggle-note">
                            {settings.startupSupported
                                ? 'One Moment restera in background e sara disponibile dalla tray di Windows.'
                                : 'Disponibile solo nella build installata, non mentre l’app gira con npm start.'}
                        </span>
                    </div>
                </section>

                <section>
                    <h3>Web Searches</h3>
                    <div className="web-searches-list">
                        {settings.webSearches.map((ws: any, idx: number) => (
                            <div key={idx} className="web-search-item">
                                <span className="ws-icon">{ws.icon}</span>
                                <div className="ws-details">
                                    <input
                                        className="ws-keyword"
                                        value={ws.keyword}
                                        onChange={(e) => {
                                            const newWS = [...settings.webSearches];
                                            newWS[idx].keyword = e.target.value;
                                            setSettings({ ...settings, webSearches: newWS });
                                        }}
                                    />
                                    <span className="ws-name">{ws.name}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </section>

                <section>
                    <h3>Shortcuts & Commands</h3>
                    <div className="shortcuts-list" style={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '12px',
                        background: 'rgba(255, 255, 255, 0.03)',
                        padding: '16px',
                        borderRadius: '12px',
                        fontSize: '14px'
                    }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '8px' }}>
                            <span style={{ color: 'var(--text-dim)' }}>Global Search</span>
                            <span style={{ fontWeight: 'bold', color: 'var(--accent)' }}>{settings.hotkey}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '8px' }}>
                            <span style={{ color: 'var(--text-dim)' }}>Clipboard History</span>
                            <span style={{ fontWeight: 'bold', color: 'var(--accent)' }}>Ctrl+Alt+Space</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '8px' }}>
                            <span style={{ color: 'var(--text-dim)' }}>Execute Command</span>
                            <span style={{ fontWeight: 'bold', color: 'var(--accent)' }}>$ [command]</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '8px' }}>
                            <span style={{ color: 'var(--text-dim)' }}>Math Calculation</span>
                            <span style={{ fontWeight: 'bold', color: 'var(--accent)' }}>[equation]</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span style={{ color: 'var(--text-dim)' }}>Settings</span>
                            <span style={{ fontWeight: 'bold', color: 'var(--accent)' }}>"settings" or ","</span>
                        </div>
                    </div>
                </section>

                <div className="settings-footer">
                    <button className="primary-btn" onClick={handleSave}>Save & Close</button>
                </div>
            </div>
        </div>
    );
};

export default Settings;
