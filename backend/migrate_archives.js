const mongoose = require('mongoose');
require('dotenv').config();
const Task = require('./models/Task');
const Project = require('./models/Project');

const migrateData = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB');

        // Update Tasks
        const taskResult = await Task.updateMany(
            { status: 'completed', isArchived: { $ne: true } },
            {
                $set: {
                    isArchived: true,
                    archivedAt: new Date()
                }
            }
        );
        console.log(`Updated ${taskResult.modifiedCount} tasks to archived status.`);

        // Update Projects
        const projectResult = await Project.updateMany(
            { status: 'completed', isArchived: { $ne: true } },
            {
                $set: {
                    isArchived: true,
                    archivedAt: new Date()
                }
            }
        );
        console.log(`Updated ${projectResult.modifiedCount} projects to archived status.`);

        process.exit(0);
    } catch (error) {
        console.error('Migration Error:', error);
        process.exit(1);
    }
};

migrateData();
