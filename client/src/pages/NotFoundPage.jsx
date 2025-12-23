import { Link } from 'react-router-dom';
import { FiHome, FiFilm, FiSearch, FiFrown } from 'react-icons/fi';

export const NotFoundPage = () => {
    const quickLinks = [
        { icon: FiHome, label: 'На главную', path: '/' },
        { icon: FiFilm, label: 'Популярные фильмы', path: '/popular' },
        { icon: FiSearch, label: 'Поиск', path: '/search' },
    ];

    return (
        <div className="min-h-screen flex items-center justify-center">
            <div className="container-custom py-12">
                <div className="max-w-2xl mx-auto text-center">
                    {/* Иконка */}
                    <div className="mb-8">
                        <div className="w-32 h-32 bg-gradient-to-br from-gray-800 to-gray-900 rounded-full flex items-center justify-center mx-auto mb-6">
                            <FiFrown className="w-16 h-16 text-gray-400" />
                        </div>

                        <div className="relative">
                            <h1 className="text-9xl font-bold text-gray-800/50">404</h1>
                            <div className="absolute inset-0 flex items-center justify-center">
                                <h2 className="text-4xl font-bold">Страница не найдена</h2>
                            </div>
                        </div>
                    </div>

                    {/* Сообщение */}
                    <div className="mb-12">
                        <p className="text-xl text-gray-300 mb-6">
                            Упс! Похоже, страница, которую вы ищете, куда-то пропала...
                        </p>
                        <p className="text-gray-400">
                            Возможно, она была перемещена, удалена или вы просто ошиблись в адресе.
                        </p>
                    </div>

                    {/* Быстрые ссылки */}
                    <div className="mb-12">
                        <h3 className="text-lg font-semibold mb-6">Попробуйте эти страницы:</h3>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            {quickLinks.map((link) => (
                                <Link
                                    key={link.label}
                                    to={link.path}
                                    className="glass-effect rounded-xl p-6 hover:bg-gray-800/50 transition-all duration-300 group"
                                >
                                    <div className="flex flex-col items-center">
                                        <div className="w-12 h-12 bg-primary-600/20 rounded-lg flex items-center justify-center mb-3 group-hover:bg-primary-600/30 transition-colors">
                                            <link.icon className="w-6 h-6 text-primary-400" />
                                        </div>
                                        <span className="font-medium">{link.label}</span>
                                    </div>
                                </Link>
                            ))}
                        </div>
                    </div>

                    {/* Поиск */}
                    <div className="glass-effect rounded-2xl p-8">
                        <h3 className="text-lg font-semibold mb-4">Или найдите нужный фильм:</h3>
                        <div className="max-w-md mx-auto">
                            <Link
                                to="/search"
                                className="btn-primary flex items-center justify-center gap-3 w-full py-4"
                            >
                                <FiSearch className="w-5 h-5" />
                                <span>Перейти к поиску</span>
                            </Link>
                        </div>
                    </div>

                    {/* Декоративный элемент */}
                    <div className="mt-12">
                        <div className="relative h-1 w-full max-w-md mx-auto overflow-hidden">
                            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-primary-500 to-transparent animate-pulse-slow" />
                        </div>
                        <p className="text-gray-500 text-sm mt-4">
                            Если вы считаете, что это ошибка, пожалуйста, сообщите нам
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};