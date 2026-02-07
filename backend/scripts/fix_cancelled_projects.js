const mongoose = require('mongoose');
const Project = require('../models/Project');
const Task = require('../models/Task');
const { updateProjectProgressAndStatus } = require('../utils/projectProgressUtils');
require('dotenv').config();

const MONGO_URI = process.env.MONGODB_URI || process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/zeecorp-tracker';

async function fixCancelledProjects() {
    try {
        await mongoose.connect(MONGO_URI);
        console.log('Connected to MongoDB');

        // Find all projects with status 'cancelled'
        const cancelledProjects = await Project.find({ status: 'cancelled' });
        console.log(`Found ${cancelledProjects.length} cancelled projects.`);

        for (const project of cancelledProjects) {
            console.log(`Processing project: ${project.projectName} (${project._id})`);

            // Re-run the status derivation logic (which now excludes automatic cancellation)
            await updateProjectProgressAndStatus(project._id);

            const updatedProject = await Project.findById(project._id);
            console.log(`  -> New Status: ${updatedProject.status}`);
        }

        console.log('Finished fixing cancelled projects.');
    } catch (error) {
        console.error('Error:', error);
    } finally {
        await mongoose.disconnect();
        console.log('Disconnected from MongoDB');
        process.exit(0);
    }
}

fixCancelledProjects();
