import { Link, useNavigate } from 'react-router-dom';
import { FiSearch, FiHome, FiMenu, FiChevronDown } from 'react-icons/fi';
import { SearchBar } from '../Search/SearchBar';
import { useState, useEffect } from 'react';
import { movieAPI } from '../../services/api.js';

export const Header = () => {
    const navigate = useNavigate();
    const [searchOpen, setSearchOpen] = useState(false);
    const [contentTypes, setContentTypes] = useState([]);
    const [dropdownOpen, setDropdownOpen] = useState(false);

    useEffect(() => {
        loadContentTypes();
    }, []);

    const loadContentTypes = async () => {
        try {
            const response = await movieAPI.getContentTypes();
            if (response.success) {
                setContentTypes(response.data);
            }
        } catch (error) {
            console.error('Error loading content types:', error);
        }
    };

    const handleSearch = (query) => {
        if (query.trim()) {
            navigate(`/search?q=${encodeURIComponent(query)}`);
        }
    };

    const mainTypes = [
        { id: 4, name: 'Фильмы', slug: 'movie', icon: '🎬' },
        { id: 2, name: 'Сериалы', slug: 'serial', icon: '📺' },
        { id: 11, name: 'Аниме', slug: 'anime', icon: '🇯🇵' },
        { id: 12, name: 'Мультфильмы', slug: 'multfilm', icon: '🐰' },
    ];

    const otherTypes = contentTypes.filter(
        type => !mainTypes.some(main => main.id === type.id)
    );

    return (
        <header className="sticky top-0 z-50 glass-effect border-b border-gray-800/50 backdrop-blur-xl">
            <div className="container-custom">
                <div className="flex items-center justify-between h-16">
                    {/* Логотип */}
                    <Link to="/" className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-primary-500 to-cyan-500 rounded-lg flex items-center justify-center">
                            <span className="text-xl">🎬</span>
                        </div>
                        <span className="text-xl font-bold text-gradient">MovieHub</span>
                    </Link>

                    {/* Навигация для десктопа */}
                    <nav className="hidden md:flex items-center space-x-6">
                        <Link
                            to="/"
                            className="flex items-center space-x-2 text-gray-300 hover:text-primary-400 transition-colors px-3 py-2 rounded-lg hover:bg-gray-800/50"
                        >
                            <FiHome className="w-5 h-5" />
                            <span className="font-medium">Главная</span>
                        </Link>

                        {mainTypes.map((type) => (
                            <Link
                                key={type.id}
                                to={`/type/${type.slug}`}
                                className="flex items-center space-x-2 text-gray-300 hover:text-primary-400 transition-colors px-3 py-2 rounded-lg hover:bg-gray-800/50"
                            >
                                <span className="text-lg">{type.icon}</span>
                                <span className="font-medium">{type.name}</span>
                            </Link>
                        ))}

                        {/* Dropdown для остальных типов */}
                        {otherTypes.length > 0 && (
                            <div className="relative group">
                                <button className="flex items-center space-x-2 text-gray-300 hover:text-primary-400 transition-colors px-3 py-2 rounded-lg hover:bg-gray-800/50">
                                    <FiMenu className="w-5 h-5" />
                                    <span className="font-medium">Ещё</span>
                                    <FiChevronDown className="w-4 h-4" />
                                </button>

                                <div className="absolute top-full left-0 mt-2 w-64 glass-effect rounded-xl p-2 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 shadow-2xl">
                                    <div className="grid grid-cols-2 gap-1">
                                        {otherTypes.map((type) => (
                                            <Link
                                                key={type.id}
                                                to={`/type/${type.slug}`}
                                                className="flex items-center space-x-2 text-gray-300 hover:text-white hover:bg-gray-800/50 p-3 rounded-lg transition-colors"
                                            >
                                                <span className="text-sm font-medium">{type.name}</span>
                                            </Link>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}
                    </nav>

                    {/* Правая часть */}
                    <div className="flex items-center space-x-4">
                        {/* Поиск */}
                        <div className="hidden md:block w-64">
                            <SearchBar
                                onSearch={handleSearch}
                                placeholder="Поиск..."
                                className="w-full"
                            />
                        </div>

                        {/* Кнопка поиска для мобильных */}
                        <button
                            onClick={() => setSearchOpen(!searchOpen)}
                            className="md:hidden text-gray-300 hover:text-white"
                        >
                            <FiSearch className="w-6 h-6" />
                        </button>

                        {/* Мобильное меню */}
                        <button
                            onClick={() => setDropdownOpen(!dropdownOpen)}
                            className="md:hidden text-gray-300 hover:text-white"
                        >
                            <FiMenu className="w-6 h-6" />
                        </button>
                    </div>
                </div>

                {/* Мобильный поиск */}
                {searchOpen && (
                    <div className="md:hidden py-4 border-t border-gray-800/50">
                        <SearchBar
                            onSearch={handleSearch}
                            placeholder="Поиск фильмов..."
                            autoFocus
                        />
                    </div>
                )}

                {/* Мобильное меню */}
                {dropdownOpen && (
                    <div className="md:hidden py-4 border-t border-gray-800/50">
                        <div className="grid grid-cols-2 gap-3">
                            <Link
                                to="/"
                                className="flex items-center justify-center space-x-2 text-gray-300 hover:text-primary-400 transition-colors p-3 rounded-lg bg-gray-800/50"
                                onClick={() => setDropdownOpen(false)}
                            >
                                <FiHome className="w-5 h-5" />
                                <span>Главная</span>
                            </Link>

                            {contentTypes.slice(0, 6).map((type) => (
                                <Link
                                    key={type.id}
                                    to={`/type/${type.slug}`}
                                    className="flex items-center justify-center space-x-2 text-gray-300 hover:text-primary-400 transition-colors p-3 rounded-lg bg-gray-800/50"
                                    onClick={() => setDropdownOpen(false)}
                                >
                                    <span className="font-medium">{type.name}</span>
                                </Link>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </header>
    );
};