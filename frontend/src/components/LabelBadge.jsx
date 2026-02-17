import React from 'react';
import { getLabelStyle } from '../utils/labelUtils';

const LabelBadge = ({ label, className = '' }) => {
    if (!label) return null;

    const style = getLabelStyle(label);

    return (
        <span
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-bold uppercase tracking-wide shadow-sm border ${style.bg} ${style.text} ${style.border} ${className}`}
        >
            <span className={`w-2 h-2 rounded-full ${style.dot} ring-1 ring-white/50`}></span>
            {label}
        </span>
    );
};

export default LabelBadge;
