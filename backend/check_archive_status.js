const mongoose = require('mongoose');
require('dotenv').config();
const Task = require('./models/Task');
const Project = require('./models/Project');

const checkData = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB');

        const completedTasks = await Task.countDocuments({ status: 'completed' });
        const archivedTasks = await Task.countDocuments({ status: 'completed', isArchived: true });

        console.log(`Total Completed Tasks: ${completedTasks}`);
        console.log(`Archived Completed Tasks: ${archivedTasks}`);
        console.log(`Unarchived Completed Tasks: ${completedTasks - archivedTasks}`);

        const completedProjects = await Project.countDocuments({ status: 'completed' });
        const archivedProjects = await Project.countDocuments({ status: 'completed', isArchived: true });

        console.log(`Total Completed Projects: ${completedProjects}`);
        console.log(`Archived Completed Projects: ${archivedProjects}`);
        console.log(`Unarchived Completed Projects: ${completedProjects - archivedProjects}`);

        if (completedTasks > archivedTasks || completedProjects > archivedProjects) {
            console.log('\nMISMATCH DETECTED: Existing completed items are not marked as archived.');
        }

        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
};

checkData();
