const moment = require('moment-timezone');

const DUBAI_TIMEZONE = 'Asia/Dubai';

/**
 * Returns the current date in Dubai as a string (YYYY-MM-DD).
 * Use this to determine the "Attendance Date" or "Shift Date".
 * @returns {string} YYYY-MM-DD
 */
const getDubaiDate = () => {
    return moment().tz(DUBAI_TIMEZONE).format('YYYY-MM-DD');
};

/**
 * Returns the current moment object in Dubai timezone.
 * Use this for logic comparisons, retrieving current hour/minute in Dubai, etc.
 * @returns {moment.Moment}
 */
const getDubaiDateTime = () => {
    return moment().tz(DUBAI_TIMEZONE);
};

module.exports = {
    getDubaiDate,
    getDubaiDateTime,
    DUBAI_TIMEZONE
};
