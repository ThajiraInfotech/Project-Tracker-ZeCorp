const mongoose = require('mongoose');
require('dotenv').config({ path: '../.env' });

const dropIndexes = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB');

        const db = mongoose.connection.db;

        // 1. Drop index from attendances (Office)
        try {
            const attendanceIndexes = await db.collection('attendances').indexes();
            const uniqueIndex = attendanceIndexes.find(idx => idx.name === 'userId_1_date_1' || (idx.key.userId === 1 && idx.key.date === 1));

            if (uniqueIndex) {
                await db.collection('attendances').dropIndex(uniqueIndex.name);
                console.log('Dropped unique index from attendances:', uniqueIndex.name);
            } else {
                console.log('No unique index found on attendances');
            }
        } catch (err) {
            console.log('Error checking/dropping attendances index (might not exist):', err.message);
        }

        // 2. Drop index from siteattendances (Site)
        try {
            const siteIndexes = await db.collection('siteattendances').indexes();
            const uniqueSiteIndex = siteIndexes.find(idx => idx.name === 'userId_1_date_1' || (idx.key.userId === 1 && idx.key.date === 1));

            if (uniqueSiteIndex) {
                await db.collection('siteattendances').dropIndex(uniqueSiteIndex.name);
                console.log('Dropped unique index from siteattendances:', uniqueSiteIndex.name);
            } else {
                console.log('No unique index found on siteattendances');
            }
        } catch (err) {
            console.log('Error checking/dropping siteattendances index (might not exist):', err.message);
        }

        console.log('Done.');
        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
};

dropIndexes();
