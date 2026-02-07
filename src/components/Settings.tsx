import React, { useState, useEffect } from 'react';
import { Github } from 'lucide-react';

interface SettingsProps {
    onClose: () => void;
}

const Settings: React.FC<SettingsProps> = ({ onClose }) => {
    const [settings, setSettings] = useState<any>(null);

    useEffect(() => {
        window.electron.getSettings().then(setSettings);
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
