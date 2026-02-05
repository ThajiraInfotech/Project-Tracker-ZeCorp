const mongoose = require('mongoose');
const User = require('../models/User');
const dotenv = require('dotenv');

// Load env vars
dotenv.config();

const resetAdmin = async () => {
    try {
        console.log('🔌 Connecting to MongoDB...');
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Connected.');

        const admin = await User.findOne({ username: 'admin' });

        if (admin) {
            console.log('👤 Admin user found. Updating password...');
            admin.password = 'admin123'; // This will be hashed by the pre-save hook in User model
            await admin.save();
            console.log('✅ Admin password reset to: admin123');
        } else {
            console.log('⚠️ Admin user not found. Creating new admin...');
            const newAdmin = new User({
                username: 'admin',
                email: 'admin@thajira.com',
                password: 'admin123',
                fullName: 'Admin User',
                role: 'admin',
                department: 'management',
                isActive: true
            });
            await newAdmin.save();
            console.log('✅ Admin user created with password: admin123');
        }

    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        await mongoose.connection.close();
        process.exit();
    }
};

resetAdmin();
