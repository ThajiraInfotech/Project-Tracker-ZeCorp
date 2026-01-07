const User = require('../models/User');
const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');
require('dotenv').config();

// Connect to database
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('MongoDB connected successfully');
  } catch (error) {
    console.error('MongoDB connection error:', error);
    process.exit(1);
  }
};

// Test user creation
const createTestUser = async () => {
  try {
    // Check if test user already exists
    const existingUser = await User.findOne({ username: 'testuser' });
    if (existingUser) {
      console.log('Test user already exists:', existingUser.username);
      return;
    }

    // Create test user
    const password = 'password123';
    const hashedPassword = await bcrypt.hash(password, 10);

    const testUser = new User({
      username: 'testuser',
      email: 'test@example.com',
      password: hashedPassword,
      fullName: 'Test User',
      role: 'staff'
    });

    await testUser.save();
    console.log('Test user created successfully:', testUser.username);
    console.log('Password:', password);
  } catch (error) {
    console.error('Error creating test user:', error);
  }
};

// Test password comparison
const testPasswordComparison = async () => {
  try {
    const user = await User.findOne({ username: 'testuser' }).select('+password');
    if (!user) {
      console.log('Test user not found');
      return;
    }

    const isMatch = await user.comparePassword('password123');
    console.log('Password comparison test:', isMatch ? 'SUCCESS' : 'FAILED');
  } catch (error) {
    console.error('Error testing password comparison:', error);
  }
};

// Main function
const main = async () => {
  await connectDB();
  await createTestUser();
  await testPasswordComparison();
  process.exit(0);
};

main();