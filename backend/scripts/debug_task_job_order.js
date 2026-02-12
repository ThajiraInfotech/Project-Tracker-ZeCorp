const mongoose = require('mongoose');
const Task = require('../models/Task');
const Project = require('../models/Project');
const User = require('../models/User'); // Required for population
require('dotenv').config({ path: './.env' }); // Adjusted path assuming running from backend root

const debugTaskApi = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('MongoDB connected');

        // Simulate the query from taskController.getAllTasks
        // const query = {}; // No filters for now

        const tasks = await Task.find({})
            .populate({
                path: 'project',
                select: 'projectName projectType manager jobOrder',
                populate: {
                    path: 'manager',
                    select: 'username fullName email'
                }
            })
            .populate('assignedTo', 'username fullName email')
            .sort({ deadline: 1 })
            .limit(5); // Just get 5 tasks

        console.log('--- Tasks Debug Output ---');
        tasks.forEach(task => {
            console.log(`Task: ${task.title}`);
            if (task.project) {
                console.log(`  Project: ${task.project.projectName}`);
                console.log(`  Job Order: ${task.project.jobOrder} (Type: ${typeof task.project.jobOrder})`);
            } else {
                console.log('  Project: NULL');
            }
        });

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await mongoose.connection.close();
        console.log('MongoDB connection closed');
    }
};

debugTaskApi();
