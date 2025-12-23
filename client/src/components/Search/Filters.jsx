import { useState } from 'react';
import {
    FiFilter,
    FiCalendar,
    FiStar,
    FiChevronDown,
    FiX
} from 'react-icons/fi';

export const Filters = ({ onFilterChange, initialFilters = {} }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [filters, setFilters] = useState({
        year: initialFilters.year || '',
        min_year: initialFilters.min_year || '',
        max_year: initialFilters.max_year || '',
        content_type_id: initialFilters.content_type_id || '',
        has_poster: initialFilters.has_poster || false,
        sort_by: initialFilters.sort_by || 'year',
        sort_order: initialFilters.sort_order || 'desc',
    });

    const handleChange = (field, value) => {
        const newFilters = { ...filters, [field]: value };
        setFilters(newFilters);
        onFilterChange(newFilters);
    };

    const handleReset = () => {
        const resetFilters = {
            year: '',
            min_year: '',
            max_year: '',
            content_type_id: '',
            has_poster: false,
            sort_by: 'year',
            sort_order: 'desc',
        };
        setFilters(resetFilters);
        onFilterChange(resetFilters);
    };

    const currentYear = new Date().getFullYear();
    const years = Array.from({ length: 50 }, (_, i) => currentYear - i);

    return (
        <div className="relative">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="btn-secondary flex items-center space-x-2"
            >
                <FiFilter className="w-4 h-4" />
                <span>Фильтры</span>
                <FiChevronDown className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </button>

            {isOpen && (
                <div className="absolute top-full left-0 mt-2 z-50 w-80 glass-effect rounded-xl p-6 shadow-2xl animate-slide-up">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="text-lg font-semibold">Фильтры</h3>
                        <button
                            onClick={() => setIsOpen(false)}
                            className="text-gray-400 hover:text-white"
                        >
                            <FiX className="w-5 h-5" />
                        </button>
                    </div>

                    <div className="space-y-4">
                        {/* Год выпуска */}
                        <div>
                            <label className="block text-sm font-medium mb-2">Год выпуска</label>
                            <select
                                value={filters.year}
                                onChange={(e) => handleChange('year', e.target.value)}
                                className="input-field"
                            >
                                <option value="">Все года</option>
                                {years.map(year => (
                                    <option key={year} value={year}>{year}</option>
                                ))}
                            </select>
                        </div>

                        {/* Диапазон лет */}
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="block text-sm font-medium mb-2">От</label>
                                <input
                                    type="number"
                                    placeholder="2000"
                                    value={filters.min_year}
                                    onChange={(e) => handleChange('min_year', e.target.value)}
                                    className="input-field"
                                    min="1900"
                                    max={currentYear}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-2">До</label>
                                <input
                                    type="number"
                                    placeholder={currentYear}
                                    value={filters.max_year}
                                    onChange={(e) => handleChange('max_year', e.target.value)}
                                    className="input-field"
                                    min="1900"
                                    max={currentYear}
                                />
                            </div>
                        </div>

                        {/* Тип контента */}
                        <div>
                            <label className="block text-sm font-medium mb-2">Тип</label>
                            <select
                                value={filters.content_type_id}
                                onChange={(e) => handleChange('content_type_id', e.target.value)}
                                className="input-field"
                            >
                                <option value="">Все типы</option>
                                <option value="1">Фильм</option>
                                <option value="2">Сериал</option>
                                <option value="3">Мультфильм</option>
                                <option value="4">Аниме</option>
                            </select>
                        </div>

                        {/* Сортировка */}
                        <div>
                            <label className="block text-sm font-medium mb-2">Сортировать по</label>
                            <div className="flex space-x-2">
                                <select
                                    value={filters.sort_by}
                                    onChange={(e) => handleChange('sort_by', e.target.value)}
                                    className="input-field flex-1"
                                >
                                    <option value="year">Году</option>
                                    <option value="title">Названию</option>
                                    <option value="created_at">Дате добавления</option>
                                </select>
                                <select
                                    value={filters.sort_order}
                                    onChange={(e) => handleChange('sort_order', e.target.value)}
                                    className="input-field w-32"
                                >
                                    <option value="desc">По убыванию</option>
                                    <option value="asc">По возрастанию</option>
                                </select>
                            </div>
                        </div>

                        {/* Чекбокс - только с постером */}
                        <div className="flex items-center">
                            <input
                                type="checkbox"
                                id="has_poster"
                                checked={filters.has_poster}
                                onChange={(e) => handleChange('has_poster', e.target.checked)}
                                className="w-4 h-4 rounded bg-gray-700 border-gray-600 text-primary-600 focus:ring-primary-500"
                            />
                            <label htmlFor="has_poster" className="ml-2 text-sm">
                                Только с постером
                            </label>
                        </div>

                        {/* Кнопки действий */}
                        <div className="flex space-x-3 pt-4">
                            <button
                                onClick={handleReset}
                                className="btn-secondary flex-1"
                            >
                                Сбросить
                            </button>
                            <button
                                onClick={() => setIsOpen(false)}
                                className="btn-primary flex-1"
                            >
                                Применить
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};