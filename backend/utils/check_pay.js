const mongoose = require('mongoose');
const User = require('../models/User');
const Attendance = require('../models/Attendance');
require('dotenv').config({ path: '../.env' });

const username = process.argv[2];

if (!username) {
    console.log('Usage: node utils/check_pay.js <username>');
    process.exit(1);
}

mongoose.connect(process.env.MONGODB_URI)
    .then(async () => {
        const user = await User.findOne({ username });
        if (!user) {
            console.log('User not found!');
            process.exit(1);
        }

        // Get latest attendance
        const attendance = await Attendance.findOne({ userId: user._id }).sort({ createdAt: -1 });

        if (!attendance) {
            console.log('No attendance found.');
        } else {
            console.log('\n📊 Latest Attendance Record:');
            console.log(`Date: ${attendance.date}`);
            console.log(`Check In: ${attendance.checkIn}`);
            console.log(`Check Out: ${attendance.checkOut}`);
            console.log('-------------------------------');
            console.log(`Regular Pay: $${attendance.dailyRegularPay}`);
            console.log(`Overtime Pay: $${attendance.dailyOvertimePay}`);
            console.log(`Total Pay:   $${attendance.dailyTotalPay}`);
            console.log('-------------------------------');
        }
        process.exit(0);
    })
    .catch(err => {
        console.error(err);
        process.exit(1);
    });
