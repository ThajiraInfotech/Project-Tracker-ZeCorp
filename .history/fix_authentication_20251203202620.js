const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('./backend/models/User');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

const fixAuthentication = async () => {
  try {
    console.log('🔧 Starting authentication fix...');

    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Hash the passwords properly
    const adminPassword = await bcrypt.hash('admin123', 10);
    const managerPassword = await bcrypt.hash('manager123', 10);
    const staffPassword = await bcrypt.hash('staff123', 10);

    console.log('✅ Passwords hashed successfully');

    // Update or create admin user
    const adminUser = await User.findOneAndUpdate(
      { username: 'admin' },
      {
        username: 'admin',
        email: 'admin@thajira.com',
        password: adminPassword,
        fullName: 'Admin User',
        role: 'admin',
        phone: '1234567890',
        department: 'management',
        isActive: true
      },
      { upsert: true, new: true }
    );

    console.log('✅ Admin user updated/created:', adminUser.username);

    // Update or create manager user
    const managerUser = await User.findOneAndUpdate(
      { username: 'manager' },
      {
        username: 'manager',
        email: 'manager@thajira.com',
        password: managerPassword,
        fullName: 'Manager User',
        role: 'manager',
        phone: '1234567891',
        department: 'management',
        isActive: true
      },
      { upsert: true, new: true }
    );

    console.log('✅ Manager user updated/created:', managerUser.username);

    // Update or create staff user
    const staffUser = await User.findOneAndUpdate(
      { username: 'staff' },
      {
        username: 'staff',
        email: 'staff@thajira.com',
        password: staffPassword,
        fullName: 'Staff User',
        role: 'staff',
        phone: '1234567892',
        department: 'construction',
        isActive: true
      },
      { upsert: true, new: true }
    );

    console.log('✅ Staff user updated/created:', staffUser.username);

    // Verify users can be found
    const allUsers = await User.find();
    console.log(`🎉 Total users in database: ${allUsers.length}`);

    console.log('\n📋 Login Credentials:');
    console.log('👑 Admin: admin/admin123');
    console.log('👨‍💼 Manager: manager/manager123');
    console.log('👷 Staff: staff/staff123');

    console.log('\n✅ Authentication fix completed successfully!');

  } catch (error) {
    console.error('❌ Error fixing authentication:', error.message);
    if (error.code === 11000) {
      console.log('⚠️ Duplicate key error - users may already exist with different emails');
    }
  } finally {
    // Close the connection
    await mongoose.connection.close();
    console.log('🔌 MongoDB connection closed');
    process.exit();
  }
};

// Run the fix
fixAuthentication();