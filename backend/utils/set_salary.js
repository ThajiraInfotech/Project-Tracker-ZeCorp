const mongoose = require('mongoose');
const User = require('../models/User');
require('dotenv').config({ path: '../.env' });

const username = process.argv[2];
const salary = Number(process.argv[3]);

if (!username || !salary) {
    console.log('Usage: node utils/set_salary.js <username> <salary>');
    process.exit(1);
}

mongoose.connect(process.env.MONGODB_URI)
    .then(async () => {
        console.log('Connected to DB');
        const user = await User.findOne({ username });
        if (!user) {
            console.log('User not found!');
            process.exit(1);
        }

        user.salaryPerHour = salary;
        await user.save();
        console.log(`✅ Updated ${username} salary to ${salary}/hr`);
        process.exit(0);
    })
    .catch(err => {
        console.error(err);
        process.exit(1);
    });
