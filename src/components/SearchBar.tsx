import React from 'react';

interface SearchBarProps {
    value: string;
    onChange: (value: string) => void;
    onKeyDown?: (e: React.KeyboardEvent) => void;
}

const SearchBar: React.FC<SearchBarProps> = ({ value, onChange, onKeyDown }) => {
    return (
        <div className="search-bar-container">
            <input
                className="search-input"
                type="text"
                placeholder="Search for apps, files or do math..."
                value={value}
                onChange={(e) => onChange(e.target.value)}
                onKeyDown={onKeyDown}
                autoFocus
            />
        </div>
    );
};

export default SearchBar;
