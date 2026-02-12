const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');
const Project = require('../models/Project');
const Task = require('../models/Task');
const User = require('../models/User');

// Load env vars
dotenv.config({ path: path.join(__dirname, '../.env') });

const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('MongoDB Connected');
    } catch (err) {
        console.error('Failed to connect to MongoDB:', err);
        process.exit(1);
    }
};

const debugDashboard = async () => {
    await connectDB();

    const now = new Date();
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    console.log(`\n--- Debug Report (${now.toISOString()}) ---`);
    console.log(`--- Start of Today (${startOfToday.toISOString()}) ---`);

    // 1. Delayed Projects
    // Logic from controller (UPDATED):
    // p.status === 'on-hold' || p.status === 'delayed' || (p.endDate && new Date(p.endDate) < startOfToday && p.status !== 'completed')

    const projects = await Project.find();

    const delayedProjects = projects.filter(p =>
        p.status === 'on-hold' ||
        p.status === 'delayed' ||
        (p.endDate && new Date(p.endDate) < startOfToday && p.status !== 'completed')
    );

    console.log(`\n1. DELAYED PROJECTS (Count: ${delayedProjects.length})`);
    delayedProjects.forEach(p => {
        console.log(` - [${p.status.toUpperCase()}] "${p.projectName}" (Due: ${p.endDate ? p.endDate.toISOString().split('T')[0] : 'N/A'})`);
    });

    // 2. At-Risk Projects
    // Logic from controller (UPDATED):
    // p.status !== 'completed' ... && new Date(p.endDate) >= startOfToday && new Date(p.endDate) <= nextWeek

    const nextWeek = new Date(startOfToday);
    nextWeek.setDate(startOfToday.getDate() + 7);

    const atRiskProjects = projects.filter(p =>
        p.status !== 'completed' &&
        p.status !== 'on-hold' &&
        p.status !== 'delayed' &&
        p.endDate &&
        new Date(p.endDate) >= startOfToday &&
        new Date(p.endDate) <= nextWeek
    );

    console.log(`\n2. AT-RISK PROJECTS (Count: ${atRiskProjects.length})`);
    atRiskProjects.forEach(p => {
        console.log(` - [${p.status.toUpperCase()}] "${p.projectName}" (Due: ${p.endDate ? p.endDate.toISOString().split('T')[0] : 'N/A'})`);
    });

    // 3. Overdue Tasks
    // Logic from controller (UPDATED):
    // t.deadline && new Date(t.deadline) < startOfToday && status !== 'completed'

    // Fetch all tasks first to match controller logic which fetches then filters
    const tasks = await Task.find({ status: { $ne: 'completed' } }).populate('project', 'projectName');

    const overdueTasks = tasks.filter(t => t.deadline && new Date(t.deadline) < startOfToday);

    console.log(`\n3. OVERDUE TASKS (Count: ${overdueTasks.length})`);
    overdueTasks.forEach(t => {
        console.log(` - [${t.status.toUpperCase()}] "${t.title}" (Project: ${t.project ? t.project.projectName : 'Unknown'}) (Due: ${t.deadline ? t.deadline.toISOString().split('T')[0] : 'N/A'})`);
    });

    console.log('\n--- End of Report ---');
    process.exit(0);
};

debugDashboard();
