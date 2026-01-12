const mongoose = require('mongoose');
const User = require('../models/User');
require('dotenv').config();

const verifyDepartmentOptional = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB');

        const testUsername = 'test_no_dept_' + Date.now();
        const testEmail = `test_${Date.now()}@example.com`;

        console.log('Attempting to create user without department...');
        const user = new User({
            username: testUsername,
            email: testEmail,
            password: 'password123',
            fullName: 'Test No Dept',
            role: 'staff',
            phone: '1234567890'
            // department is omitted
        });

        await user.save();
        console.log('User created successfully:', user._id);

        const savedUser = await User.findById(user._id);
        console.log('Retrieved User Department:', savedUser.department);

        if (!savedUser.department) {
            console.log('VERIFICATION SUCCESS: Department is undefined/null as expected.');
        } else {
            console.log('VERIFICATION FAILED: Department has a value:', savedUser.department);
        }

        // Cleanup
        await User.findByIdAndDelete(user._id);
        console.log('Test user deleted.');

        mongoose.disconnect();
    } catch (error) {
        console.error('Verification Error:', error);
        mongoose.disconnect();
    }
};

verifyDepartmentOptional();
