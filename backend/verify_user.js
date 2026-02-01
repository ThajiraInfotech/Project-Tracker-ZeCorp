const mongoose = require('mongoose');
const User = require('./models/User');
require('dotenv').config();

const verifyUser = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('MongoDB Connected');

        const user = await User.findOne({
            $or: [{ username: { $regex: 'Risvi', $options: 'i' } }, { fullName: { $regex: 'Risvi', $options: 'i' } }]
        }).select('+phone +salaryPerHour');

        if (user) {
            console.log('User Found:', user.username);
            console.log('Phone:', user.phone);
            console.log('Salary:', user.salaryPerHour);
        } else {
            console.log('User Risvi not found');
        }

        mongoose.disconnect();
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
};

verifyUser();
