import React from 'react';

const UserAvatar = ({ user, size = 'md', className = '' }) => {
    const getInitials = () => {
        if (!user) return 'U';
        // Prioritize fullName, fallback to username
        const name = user.fullName || user.username || 'U';
        return name.charAt(0).toUpperCase();
    };

    const getSizeClasses = () => {
        switch (size) {
            case 'xs': return 'w-6 h-6 text-xs';
            case 'sm': return 'w-8 h-8 text-xs';
            case 'md': return 'w-10 h-10 text-sm';
            case 'lg': return 'w-12 h-12 text-lg';
            case 'xl': return 'w-16 h-16 text-xl';
            case '2xl': return 'w-20 h-20 text-2xl';
            default: return 'w-10 h-10 text-sm';
        }
    };

    const baseClasses = `flex-shrink-0 rounded-full flex items-center justify-center font-bold relative ${getSizeClasses()} ${className}`;

    if (user?.avatar) {
        return (
            <div className={baseClasses}>
                <img
                    src={user.avatar}
                    alt={user.fullName || 'User avatar'}
                    className="w-full h-full rounded-full object-cover"
                />
            </div>
        );
    }

    // Consistent background colors based on user role or random could be nice, 
    // but for now keeping it simple with primary color as requested/implied by existing design.
    // Using the style from MainLayout: bg-primary-100 text-primary-700
    // Or allowing override via className.

    // If className doesn't override bg, add default.
    const hasBg = className.includes('bg-');
    const hasText = className.includes('text-');

    const defaultBg = !hasBg ? 'bg-primary-100' : '';
    const defaultText = !hasText ? 'text-primary-700' : '';

    return (
        <div className={`${baseClasses} ${defaultBg} ${defaultText}`}>
            {getInitials()}
        </div>
    );
};

export default UserAvatar;
