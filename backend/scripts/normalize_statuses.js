const mongoose = require('mongoose');
const Project = require('../models/Project');
const Task = require('../models/Task');
const { updateProjectProgressAndStatus } = require('../utils/projectProgressUtils');
require('dotenv').config();

const MONGO_URI = process.env.MONGODB_URI || process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/zeecorp-tracker';

async function normalizeProjectStatuses() {
    try {
        await mongoose.connect(MONGO_URI);
        console.log('Connected to MongoDB');

        const projects = await Project.find({});
        console.log(`Found ${projects.length} projects to normalize.`);

        for (const project of projects) {
            // We force update every project to ensure it aligns with the new binary logic
            await updateProjectProgressAndStatus(project._id);

            const updated = await Project.findById(project._id);
            console.log(`Project: ${project.projectName} -> ${updated.status}`);
        }

        console.log('Finished normalizing project statuses.');
    } catch (error) {
        console.error('Error:', error);
    } finally {
        await mongoose.disconnect();
        console.log('Disconnected from MongoDB');
        process.exit(0);
    }
}

normalizeProjectStatuses();
