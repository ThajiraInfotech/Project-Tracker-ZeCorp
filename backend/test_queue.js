const { getQueue } = require('./infrastructure/queue');
const { getRedisConnection } = require('./config/redis');

async function test() {
  try {
    const queue = getQueue();
    // Simulate TASK_COMMENT_ADDED payload
    await queue.add('TASK_COMMENT_ADDED', {
        entityType: 'task',
        entityId: '69fc7e7bc9ef80d6cbace950', // dummy
        entityTitle: 'Test Task',
        messageSnippet: 'This is a test comment',
        relatedLink: `/tasks?taskId=69fc7e7bc9ef80d6cbace950`,
        commenterId: '69620cfa5edf5a5a95099a2d', // admin
        triggeredBy: '69620cfa5edf5a5a95099a2d',
        assignedTo: { _id: '698b067685270e512dd0fffd' } // some user
    });
    console.log('Added TASK_COMMENT_ADDED to queue');
    process.exit(0);
  } catch (err) {
    console.error('Error:', err);
    process.exit(1);
  }
}

test();
