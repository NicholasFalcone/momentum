import React, { useState, useEffect } from 'react';
import { Github } from 'lucide-react';

interface SettingsProps {
    onClose: () => void;
}

const Settings: React.FC<SettingsProps> = ({ onClose }) => {
    const [settings, setSettings] = useState<any>(null);

    useEffect(() => {
        window.electron.getSettings().then((s: any) => {
            setSettings(s);
            if (s.accentColor) {
                document.documentElement.style.setProperty('--accent', s.accentColor);
            }
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
                                    document.documentElement.style.setProperty('--accent', color);
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

                <section>
                    <h3>Project</h3>
                    <div className="field">
                        <label>Repository</label>
                        <div
                            className="repo-link"
                            onClick={() => window.electron.openUrl('https://github.com/NicholasFalcone/momentum.git')}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                cursor: 'pointer',
                                padding: '8px',
                                borderRadius: '4px',
                                background: 'rgba(255, 255, 255, 0.05)',
                                color: '#fff',
                                textDecoration: 'none',
                                transition: 'background 0.2s',
                                width: 'fit-content'
                            }}
                        >
                            <Github size={16} />
                            <span style={{ fontSize: '14px' }}>NicholasFalcone/momentum</span>
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
