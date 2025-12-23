export const QualityBadge = ({ quality, size = 'md' }) => {
    const sizeClasses = {
        sm: 'px-2 py-1 text-xs',
        md: 'px-3 py-1.5 text-sm',
        lg: 'px-4 py-2 text-base',
    };

    const getQualityColor = (q) => {
        const qualityLower = q.toLowerCase();

        if (qualityLower.includes('4k') || qualityLower.includes('ultra')) {
            return 'bg-purple-600/90 text-white';
        }
        if (qualityLower.includes('full') || qualityLower.includes('1080')) {
            return 'bg-green-600/90 text-white';
        }
        if (qualityLower.includes('720')) {
            return 'bg-blue-600/90 text-white';
        }
        if (qualityLower.includes('hd')) {
            return 'bg-cyan-600/90 text-white';
        }
        if (qualityLower.includes('sd')) {
            return 'bg-yellow-600/90 text-white';
        }

        return 'bg-gray-700/90 text-white';
    };

    return (
        <span className={`${sizeClasses[size]} ${getQualityColor(quality)} rounded-full font-semibold inline-flex items-center justify-center`}>
      {quality.toUpperCase()}
    </span>
    );
};