const mongoose = require('mongoose');
const Project = require('../models/Project');
require('dotenv').config();

const MONGO_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/zeecorp-tracker';

async function listProjectStatuses() {
    try {
        await mongoose.connect(MONGO_URI);
        console.log('Connected to MongoDB');

        const projects = await Project.find({}, 'projectName status');
        console.log(`Found ${projects.length} projects.`);
        projects.forEach(p => {
            console.log(`Project: "${p.projectName}" - Status: "${p.status}"`);
        });

        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}

listProjectStatuses();
