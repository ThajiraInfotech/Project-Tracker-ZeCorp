const cron = require('node-cron');
const Task = require('../models/Task');
const { publishEvent } = require('./queue');

const initScheduler = () => {
    // Run every day at 09:00 AM (0 9 * * *)
    cron.schedule('0 9 * * *', async () => {
        console.warn('Running Daily Notification Scheduler...');

        try {
            const today = new Date();
            today.setHours(0, 0, 0, 0);

            const threeDaysFromNow = new Date(today);
            threeDaysFromNow.setDate(today.getDate() + 3);

            // 1. Tasks Due In 3 Days
            const dueSoonTasks = await Task.find({
                deadline: {
                    $gte: threeDaysFromNow,
                    $lt: new Date(threeDaysFromNow.getTime() + 24 * 60 * 60 * 1000)
                },
                status: { $ne: 'completed' }
            }).populate('assignedTo');

            for (const task of dueSoonTasks) {
                await publishEvent('TASK_DUE_SOON', {
                    entityType: 'task',
                    entityId: task._id,
                    entityTitle: task.title,
                    messageSnippet: `Task "${task.title}" is due in 3 days.`,
                    assignedTo: task.assignedTo
                });
            }

            // 2. Tasks Due Today
            const dueTodayTasks = await Task.find({
                deadline: {
                    $gte: today,
                    $lt: new Date(today.getTime() + 24 * 60 * 60 * 1000)
                },
                status: { $ne: 'completed' }
            }).populate('assignedTo');

            for (const task of dueTodayTasks) {
                await publishEvent('TASK_DUE_TODAY', {
                    entityType: 'task',
                    entityId: task._id,
                    entityTitle: task.title,
                    messageSnippet: `Task "${task.title}" is due today!`,
                    assignedTo: task.assignedTo
                });
            }

            // 3. Overdue Tasks (Check logic: Deadline < Today AND status != completed)
            // Limit to tasks overdue in the last 7 days to avoid spamming old dead tasks forever? 
            // User said "after over due" - usually implies once or periodic.
            // Let's stick to "Just became overdue yesterday" to avoid spam, or simplistic check.
            // For a robust system, we should track if an overdue notification was already sent.
            // For now, let's grab tasks overdue by exactly 1 day.
            const yesterday = new Date(today);
            yesterday.setDate(today.getDate() - 1);

            const overdueTasks = await Task.find({
                deadline: {
                    $gte: yesterday,
                    $lt: today
                },
                status: { $ne: 'completed' }
            }).populate('assignedTo');

            for (const task of overdueTasks) {
                await publishEvent('TASK_OVERDUE', {
                    entityType: 'task',
                    entityId: task._id,
                    entityTitle: task.title,
                    messageSnippet: `Task "${task.title}" is OVERDUE.`,
                    assignedTo: task.assignedTo
                });
            }

            console.log(`Scheduler Run Complete. Events: Soon=${dueSoonTasks.length}, Today=${dueTodayTasks.length}, Overdue=${overdueTasks.length}`);

        } catch (error) {
            console.error('Scheduler Error:', error);
        }
    });

    console.log('Notification Scheduler Initialized (Schedule: 0 9 * * *)');
};

module.exports = { initScheduler };
