/**
 * Formats a given date string or object to Dubai Time (Time only).
 * @param {string|Date} date - The date to format.
 * @returns {string} - Formatted time (e.g., "09:30 AM")
 */
export const formatTimeDubai = (date) => {
    if (!date) return '-';
    return new Date(date).toLocaleTimeString('en-US', {
        timeZone: 'Asia/Dubai',
        hour: '2-digit',
        minute: '2-digit'
    });
};

export const formatDateDubai = (date) => {
    if (!date) return '-';
    return new Date(date).toLocaleDateString('en-US', {
        timeZone: 'Asia/Dubai',
        month: 'short',
        day: 'numeric',
        year: 'numeric'
    });
};

/**
 * Formats a given date string or object to Dubai Time (Date and Time).
 * @param {string|Date} date - The date to format.
 * @returns {string} - Formatted date and time (e.g., "Feb 4, 2026, 09:30 AM")
 */
export const formatDateTimeDubai = (date) => {
    if (!date) return '-';
    return new Date(date).toLocaleString('en-US', {
        timeZone: 'Asia/Dubai',
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
};

/**
 * Returns the current Dubai date in YYYY-MM-DD format (matches backend logic).
 * Use this to fetch "Today's" record.
 * @returns {string}
 */
export const getDubaiToday = () => {
    // Create a formatter for Dubai timezone
    const formatter = new Intl.DateTimeFormat('en-CA', { // en-CA gives YYYY-MM-DD
        timeZone: 'Asia/Dubai',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
    });
    return formatter.format(new Date());
};

/**
     * Returns the current date object initialized to now.
     * Use this for "Live" clocks.
     * Note: You must still use .toLocaleTimeString('en-US', { timeZone: 'Asia/Dubai' }) when displaying it.
     */
export const getDubaiNow = () => {
    return new Date();
};

/**
 * Formats a date to dd/mm/yyyy format
 * @param {string|Date} date 
 * @returns {string}
 */
export const formatDateDDMMYYYY = (date) => {
    if (!date) return '';
    const d = new Date(date);
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0'); // Months are 0-indexed
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
};
