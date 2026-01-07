const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const Project = require('../models/Project');
const Task = require('../models/Task');
const Attendance = require('../models/Attendance');
require('dotenv').config();

// Connect to database
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('🔗 MongoDB connected successfully');
  } catch (error) {
    console.error('❌ MongoDB connection error:', error);
    process.exit(1);
  }
};

// Clear existing data
const clearData = async () => {
  try {
    console.log('🧹 Clearing existing data...');
    await User.deleteMany({});
    await Project.deleteMany({});
    await Task.deleteMany({});
    await Attendance.deleteMany({});
    console.log('✅ Data cleared successfully');
  } catch (error) {
    console.error('❌ Error clearing data:', error);
  }
};

// Create users with different roles
const createUsers = async () => {
  try {
    console.log('👤 Creating users...');

    const users = [
      {
        username: 'admin',
        email: 'admin@thajira.com',
        password: 'admin123',
        fullName: 'Admin User',
        role: 'admin',
        phone: '9876543210',
        department: 'management'
      },
      {
        username: 'manager',
        email: 'manager@thajira.com',
        password: 'manager123',
        fullName: 'Project Manager',
        role: 'manager',
        phone: '9876543211',
        department: 'management'
      },
      {
        username: 'staff1',
        email: 'staff1@thajira.com',
        password: 'staff123',
        fullName: 'Construction Worker 1',
        role: 'staff',
        phone: '9876543212',
        department: 'construction'
      },
      {
        username: 'staff2',
        email: 'staff2@thajira.com',
        password: 'staff123',
        fullName: 'Construction Worker 2',
        role: 'staff',
        phone: '9876543213',
        department: 'construction'
      },
      {
        username: 'staff3',
        email: 'staff3@thajira.com',
        password: 'staff123',
        fullName: 'Design Engineer',
        role: 'staff',
        phone: '9876543214',
        department: 'design'
      }
    ];

    const createdUsers = [];
    for (const userData of users) {
      const hashedPassword = await bcrypt.hash(userData.password, 10);
      const user = new User({
        ...userData,
        password: hashedPassword
      });
      await user.save();
      createdUsers.push(user);
      console.log(`✅ Created user: ${user.username} (${user.role})`);
    }

    return createdUsers;
  } catch (error) {
    console.error('❌ Error creating users:', error);
    return [];
  }
};

// Create projects
const createProjects = async (users) => {
  try {
    console.log('🏗️ Creating projects...');

    const admin = users.find(u => u.role === 'admin');
    const manager = users.find(u => u.role === 'manager');
    const staff1 = users.find(u => u.username === 'staff1');
    const staff2 = users.find(u => u.username === 'staff2');
    const staff3 = users.find(u => u.username === 'staff3');

    const projects = [
      {
        projectName: 'Highway Construction Project',
        projectType: 'structural',
        description: 'Major highway construction with 4 lanes and bridges',
        clientName: 'Karnataka Highway Authority',
        clientEmail: 'kha@karnataka.gov.in',
        clientPhone: '9876543210',
        startDate: new Date('2025-01-15'),
        endDate: new Date('2025-12-31'),
        status: 'in-progress',
        budget: 50000000,
        location: 'Bangalore Outer Ring Road',
        manager: manager._id,
        teamMembers: [staff1._id, staff2._id],
        createdBy: admin._id
      },
      {
        projectName: 'Commercial Complex Development',
        projectType: 'commercial-building',
        description: 'Multi-story commercial complex with retail and office spaces',
        clientName: 'Whitefield Developers Ltd',
        clientEmail: 'info@whitefielddev.com',
        clientPhone: '9876543211',
        startDate: new Date('2025-02-01'),
        endDate: new Date('2025-11-30'),
        status: 'planning',
        budget: 25000000,
        location: 'Whitefield, Bangalore',
        manager: manager._id,
        teamMembers: [staff3._id],
        createdBy: admin._id
      },
      {
        projectName: 'Residential Township',
        projectType: 'other',
        description: 'Gated community with 500 apartments and amenities',
        clientName: 'Sarjapur Housing Corp',
        clientEmail: 'contact@sarjapurhousing.com',
        clientPhone: '9876543212',
        startDate: new Date('2025-03-01'),
        endDate: new Date('2026-02-28'),
        status: 'planning',
        budget: 75000000,
        location: 'Sarjapur Road, Bangalore',
        manager: manager._id,
        teamMembers: [staff1._id, staff2._id, staff3._id],
        createdBy: admin._id
      }
    ];

    const createdProjects = [];
    for (const projectData of projects) {
      const project = new Project(projectData);
      await project.save();
      createdProjects.push(project);
      console.log(`✅ Created project: ${project.name}`);
    }

    return createdProjects;
  } catch (error) {
    console.error('❌ Error creating projects:', error);
    return [];
  }
};

// Create tasks
const createTasks = async (users, projects) => {
  try {
    console.log('📋 Creating tasks...');

    const admin = users.find(u => u.role === 'admin');
    const manager = users.find(u => u.role === 'manager');
    const staff1 = users.find(u => u.username === 'staff1');
    const staff2 = users.find(u => u.username === 'staff2');
    const staff3 = users.find(u => u.username === 'staff3');

    const highwayProject = projects.find(p => p.projectName.includes('Highway'));
    const commercialProject = projects.find(p => p.projectName.includes('Commercial'));
    const residentialProject = projects.find(p => p.projectName.includes('Residential'));

    const tasks = [
      // Highway Project Tasks
      {
        title: 'Site Preparation',
        description: 'Clear and level the construction site',
        project: highwayProject._id,
        assignedTo: staff1._id,
        createdBy: manager._id,
        deadline: new Date('2025-02-15'),
        status: 'in-progress',
        priority: 'high',
        category: 'construction'
      },
      {
        title: 'Foundation Work',
        description: 'Lay foundation for highway bridges',
        project: highwayProject._id,
        assignedTo: staff2._id,
        createdBy: manager._id,
        deadline: new Date('2025-03-30'),
        status: 'todo',
        priority: 'high',
        category: 'construction'
      },
      {
        title: 'Road Paving',
        description: 'Asphalt paving for main highway',
        project: highwayProject._id,
        assignedTo: staff1._id,
        createdBy: manager._id,
        deadline: new Date('2025-05-15'),
        status: 'todo',
        priority: 'medium',
        category: 'construction'
      },

      // Commercial Project Tasks
      {
        title: 'Architectural Design',
        description: 'Finalize building design and layouts',
        project: commercialProject._id,
        assignedTo: staff3._id,
        createdBy: manager._id,
        deadline: new Date('2025-02-28'),
        status: 'in-progress',
        priority: 'high',
        category: 'design'
      },
      {
        title: 'Structural Engineering',
        description: 'Complete structural calculations',
        project: commercialProject._id,
        assignedTo: staff3._id,
        createdBy: manager._id,
        deadline: new Date('2025-03-15'),
        status: 'todo',
        priority: 'high',
        category: 'design'
      },

      // Residential Project Tasks
      {
        title: 'Site Survey',
        description: 'Conduct geotechnical survey',
        project: residentialProject._id,
        assignedTo: staff1._id,
        createdBy: manager._id,
        deadline: new Date('2025-03-10'),
        status: 'todo',
        priority: 'medium',
        category: 'planning'
      },
      {
        title: 'Permit Acquisition',
        description: 'Obtain construction permits',
        project: residentialProject._id,
        assignedTo: manager._id,
        createdBy: admin._id,
        deadline: new Date('2025-03-20'),
        status: 'todo',
        priority: 'high',
        category: 'management'
      }
    ];

    const createdTasks = [];
    for (const taskData of tasks) {
      const task = new Task(taskData);
      await task.save();
      createdTasks.push(task);
      console.log(`✅ Created task: ${task.title} (${task.status})`);
    }

    return createdTasks;
  } catch (error) {
    console.error('❌ Error creating tasks:', error);
    return [];
  }
};

// Create attendance records
const createAttendance = async (users) => {
  try {
    console.log('📅 Creating attendance records...');

    const staff1 = users.find(u => u.username === 'staff1');
    const staff2 = users.find(u => u.username === 'staff2');
    const staff3 = users.find(u => u.username === 'staff3');

    // Create attendance records for the past 7 days
    const today = new Date();
    const attendanceRecords = [];

    for (let i = 0; i < 7; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() - i);

      // Staff 1 - mostly present
      if (i !== 3) { // absent on day 3
        attendanceRecords.push({
          user: staff1._id,
          date: new Date(date),
          status: 'present',
          checkInTime: new Date(new Date(date).setHours(9, 0, 0, 0)),
          checkOutTime: new Date(new Date(date).setHours(17, 30, 0, 0)),
          location: {
            type: 'Point',
            coordinates: [77.6033, 12.9716] // Bangalore coordinates
          }
        });
      }

      // Staff 2 - one late day
      attendanceRecords.push({
        user: staff2._id,
        date: new Date(date),
        status: i === 2 ? 'late' : 'present',
        checkInTime: new Date(new Date(date).setHours(i === 2 ? 10 : 9, i === 2 ? 30 : 0, 0, 0)),
        checkOutTime: new Date(new Date(date).setHours(17, 30, 0, 0)),
        location: {
          type: 'Point',
          coordinates: [77.6033, 12.9716] // Bangalore coordinates
        }
      });

      // Staff 3 - office worker
      attendanceRecords.push({
        user: staff3._id,
        date: new Date(date),
        status: 'present',
        checkInTime: new Date(new Date(date).setHours(8, 30, 0, 0)),
        checkOutTime: new Date(new Date(date).setHours(17, 0, 0, 0)),
        location: {
          type: 'Point',
          coordinates: [77.6033, 12.9716] // Bangalore coordinates
        }
      });
    }

    for (const record of attendanceRecords) {
      const attendance = new Attendance(record);
      await attendance.save();
    }

    console.log(`✅ Created ${attendanceRecords.length} attendance records`);
    return attendanceRecords;
  } catch (error) {
    console.error('❌ Error creating attendance:', error);
    return [];
  }
};

// Main function
const main = async () => {
  await connectDB();
  await clearData();

  console.log('\n🌱 Seeding database with realistic data...\n');

  const users = await createUsers();
  const projects = await createProjects(users);
  const tasks = await createTasks(users, projects);
  await createAttendance(users);

  console.log('\n🎉 Database seeding completed successfully!');
  console.log('📊 Summary:');
  console.log(`   - Users: ${users.length}`);
  console.log(`   - Projects: ${projects.length}`);
  console.log(`   - Tasks: ${tasks.length}`);
  console.log(`   - Attendance Records: 21 (7 days × 3 staff)`);

  console.log('\n🔑 Test Credentials:');
  console.log('   - Admin: admin/admin123');
  console.log('   - Manager: manager/manager123');
  console.log('   - Staff: staff1/staff123, staff2/staff123, staff3/staff123');

  process.exit(0);
};

main();
