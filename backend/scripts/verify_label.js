require('dotenv').config();
const mongoose = require('mongoose');
const Task = require('../models/Task');
const Project = require('../models/Project');
const User = require('../models/User');

const MONGO_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/zeecorp-tracker';

async function verifyLabels() {
    try {
        await mongoose.connect(MONGO_URI);
        console.log('Connected to MongoDB');

        // Create a dummy project if needed
        let project = await Project.findOne();
        if (!project) {
            console.log('No project found, creating dummy project...');
            project = await Project.create({
                projectName: 'Label Verification Project',
                status: 'in-progress'
            });
        }

        let user = await User.findOne();

        // Create Task with Label
        const taskData = {
            title: 'Verify Label Task',
            description: 'Testing label functionality',
            project: project._id,
            assignedTo: user ? user._id : new mongoose.Types.ObjectId(),
            createdBy: user ? user._id : new mongoose.Types.ObjectId(),
            deadline: new Date(),
            priority: 'medium',
            label: 'Design'
        };

        const task = await Task.create(taskData);
        console.log(`Task created with I: ${task._id}`);

        // Verify Label
        const fetchedTask = await Task.findById(task._id);
        console.log(`Initial Label: ${fetchedTask.label}`);
        if (fetchedTask.label !== 'Design') {
            throw new Error('Label not saved correctly!');
        }

        // Update Label
        fetchedTask.label = 'Installation';
        await fetchedTask.save();

        // Verify label update in DB
        const updatedTask = await Task.findById(task._id);
        if (updatedTask.label === 'Installation') {
            console.log('✅ Label updated successfully in DB');
        } else {
            console.error('❌ Label update failed in DB:', updatedTask.label);
            throw new Error('Label update failed!');
        }

        // 4. Test Filtering by Label
        console.log('\nTesting Label Filtering...');
        // Create another task with a different label to test filtering
        const task2 = new Task({
            title: 'Test Task for Filtering',
            description: 'This task should be filtered out when searching for "Installation"',
            project: task.project,
            assignedTo: task.assignedTo,
            createdBy: task.createdBy,
            deadline: new Date(),
            priority: 'medium',
            label: 'Design'
        });
        await task2.save();
        console.log('Created second task with label: Design');

        // Fetch tasks with label 'Installation'
        // simulating query logic
        const filteredTasks = await Task.find({ label: 'Installation' });
        const match = filteredTasks.find(t => t._id.toString() === task._id.toString());
        const noMatch = filteredTasks.find(t => t._id.toString() === task2._id.toString());

        if (match && !noMatch) {
            console.log('✅ Filtering logic verified: Found "Installation" task and excluded "Design" task.');
        } else {
            console.error('❌ Filtering logic failed.');
            if (!match) console.error('  - Did not find the "Installation" task.');
            if (noMatch) console.error('  - Found the "Design" task (should be excluded).');
            throw new Error('Label filtering failed!');
        }

        // Clean up
        console.log('\nCleaning up...');
        await Task.deleteMany({ _id: { $in: [task._id, task2._id] } });
        console.log('Test tasks deleted.');

        console.log('\n🎉 Verification script completed successfully!');
        // process.exit(0); // Removed process.exit to allow finally block to run
    } catch (error) {
        console.error('❌ Error in verification script:', error);
        // process.exit(1); // Removed process.exit to allow finally block to run
    } finally {
        await mongoose.disconnect();
    }
}

verifyLabels();
