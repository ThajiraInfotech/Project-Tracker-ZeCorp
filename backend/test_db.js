require('dotenv').config();
const mongoose = require('mongoose');
const Notification = require('./models/Notification');

async function test() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    const count = await Notification.countDocuments({ type: 'TASK_COMMENT_ADDED' });
    console.log(`There are ${count} TASK_COMMENT_ADDED notifications in the database.`);
    const latest = await Notification.findOne({ type: 'TASK_COMMENT_ADDED' }).sort({ createdAt: -1 });
    console.log('Latest:', latest);
    process.exit(0);
  } catch (err) {
    console.error('Error:', err);
    process.exit(1);
  }
}

test();
