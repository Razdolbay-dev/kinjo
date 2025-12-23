import { FiChevronLeft, FiChevronRight } from 'react-icons/fio';

export const Pagination = ({
                               currentPage,
                               totalPages,
                               onPageChange,
                               maxVisible = 5
                           }) => {
    const getPageNumbers = () => {
        const pages = [];
        let start = Math.max(1, currentPage - Math.floor(maxVisible / 2));
        let end = Math.min(totalPages, start + maxVisible - 1);

        if (end - start + 1 < maxVisible) {
            start = Math.max(1, end - maxVisible + 1);
        }

        for (let i = start; i <= end; i++) {
            pages.push(i);
        }

        return pages;
    };

    const pageNumbers = getPageNumbers();

    if (totalPages <= 1) return null;

    return (
        <div className="flex items-center justify-center space-x-2">
            {/* Кнопка "Назад" */}
            <button
                onClick={() => onPageChange(currentPage - 1)}
                disabled={currentPage === 1}
                className="flex items-center justify-center w-10 h-10 rounded-lg bg-gray-800 hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                aria-label="Предыдущая страница"
            >
                <FiChevronLeft className="w-5 h-5" />
            </button>

            {/* Первая страница */}
            {pageNumbers[0] > 1 && (
                <>
                    <button
                        onClick={() => onPageChange(1)}
                        className="w-10 h-10 rounded-lg bg-gray-800 hover:bg-gray-700 transition-colors font-medium"
                    >
                        1
                    </button>
                    {pageNumbers[0] > 2 && (
                        <span className="text-gray-500 px-2">...</span>
                    )}
                </>
            )}

            {/* Номера страниц */}
            {pageNumbers.map((page) => (
                <button
                    key={page}
                    onClick={() => onPageChange(page)}
                    className={`w-10 h-10 rounded-lg font-medium transition-all ${
                        currentPage === page
                            ? 'bg-primary-600 text-white'
                            : 'bg-gray-800 hover:bg-gray-700'
                    }`}
                >
                    {page}
                </button>
            ))}

            {/* Последняя страница */}
            {pageNumbers[pageNumbers.length - 1] < totalPages && (
                <>
                    {pageNumbers[pageNumbers.length - 1] < totalPages - 1 && (
                        <span className="text-gray-500 px-2">...</span>
                    )}
                    <button
                        onClick={() => onPageChange(totalPages)}
                        className="w-10 h-10 rounded-lg bg-gray-800 hover:bg-gray-700 transition-colors font-medium"
                    >
                        {totalPages}
                    </button>
                </>
            )}

            {/* Кнопка "Вперед" */}
            <button
                onClick={() => onPageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
                className="flex items-center justify-center w-10 h-10 rounded-lg bg-gray-800 hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                aria-label="Следующая страница"
            >
                <FiChevronRight className="w-5 h-5" />
            </button>

            {/* Информация о странице */}
            <div className="ml-4 text-sm text-gray-400 hidden sm:block">
                Страница {currentPage} из {totalPages}
            </div>
        </div>
    );
};