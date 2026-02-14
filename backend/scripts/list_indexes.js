const mongoose = require('mongoose');
require('dotenv').config({ path: '../.env' });

const listIndexes = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB');

        const db = mongoose.connection.db;
        const indexes = await db.collection('attendances').indexes();
        console.log('Indexes on attendances:', JSON.stringify(indexes, null, 2));

        const siteIndexes = await db.collection('siteattendances').indexes();
        console.log('Indexes on siteattendances:', JSON.stringify(siteIndexes, null, 2));

        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
};

listIndexes();
