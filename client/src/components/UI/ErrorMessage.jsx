import { FiAlertCircle } from 'react-icons/fi';

export const ErrorMessage = ({ message, onRetry }) => {
    return (
        <div className="glass-effect rounded-xl p-8 text-center">
            <div className="flex flex-col items-center space-y-4">
                <FiAlertCircle className="w-16 h-16 text-red-500" />
                <div>
                    <h3 className="text-xl font-semibold mb-2">Произошла ошибка</h3>
                    <p className="text-gray-400">{message}</p>
                </div>
                {onRetry && (
                    <button
                        onClick={onRetry}
                        className="btn-primary mt-4"
                    >
                        Попробовать снова
                    </button>
                )}
            </div>
        </div>
    );
};