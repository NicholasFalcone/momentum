import React, { useState, useEffect, useCallback } from 'react';
import SearchBar from './components/SearchBar';
import ResultList from './components/ResultList';
import Settings from './components/Settings';
import { motion, AnimatePresence } from 'framer-motion';
import './App.css';

interface Result {
    name: string;
    path?: string;
    type: string;
    value?: any;
    icon?: string;
}

function App() {
    const [view, setView] = useState('search');
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<Result[]>([]);
    const [selectedIndex, setSelectedIndex] = useState(0);

    const hideLauncher = useCallback(() => {
        setView('search');
        setQuery('');
        setResults([]);
        setSelectedIndex(0);
        window.electron.hideWindow();
    }, []);

    const fetchResults = useCallback(async (q: string) => {
        if (q.trim()) {
            const data = await window.electron.search(q);
            setResults(data);
            setSelectedIndex(0);
        } else {
            setResults([]);
        }
    }, []);

    useEffect(() => {
        const timer = setTimeout(() => {
            if (view === 'search') fetchResults(query);
        }, 100);
        return () => clearTimeout(timer);
    }, [query, fetchResults, view]);

    const applyTheme = useCallback(async () => {
        const settings = await window.electron.getSettings();
        if (settings.accentColor) {
            document.documentElement.style.setProperty('--accent', settings.accentColor);
        }

        document.documentElement.style.setProperty(
            '--overlay-opacity',
            String(settings.overlayOpacity ?? 0.7)
        );
    }, []);

    useEffect(() => {
        applyTheme();

        window.electron.onSetQuery((newQuery) => {
            setQuery(newQuery);
            setView('search');
        });
        window.electron.onSetView((newView) => {
            setView(newView);
            if (newView === 'search') {
                setQuery('');
                applyTheme();
            }
        });
    }, [applyTheme]);

    useEffect(() => {
        const handleEscape = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                event.preventDefault();
                hideLauncher();
            }
        };

        window.addEventListener('keydown', handleEscape);
        return () => window.removeEventListener('keydown', handleEscape);
    }, [hideLauncher]);

    // Apply theme when view changes from settings to search locally
    useEffect(() => {
        window.electron.setWindowView(view);

        if (view === 'search') {
            applyTheme();
        }
    }, [view, applyTheme]);

    const handleSelect = useCallback((result: Result) => {
        if (result.type === 'app' && result.path) {
            window.electron.launch(result.path);
        } else if (result.type === 'web' && result.value) {
            window.electron.openUrl(result.value);
            setQuery('');
        } else if (result.type === 'calc' || result.type === 'clipboard') {
            window.electron.copyToClipboard(result.value.toString());
            setQuery('');
        } else if (result.type === 'cmd' && result.value) {
            window.electron.executeCommand(result.value);
            setQuery('');
        } else if (result.type === 'ui' && result.value === 'settings') {
            setView('settings');
            setQuery('');
            setResults([]);
        }
    }, []);

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Escape') {
            e.preventDefault();
            hideLauncher();
            return;
        }

        if (results.length === 0) return;

        if (e.key === 'ArrowDown') {
            setSelectedIndex((prev) => (prev + 1) % results.length);
            e.preventDefault();
        } else if (e.key === 'ArrowUp') {
            setSelectedIndex((prev) => (prev - 1 + results.length) % results.length);
            e.preventDefault();
        } else if (e.key === 'Enter') {
            if (results[selectedIndex]) {
                handleSelect(results[selectedIndex]);
            }
        } else if (e.key >= '1' && e.key <= '9' && (e.metaKey || e.ctrlKey)) {
            const idx = parseInt(e.key) - 1;
            if (results[idx]) handleSelect(results[idx]);
            e.preventDefault();
        }
    };

    return (
        <div className={`app-container ${view === 'settings' ? 'settings-mode' : 'search-mode'}`}>
            <AnimatePresence mode="wait">
                {view === 'search' ? (
                    <motion.div
                        key="search"
                        className="container"
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 20 }}
                        transition={{ duration: 0.2 }}
                    >
                        <div className="search-box">
                            <SearchBar
                                value={query}
                                onChange={setQuery}
                                onKeyDown={handleKeyDown}
                            />

                            <AnimatePresence>
                                {results.length > 0 && (
                                    <motion.div
                                        initial={{ height: 0, opacity: 0 }}
                                        animate={{ height: 'auto', opacity: 1 }}
                                        exit={{ height: 0, opacity: 0 }}
                                        style={{ overflow: 'hidden' }}
                                    >
                                        <ResultList
                                            results={results}
                                            selectedIndex={selectedIndex}
                                            onSelect={handleSelect}
                                        />
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    </motion.div>
                ) : (
                    <motion.div
                        key="settings"
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 1.05 }}
                    >
                        <Settings onClose={() => setView('search')} />
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

export default App;
