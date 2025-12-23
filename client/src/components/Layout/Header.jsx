import { Link, useNavigate } from 'react-router-dom';
import { FiSearch, FiHome, FiFilm, FiTv, FiUser } from 'react-icons/fi';
import { SearchBar } from '../Search/SearchBar';
import { useState } from 'react';

export const Header = () => {
    const navigate = useNavigate();
    const [searchOpen, setSearchOpen] = useState(false);

    const handleSearch = (query) => {
        if (query.trim()) {
            navigate(`/search?q=${encodeURIComponent(query)}`);
        }
    };

    const navItems = [
        { path: '/', label: 'Главная', icon: FiHome },
        { path: '/movies', label: 'Фильмы', icon: FiFilm },
        { path: '/series', label: 'Сериалы', icon: FiTv },
    ];

    return (
        <header className="sticky top-0 z-50 glass-effect border-b border-gray-800/50 backdrop-blur-xl">
            <div className="container-custom">
                <div className="flex items-center justify-between h-16">
                    {/* Логотип */}
                    <Link to="/" className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-primary-500 to-cyan-500 rounded-lg flex items-center justify-center">
                            <FiFilm className="w-6 h-6 text-white" />
                        </div>
                        <span className="text-xl font-bold text-gradient">MovieHub</span>
                    </Link>

                    {/* Навигация для десктопа */}
                    <nav className="hidden md:flex items-center space-x-8">
                        {navItems.map((item) => (
                            <Link
                                key={item.path}
                                to={item.path}
                                className="flex items-center space-x-2 text-gray-300 hover:text-primary-400 transition-colors"
                            >
                                <item.icon className="w-5 h-5" />
                                <span className="font-medium">{item.label}</span>
                            </Link>
                        ))}
                    </nav>

                    {/* Правая часть */}
                    <div className="flex items-center space-x-4">
                        {/* Поиск */}
                        <div className="hidden md:block w-80">
                            <SearchBar
                                onSearch={handleSearch}
                                placeholder="Найти фильм..."
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

                        {/* Профиль */}
                        <Link
                            to="/profile"
                            className="p-2 rounded-lg bg-gray-800 hover:bg-gray-700 transition-colors"
                        >
                            <FiUser className="w-5 h-5" />
                        </Link>
                    </div>
                </div>

                {/* Мобильный поиск */}
                {searchOpen && (
                    <div className="md:hidden py-4 border-t border-gray-800/50">
                        <SearchBar
                            onSearch={handleSearch}
                            placeholder="Найти фильм..."
                            autoFocus
                        />
                    </div>
                )}
            </div>
        </header>
    );
};