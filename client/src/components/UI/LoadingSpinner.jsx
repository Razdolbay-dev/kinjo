export const LoadingSpinner = ({ size = 'md', color = 'primary' }) => {
    const sizeClasses = {
        sm: 'w-4 h-4',
        md: 'w-8 h-8',
        lg: 'w-12 h-12',
        xl: 'w-16 h-16',
    };

    const colorClasses = {
        primary: 'text-primary-600',
        white: 'text-white',
        gray: 'text-gray-600',
    };

    return (
        <div className="flex justify-center items-center">
            <div className={`${sizeClasses[size]} ${colorClasses[color]}`}>
                <div className="animate-spin rounded-full h-full w-full border-b-2 border-current" />
            </div>
        </div>
    );
};

export const SkeletonLoader = ({ type = 'card', count = 1 }) => {
    const renderSkeleton = () => {
        switch (type) {
            case 'card':
                return (
                    <div className="animate-pulse">
                        <div className="bg-gray-800 rounded-xl overflow-hidden">
                            <div className="h-64 bg-gray-700" />
                            <div className="p-4 space-y-3">
                                <div className="h-4 bg-gray-700 rounded w-3/4" />
                                <div className="h-3 bg-gray-700 rounded w-1/2" />
                                <div className="h-3 bg-gray-700 rounded w-2/3" />
                            </div>
                        </div>
                    </div>
                );

            case 'detail':
                return (
                    <div className="animate-pulse space-y-6">
                        <div className="h-96 bg-gray-800 rounded-xl" />
                        <div className="space-y-4">
                            <div className="h-8 bg-gray-800 rounded w-1/2" />
                            <div className="h-4 bg-gray-800 rounded w-3/4" />
                            <div className="h-4 bg-gray-800 rounded w-2/3" />
                        </div>
                    </div>
                );

            default:
                return null;
        }
    };

    return (
        <>
            {Array.from({ length: count }).map((_, index) => (
                <div key={index}>{renderSkeleton()}</div>
            ))}
        </>
    );
};