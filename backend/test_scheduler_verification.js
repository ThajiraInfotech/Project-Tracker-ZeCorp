require('dotenv').config();
const mongoose = require('mongoose');
const Task = require('./models/Task');
const User = require('./models/User');
const { publishEvent } = require('./infrastructure/queue');

// Mock Queue if Redis is not reachable just for this test? 
// No, we want to test real integration.

const runTest = async () => {
    try {
        console.log('Connecting to MongoDB...');
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected.');

        // 1. Find or Create Test User
        const testEmail = 'arshadhahamed777@gmail.com';
        let user = await User.findOne({ email: testEmail });
        if (!user) {
            console.log('User not found, finding any admin...');
            user = await User.findOne({ role: 'admin' });
        }
        if (!user) {
            console.error('No user found to assign tasks to. Please create a user first.');
            process.exit(1);
        }
        console.log(`Assigning test tasks to: ${user.username} (${user._id})`);

        // 2. Setup Dates
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const matchDueSoon = new Date(today);
        matchDueSoon.setDate(today.getDate() + 3); // +3 days

        const matchOverdue = new Date(today);
        matchOverdue.setDate(today.getDate() - 1); // -1 day

        // 3. Create Test Tasks
        console.log('Creating 3 dummy tasks...');

        // Task 1: Due Soon (3 days)
        const t1 = await Task.create({
            title: 'TEST TASK - DUE SOON',
            description: 'Automated test task',
            deadline: matchDueSoon,
            status: 'pending',
            assignedTo: user._id,
            project: null, // Optional
            priority: 'medium'
        });

        // Task 2: Due Today
        const t2 = await Task.create({
            title: 'TEST TASK - DUE TODAY',
            description: 'Automated test task',
            deadline: today,
            status: 'pending',
            assignedTo: user._id,
            priority: 'high'
        });

        // Task 3: Overdue
        const t3 = await Task.create({
            title: 'TEST TASK - OVERDUE',
            description: 'Automated test task',
            deadline: matchOverdue,
            status: 'pending',
            assignedTo: user._id,
            priority: 'critical'
        });

        console.log('Tasks created. IDs:', t1._id, t2._id, t3._id);

        // 4. Run Scheduler Logic (Copied from scheduler.js)
        console.log('--- executing scheduler logic ---');

        // Logic 1: Due Soon
        const dueSoonQuery = {
            deadline: {
                $gte: matchDueSoon,
                $lt: new Date(matchDueSoon.getTime() + 24 * 60 * 60 * 1000)
            },
            status: { $ne: 'completed' }
        };
        const dueSoonTasks = await Task.find(dueSoonQuery).populate('assignedTo');
        console.log(`[Logic Check] Found ${dueSoonTasks.length} tasks Due Soon.`);

        for (const task of dueSoonTasks) {
            if (task._id.toString() === t1._id.toString()) {
                console.log('>> Triggering Event: TASK_DUE_SOON');
                await publishEvent('TASK_DUE_SOON', {
                    entityType: 'task',
                    entityId: task._id,
                    entityTitle: task.title,
                    messageSnippet: `Task "${task.title}" is due in 3 days.`,
                    assignedTo: task.assignedTo
                });
            }
        }

        // Logic 2: Due Today
        const dueTodayQuery = {
            deadline: {
                $gte: today,
                $lt: new Date(today.getTime() + 24 * 60 * 60 * 1000)
            },
            status: { $ne: 'completed' }
        };
        const dueTodayTasks = await Task.find(dueTodayQuery).populate('assignedTo');
        console.log(`[Logic Check] Found ${dueTodayTasks.length} tasks Due Today.`);

        for (const task of dueTodayTasks) {
            if (task._id.toString() === t2._id.toString()) {
                console.log('>> Triggering Event: TASK_DUE_TODAY');
                await publishEvent('TASK_DUE_TODAY', {
                    entityType: 'task',
                    entityId: task._id,
                    entityTitle: task.title,
                    messageSnippet: `Task "${task.title}" is due today!`,
                    assignedTo: task.assignedTo
                });
            }
        }

        // Logic 3: Overdue
        const overdueQuery = {
            deadline: {
                $gte: matchOverdue,
                $lt: today
            },
            status: { $ne: 'completed' }
        };
        const overdueTasks = await Task.find(overdueQuery).populate('assignedTo');
        console.log(`[Logic Check] Found ${overdueTasks.length} tasks Overdue.`);

        for (const task of overdueTasks) {
            if (task._id.toString() === t3._id.toString()) {
                console.log('>> Triggering Event: TASK_OVERDUE');
                await publishEvent('TASK_OVERDUE', {
                    entityType: 'task',
                    entityId: task._id,
                    entityTitle: task.title,
                    messageSnippet: `Task "${task.title}" is OVERDUE.`,
                    assignedTo: task.assignedTo
                });
            }
        }

        console.log('--- cleanup ---');
        await Task.findByIdAndDelete(t1._id);
        await Task.findByIdAndDelete(t2._id);
        await Task.findByIdAndDelete(t3._id);
        console.log('Test tasks deleted.');

        // Allow time for Redis publish
        setTimeout(() => {
            console.log('Done.');
            process.exit(0);
        }, 2000);

    } catch (err) {
        console.error(err);
        process.exit(1);
    }
};

runTest();
