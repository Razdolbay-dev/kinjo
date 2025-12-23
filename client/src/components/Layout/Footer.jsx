import { FiHeart, FiGithub, FiMail, FiTwitter } from 'react-icons/fi';
import { Link } from 'react-router-dom';

export const Footer = () => {
    const currentYear = new Date().getFullYear();

    const footerLinks = [
        { title: 'Фильмы', links: [
                { label: 'Популярные', href: '/popular' },
                { label: 'Новинки', href: '/new' },
                { label: 'Скоро', href: '/upcoming' },
                { label: 'Топ 250', href: '/top' },
            ]},
        { title: 'Сериалы', links: [
                { label: 'Популярные', href: '/series/popular' },
                { label: 'Новые сезоны', href: '/series/new' },
                { label: 'Завершенные', href: '/series/ended' },
                { label: 'Многосезонные', href: '/series/multi' },
            ]},
        { title: 'Помощь', links: [
                { label: 'О проекте', href: '/about' },
                { label: 'Контакты', href: '/contacts' },
                { label: 'Правила', href: '/rules' },
                { label: 'FAQ', href: '/faq' },
            ]},
        { title: 'Партнерам', links: [
                { label: 'Реклама', href: '/ads' },
                { label: 'API', href: '/api' },
                { label: 'Разработчикам', href: '/developers' },
                { label: 'Вакансии', href: '/jobs' },
            ]},
    ];

    const socialLinks = [
        { icon: FiGithub, href: 'https://github.com', label: 'GitHub' },
        { icon: FiTwitter, href: 'https://twitter.com', label: 'Twitter' },
        { icon: FiMail, href: 'mailto:contact@moviehub.com', label: 'Email' },
    ];

    return (
        <footer className="glass-effect border-t border-gray-800/50 mt-auto">
            <div className="container-custom py-12">
                {/* Основная часть футера */}
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-8 mb-12">
                    {/* Логотип и описание */}
                    <div className="col-span-2 md:col-span-4 lg:col-span-1">
                        <div className="mb-4">
                            <div className="w-12 h-12 bg-gradient-to-br from-primary-500 to-cyan-500 rounded-lg flex items-center justify-center mb-4">
                                <FiHeart className="w-6 h-6 text-white" />
                            </div>
                            <h3 className="text-xl font-bold text-gradient mb-2">MovieHub</h3>
                            <p className="text-gray-400 text-sm">
                                Лучший способ найти и посмотреть фильмы онлайн
                            </p>
                        </div>

                        {/* Социальные сети */}
                        <div className="flex space-x-4">
                            {socialLinks.map((social) => (
                                <a
                                    key={social.label}
                                    href={social.href}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-gray-400 hover:text-primary-400 transition-colors"
                                    aria-label={social.label}
                                >
                                    <social.icon className="w-5 h-5" />
                                </a>
                            ))}
                        </div>
                    </div>

                    {/* Ссылки */}
                    {footerLinks.map((column) => (
                        <div key={column.title}>
                            <h4 className="font-semibold text-lg mb-4">{column.title}</h4>
                            <ul className="space-y-3">
                                {column.links.map((link) => (
                                    <li key={link.label}>
                                        <Link
                                            to={link.href}
                                            className="text-gray-400 hover:text-white transition-colors text-sm"
                                        >
                                            {link.label}
                                        </Link>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    ))}
                </div>

                {/* Разделитель */}
                <div className="border-t border-gray-800/50 pt-8">
                    {/* Информация о правах */}
                    <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                        <div className="text-gray-400 text-sm">
                            <p>
                                © {currentYear} MovieHub. Все права защищены.
                            </p>
                            <p className="mt-1">
                                Этот сайт использует данные TMDB, но не одобрен TMDB.
                            </p>
                        </div>

                        <div className="flex flex-wrap gap-6 text-sm text-gray-400">
                            <Link to="/privacy" className="hover:text-white transition-colors">
                                Политика конфиденциальности
                            </Link>
                            <Link to="/terms" className="hover:text-white transition-colors">
                                Условия использования
                            </Link>
                            <Link to="/cookies" className="hover:text-white transition-colors">
                                Cookies
                            </Link>
                        </div>
                    </div>

                    {/* Предупреждение */}
                    <div className="mt-6 p-4 bg-gray-800/30 rounded-lg border border-gray-700/50">
                        <p className="text-sm text-gray-400 text-center">
                            ⚠️ Внимание! Весь контент на сайте предоставляется исключительно в ознакомительных целях.
                            Администрация не несёт ответственности за его использование. Мы поддерживаем легальный контент и уважаем права правообладателей.
                        </p>
                    </div>
                </div>
            </div>
        </footer>
    );
};