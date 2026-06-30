const cron = require('node-cron');
const Task = require('../models/Task');
const { publishEvent } = require('./queue');

const initScheduler = () => {

    // ─────────────────────────────────────────────────────────────
    // JOB 1: Archive completed tasks that are 3+ days old
    // Runs every day at midnight (0 0 * * *)
    // ─────────────────────────────────────────────────────────────
    cron.schedule('0 0 * * *', async () => {
        console.log('[Scheduler] Running 3-day archive job...');
        try {
            const threeDaysAgo = new Date();
            threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
            threeDaysAgo.setHours(0, 0, 0, 0);

            const result = await Task.updateMany(
                {
                    status: 'completed',
                    isArchived: { $ne: true },
                    completedAt: { $lte: threeDaysAgo }
                },
                {
                    $set: {
                        isArchived: true,
                        archivedAt: new Date()
                    }
                }
            );

            console.log(`[Scheduler] 3-day archive job complete. Archived ${result.modifiedCount} task(s).`);
        } catch (error) {
            console.error('[Scheduler] 3-day archive job error:', error);
        }
    });

    // ─────────────────────────────────────────────────────────────
    // JOB 2: Daily notifications (due soon, due today, overdue)
    // Runs every day at 09:00 AM (0 9 * * *)
    // ─────────────────────────────────────────────────────────────
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

            // 3. Overdue Tasks (just became overdue yesterday)
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
    console.log('3-Day Archive Scheduler Initialized (Schedule: 0 0 * * *)');
};

module.exports = { initScheduler };
