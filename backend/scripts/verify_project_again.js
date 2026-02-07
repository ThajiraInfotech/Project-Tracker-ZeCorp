const mongoose = require('mongoose');
const Project = require('../models/Project');
const Task = require('../models/Task');
const { updateProjectProgressAndStatus } = require('../utils/projectProgressUtils');
require('dotenv').config();

const MONGO_URI = process.env.MONGODB_URI || process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/zeecorp-tracker';
const PROJECT_ID = '6985c4dfbb144c425a9f2c18'; // delayed check

async function verifyProject() {
    try {
        await mongoose.connect(MONGO_URI);

        // Force update
        await updateProjectProgressAndStatus(PROJECT_ID);

        const project = await Project.findById(PROJECT_ID);
        console.log(`Project: ${project.projectName}, Status: ${project.status}, Progress: ${project.progress}%`);

        const tasks = await Task.find({ project: PROJECT_ID });
        console.log(`Tasks: ${tasks.length}`);
        tasks.forEach(t => console.log(` - ${t.title}: ${t.status} (${t.progress}%)`));

    } catch (error) {
        console.error(error);
    } finally {
        await mongoose.disconnect();
        process.exit(0);
    }
}

verifyProject();
