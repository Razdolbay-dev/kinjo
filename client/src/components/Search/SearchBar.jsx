import { useState } from 'react';
import { FiSearch, FiX } from 'react-icons/fi';

export const SearchBar = ({
                              onSearch,
                              placeholder = "Найти фильм или сериал...",
                              initialValue = "",
                              autoFocus = false,
                              className = ""
                          }) => {
    const [searchTerm, setSearchTerm] = useState(initialValue);

    const handleSubmit = (e) => {
        e.preventDefault();
        if (searchTerm.trim()) {
            onSearch(searchTerm);
        }
    };

    const handleClear = () => {
        setSearchTerm('');
        onSearch('');
    };

    return (
        <form onSubmit={handleSubmit} className={`relative ${className}`}>
            <div className="relative group">
                <FiSearch className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-500 w-5 h-5" />

                <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder={placeholder}
                    autoFocus={autoFocus}
                    className="input-field pl-12 pr-12 py-4 text-lg bg-gray-900/50 backdrop-blur-sm"
                />

                {searchTerm && (
                    <button
                        type="button"
                        onClick={handleClear}
                        className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-white transition-colors"
                    >
                        <FiX className="w-5 h-5" />
                    </button>
                )}
            </div>

            <button
                type="submit"
                className="btn-primary absolute right-2 top-1/2 transform -translate-y-1/2 hidden sm:flex items-center space-x-2"
            >
                <FiSearch className="w-4 h-4" />
                <span>Найти</span>
            </button>
        </form>
    );
};