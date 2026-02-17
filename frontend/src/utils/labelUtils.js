export const getLabelStyle = (label) => {
    if (!label) return null;

    // Modern, enterprise-level color palette (backgrounds and text colors)
    // These are designed to be distinct but harmonious
    const colors = [
        { bg: 'bg-blue-100', text: 'text-blue-800', border: 'border-blue-200', dot: 'bg-blue-600' },
        { bg: 'bg-indigo-100', text: 'text-indigo-800', border: 'border-indigo-200', dot: 'bg-indigo-600' },
        { bg: 'bg-purple-100', text: 'text-purple-800', border: 'border-purple-200', dot: 'bg-purple-600' },
        { bg: 'bg-pink-100', text: 'text-pink-800', border: 'border-pink-200', dot: 'bg-pink-600' },
        { bg: 'bg-rose-100', text: 'text-rose-800', border: 'border-rose-200', dot: 'bg-rose-600' },
        { bg: 'bg-orange-100', text: 'text-orange-800', border: 'border-orange-200', dot: 'bg-orange-600' },
        { bg: 'bg-amber-100', text: 'text-amber-800', border: 'border-amber-200', dot: 'bg-amber-600' },
        { bg: 'bg-emerald-100', text: 'text-emerald-800', border: 'border-emerald-200', dot: 'bg-emerald-600' },
        { bg: 'bg-teal-100', text: 'text-teal-800', border: 'border-teal-200', dot: 'bg-teal-600' },
        { bg: 'bg-cyan-100', text: 'text-cyan-800', border: 'border-cyan-200', dot: 'bg-cyan-600' },
        { bg: 'bg-sky-100', text: 'text-sky-800', border: 'border-sky-200', dot: 'bg-sky-600' },
        { bg: 'bg-violet-100', text: 'text-violet-800', border: 'border-violet-200', dot: 'bg-violet-600' },
        { bg: 'bg-fuchsia-100', text: 'text-fuchsia-800', border: 'border-fuchsia-200', dot: 'bg-fuchsia-600' },
        { bg: 'bg-lime-100', text: 'text-lime-800', border: 'border-lime-200', dot: 'bg-lime-600' },
    ];

    const lowerLabel = label.toLowerCase();

    // Specific mappings for known labels to ensure uniqueness
    const specificMappings = {
        'quote': { bg: 'bg-amber-100', text: 'text-amber-800', border: 'border-amber-200', dot: 'bg-amber-600' },
        'design': { bg: 'bg-purple-100', text: 'text-purple-800', border: 'border-purple-200', dot: 'bg-purple-600' },
        'site visit': { bg: 'bg-lime-100', text: 'text-lime-800', border: 'border-lime-200', dot: 'bg-lime-600' },
        'installation': { bg: 'bg-orange-100', text: 'text-orange-800', border: 'border-orange-200', dot: 'bg-orange-600' },
        'invoice': { bg: 'bg-pink-100', text: 'text-pink-800', border: 'border-pink-200', dot: 'bg-pink-600' },
        'procurement': { bg: 'bg-indigo-100', text: 'text-indigo-800', border: 'border-indigo-200', dot: 'bg-indigo-600' },
        'meeting': { bg: 'bg-blue-100', text: 'text-blue-800', border: 'border-blue-200', dot: 'bg-blue-600' },
        'service': { bg: 'bg-rose-100', text: 'text-rose-800', border: 'border-rose-200', dot: 'bg-rose-600' },
        'delivery': { bg: 'bg-cyan-100', text: 'text-cyan-800', border: 'border-cyan-200', dot: 'bg-cyan-600' },
    };

    if (specificMappings[lowerLabel]) {
        return specificMappings[lowerLabel];
    }

    // Simple hash function to get a deterministic index from the label string
    let hash = 0;
    for (let i = 0; i < label.length; i++) {
        hash = label.charCodeAt(i) + ((hash << 5) - hash);
    }

    // Ensure positive index
    const index = Math.abs(hash) % colors.length;

    return colors[index];
};
