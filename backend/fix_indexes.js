const mongoose = require('mongoose');
const Attendance = require('./models/Attendance');
require('dotenv').config();

const fixIndexes = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB');

        const indexes = await Attendance.collection.indexes();
        console.log('Current Indexes:', indexes);

        // Look for the problematic index
        const badIndex = indexes.find(idx => idx.name === 'user_1_date_1');
        if (badIndex) {
            console.log('Found problematic index: user_1_date_1. Dropping it...');
            await Attendance.collection.dropIndex('user_1_date_1');
            console.log('Dropped index: user_1_date_1');
        } else {
            console.log('Index user_1_date_1 not found.');
        }

        // Ensure correct index exists
        // The schema defines: { userId: 1, date: 1 }
        // Mongoose usually names this userId_1_date_1
        console.log('Syncing indexes...');
        await Attendance.syncIndexes();
        console.log('Indexes synced successfully.');

        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
};

fixIndexes();
