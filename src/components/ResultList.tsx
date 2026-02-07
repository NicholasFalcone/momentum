import React from 'react';

interface Result {
    name: string;
    path?: string;
    type: string;
    value?: any;
    icon?: string;
}

interface ResultListProps {
    results: Result[];
    selectedIndex: number;
    onSelect: (result: Result) => void;
}

const ResultList: React.FC<ResultListProps> = ({ results, selectedIndex, onSelect }) => {
    if (results.length === 0) return null;

    const renderIcon = (result: Result) => {
        if (result.type === 'app' && result.icon) {
            return (
                <img
                    src={result.icon}
                    alt=""
                    style={{ width: '20px', height: '20px', objectFit: 'contain' }}
                />
            );
        }

        switch (result.type) {
            case 'app': return '🚀';
            case 'calc': return '🔢';
            case 'cmd': return '💻';
            case 'clipboard': return '📋';
            case 'web': return result.icon || '🔍';
            case 'ui': return '⚙️';
            default: return '📄';
        }
    };

    return (
        <div className="results-list">
            {results.map((result, index) => (
                <div
                    key={index}
                    className={`result-item ${index === selectedIndex ? 'selected' : ''}`}
                    onClick={() => onSelect(result)}
                >
                    <span className="result-icon">
                        {renderIcon(result)}
                    </span>
                    <span className="result-name">{result.name}</span>
                    {result.type === 'app' && <span className="result-path">{result.path}</span>}
                </div>
            ))}
        </div>
    );
};

export default ResultList;
