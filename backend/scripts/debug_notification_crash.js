const inAppChannel = require('../services/notification/channels/inAppChannel');
const mongoose = require('mongoose');
const Notification = require('../models/Notification');
require('dotenv').config();

const run = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to DB');

        const dummyUser = { _id: new mongoose.Types.ObjectId() };
        const badPayload = { type: 'USER_CREATED' }; // Missing entityId, etc.

        console.log('Attempting to send bad notification...');
        const result = await inAppChannel.send(dummyUser, badPayload, null);
        console.log('Result:', result);

        console.log('Process did not crash.');
        process.exit(0);
    } catch (error) {
        console.error('Top level caught error:', error);
        process.exit(1);
    }
};

run();
