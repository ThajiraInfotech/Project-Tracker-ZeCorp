const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('./backend/models/User');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

const setupAdminUser = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Check if admin user already exists
    const existingAdmin = await User.findOne({ username: 'admin' });
    if (existingAdmin) {
      console.log('⚠️  Admin user already exists, updating role to admin');
      existingAdmin.role = 'admin';
      existingAdmin.isActive = true;
      await existingAdmin.save();
      console.log('✅ Admin user updated successfully');
    } else {
      // Create admin user
      const adminUser = new User({
        username: 'admin',
        email: 'admin@thajira.com',
        password: 'admin123', // This will be hashed automatically
        fullName: 'Admin User',
        role: 'admin',
        phone: '1234567890',
        department: 'management',
        isActive: true
      });

      await adminUser.save();
      console.log('✅ Admin user created successfully');
    }

    // Create manager user
    const managerUser = new User({
      username: 'manager',
      email: 'manager@thajira.com',
      password: 'manager123',
      fullName: 'Manager User',
      role: 'manager',
      phone: '1234567891',
      department: 'management',
      isActive: true
    });

    await managerUser.save();
    console.log('✅ Manager user created successfully');

    // Create staff user
    const staffUser = new User({
      username: 'staff',
      email: 'staff@thajira.com',
      password: 'staff123',
      fullName: 'Staff User',
      role: 'staff',
      phone: '1234567892',
      department: 'construction',
      isActive: true
    });

    await staffUser.save();
    console.log('✅ Staff user created successfully');

    console.log('🎉 All test users created successfully!');
    console.log('You can now login with:');
    console.log('- Admin: admin/admin123');
    console.log('- Manager: manager/manager123');
    console.log('- Staff: staff/staff123');

  } catch (error) {
    console.error('❌ Error creating users:', error.message);
    if (error.code === 11000) {
      console.log('⚠️  Users may already exist');
    }
  } finally {
    // Close the connection
    await mongoose.connection.close();
    console.log('🔌 MongoDB connection closed');
    process.exit();
  }
};

// Run the setup
setupAdminUser();