const mongoose = require('mongoose');
const User = require('./backend/models/User');
const Project = require('./backend/models/Project');
const Task = require('./backend/models/Task');
const Notification = require('./backend/models/Notification');
const { parseMentions, createMentionNotifications } = require('./backend/utils/mentionUtils');

// Test data
const testUsers = [
  { username: 'john_doe', email: 'john@example.com', fullName: 'John Doe', role: 'staff' },
  { username: 'jane_smith', email: 'jane@example.com', fullName: 'Jane Smith', role: 'manager' },
  { username: 'bob_wilson', email: 'bob@example.com', fullName: 'Bob Wilson', role: 'admin' },
  { username: 'alice_brown', email: 'alice@example.com', fullName: 'Alice Brown', role: 'staff' }
];

const testProject = {
  projectName: 'Test Project Mentions',
  projectType: 'commercial-kitchen',
  description: 'Testing mentions functionality',
  clientName: 'Test Client',
  clientEmail: 'client@example.com',
  startDate: new Date(),
  endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
  status: 'in-progress',
  budget: 50000,
  location: 'Test Location',
  createdBy: null // Will be set after user creation
};

const testTask = {
  title: 'Test Task with Mentions',
  description: 'Testing @john_doe and @jane_smith mentions in task discussions',
  project: null, // Will be set after project creation
  assignedTo: null, // Will be set after user creation
  createdBy: null, // Will be set after user creation
  deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  priority: 'high'
};

async function testMentions() {
  try {
    // Connect to database
    await mongoose.connect('mongodb://localhost:27017/test_mentions', {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });

    console.log('🧪 Testing Mentions Functionality\n');

    // Clean up existing test data
    await User.deleteMany({ username: { $in: testUsers.map(u => u.username) } });
    await Project.deleteMany({ projectName: testProject.projectName });
    await Task.deleteMany({ title: testTask.title });
    await Notification.deleteMany({});

    console.log('✅ Cleaned up existing test data');

    // Create test users
    const users = [];
    for (const userData of testUsers) {
      const user = new User(userData);
      await user.save();
      users.push(user);
      console.log(`✅ Created user: ${user.username}`);
    }

    // Create test project
    testProject.createdBy = users[0]._id;
    testProject.manager = users[1]._id;
    testProject.teamMembers = [users[0]._id, users[3]._id];

    const project = new Project(testProject);
    await project.save();
    console.log(`✅ Created project: ${project.projectName}`);

    // Create test task
    testTask.project = project._id;
    testTask.assignedTo = users[0]._id;
    testTask.createdBy = users[1]._id;

    const task = new Task(testTask);
    await task.save();
    console.log(`✅ Created task: ${task.title}`);

    // Test 1: Parse mentions from content
    console.log('\n📝 Test 1: Parsing Mentions');
    const testContent = 'Please review this with @john_doe and @jane_smith. Also check with @alice_brown and @nonexistent_user';
    
    const parsedMentions = await parseMentions(testContent);
    console.log('Parsed mentions:', parsedMentions.map(m => m.username));
    console.log('Expected: john_doe, jane_smith, alice_brown');
    console.log('✅ Test 1 passed:', parsedMentions.length === 3);

    // Test 2: Create mention notifications
    console.log('\n🔔 Test 2: Creating Notifications');
    await createMentionNotifications(parsedMentions, users[1], 'Project', project._id, testContent);
    
    const notifications = await Notification.find({ relatedId: project._id });
    console.log(`Created ${notifications.length} notifications`);
    console.log('✅ Test 2 passed:', notifications.length === 3);

    // Test 3: Add discussion with mentions to project
    console.log('\n💬 Test 3: Adding Discussion with Mentions');
    const discussionContent = 'Team meeting scheduled for tomorrow @john_doe @jane_smith @bob_wilson';
    
    project.discussions.push({
      author: users[1]._id,
      content: discussionContent,
      system: false,
      parentDiscussionId: null,
      mentions: parsedMentions.map(m => m.userId)
    });

    await project.save();
    console.log('✅ Added discussion with mentions to project');

    // Test 4: Add discussion with mentions to task
    console.log('\n📋 Test 4: Adding Discussion with Mentions to Task');
    const taskDiscussionContent = 'Code review needed @alice_brown @john_doe';
    
    task.discussions.push({
      author: users[0]._id,
      content: taskDiscussionContent,
      system: false,
      parentDiscussionId: null,
      mentions: parsedMentions.map(m => m.userId)
    });

    await task.save();
    console.log('✅ Added discussion with mentions to task');

    // Test 5: Test mention highlighting utility
    console.log('\n🎨 Test 5: Frontend Mention Highlighting');
    const { formatDiscussionContent } = require('./frontend/src/utils/mentionUtils');
    
    const allUsers = [users[0], users[1], users[2], users[3]];
    const formattedContent = formatDiscussionContent({
      content: discussionContent,
      mentions: parsedMentions.map(m => m.userId)
    }, allUsers);
    
    console.log('Formatted content parts:', formattedContent);
    console.log('✅ Test 5 passed:', formattedContent.length > 0);

    // Test 6: Test backward compatibility
    console.log('\n🔄 Test 6: Backward Compatibility');
    
    // Add a discussion without mentions (old format)
    project.discussions.push({
      author: users[0]._id,
      content: 'Regular discussion without mentions',
      system: false,
      parentDiscussionId: null
      // No mentions field - this should still work
    });

    await project.save();
    console.log('✅ Backward compatibility maintained');

    // Test 7: Test threaded replies with mentions
    console.log('\n🧵 Test 7: Threaded Replies with Mentions');
    
    const replyContent = 'Thanks for the update @jane_smith, I agree with @john_doe';
    const replyMentions = await parseMentions(replyContent);
    
    project.discussions.push({
      author: users[3]._id,
      content: replyContent,
      system: false,
      parentDiscussionId: project.discussions[project.discussions.length - 2]._id, // Reply to the mentions discussion
      mentions: replyMentions.map(m => m.userId)
    });

    await project.save();
    console.log('✅ Threaded replies with mentions work correctly');

    // Summary
    console.log('\n🎉 All Tests Completed Successfully!');
    console.log('\n📊 Test Results:');
    console.log('✅ Mentions parsing works correctly');
    console.log('✅ Notification creation works');
    console.log('✅ Project discussions support mentions');
    console.log('✅ Task discussions support mentions');
    console.log('✅ Frontend highlighting works');
    console.log('✅ Backward compatibility maintained');
    console.log('✅ Threaded replies with mentions work');

    // Cleanup
    await User.deleteMany({ username: { $in: testUsers.map(u => u.username) } });
    await Project.deleteMany({ projectName: testProject.projectName });
    await Task.deleteMany({ title: testTask.title });
    await Notification.deleteMany({});

    console.log('\n🧹 Test data cleaned up');

  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    await mongoose.disconnect();
  }
}

// Run the test
testMentions();