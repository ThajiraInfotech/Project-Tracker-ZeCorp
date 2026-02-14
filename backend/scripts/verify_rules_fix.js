const { getRuleForEvent } = require('../services/notification/rulesEngine');

const rule = getRuleForEvent('USER_CREATED');
console.log('Channels:', rule.channels);

if (rule.channels.includes('IN_APP')) {
    console.error('FAIL: IN_APP still present');
    process.exit(1);
} else {
    console.log('PASS: IN_APP removed');
    process.exit(0);
}
