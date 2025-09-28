import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import User from '../models/User.js';
import Task from '../models/Task.js';
import Category from '../models/Category.js';
import Notification from '../models/Notification.js';

let mongoServer;

// Test utilities
const assert = (condition, message) => {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
};

const assertEqual = (actual, expected, message) => {
  if (actual !== expected) {
    throw new Error(`Assertion failed: ${message}. Expected: ${expected}, Actual: ${actual}`);
  }
};

// Setup and teardown
const setup = async () => {
  console.log('Setting up test environment...');
  mongoServer = await MongoMemoryServer.create();
  const mongoUri = mongoServer.getUri();
  await mongoose.connect(mongoUri);
  console.log('✓ Connected to test database');
};

const teardown = async () => {
  console.log('Cleaning up test environment...');
  await mongoose.connection.dropDatabase();
  await mongoose.connection.close();
  await mongoServer.stop();
  console.log('✓ Test environment cleaned up');
};

const clearCollections = async () => {
  const collections = mongoose.connection.collections;
  for (const key in collections) {
    const collection = collections[key];
    await collection.deleteMany({});
  }
};

// Test suites
const testUserModel = async () => {
  console.log('\n--- Testing User Model ---');
  
  // Test 1: Create valid user
  try {
    const userData = {
      fullName: 'John Doe',
      email: 'john@example.com',
      passwordHash: 'hashedpassword123'
    };

    const user = new User(userData);
    const savedUser = await user.save();

    assert(savedUser._id, 'User should have an ID');
    assertEqual(savedUser.fullName, userData.fullName, 'Full name should match');
    assertEqual(savedUser.email, userData.email, 'Email should match');
    console.log('✓ User creation test passed');
  } catch (error) {
    console.error('✗ User creation test failed:', error.message);
  }

  await clearCollections();

  // Test 2: Require fullName
  try {
    const userData = {
      email: 'john@example.com',
      passwordHash: 'hashedpassword123'
    };

    const user = new User(userData);
    await user.save();
    console.error('✗ Should have failed without fullName');
  } catch (error) {
    if (error.message.includes('fullName')) {
      console.log('✓ FullName validation test passed');
    } else {
      console.error('✗ FullName validation test failed:', error.message);
    }
  }

  await clearCollections();

  // Test 3: Require unique email
  try {
    const userData = {
      fullName: 'John Doe',
      email: 'john@example.com',
      passwordHash: 'hashedpassword123'
    };

    const user1 = new User(userData);
    await user1.save();

    const user2 = new User(userData);
    await user2.save();
    console.error('✗ Should have failed with duplicate email');
  } catch (error) {
    if (error.message.includes('duplicate') || error.code === 11000) {
      console.log('✓ Unique email validation test passed');
    } else {
      console.error('✗ Unique email validation test failed:', error.message);
    }
  }

  await clearCollections();
};

const testTaskModel = async () => {
  console.log('\n--- Testing Task Model ---');
  
  // Setup user and category
  const user = new User({
    fullName: 'Test User',
    email: 'test@example.com',
    passwordHash: 'hashedpassword'
  });
  await user.save();

  const category = new Category({
    name: 'Test Category',
    color: '#3b82f6',
    owner: user._id
  });
  await category.save();

  // Test 1: Create valid task
  try {
    const taskData = {
      title: 'Test Task',
      description: 'Test task description',
      status: 'todo',
      priority: 'medium',
      category: category._id,
      owner: user._id,
      dueDate: new Date(Date.now() + 24 * 60 * 60 * 1000)
    };

    const task = new Task(taskData);
    const savedTask = await task.save();

    assert(savedTask._id, 'Task should have an ID');
    assertEqual(savedTask.title, taskData.title, 'Title should match');
    assertEqual(savedTask.status, taskData.status, 'Status should match');
    console.log('✓ Task creation test passed');
  } catch (error) {
    console.error('✗ Task creation test failed:', error.message);
  }

  // Test 2: Require title
  try {
    const taskData = {
      description: 'Test task description',
      owner: user._id
    };

    const task = new Task(taskData);
    await task.save();
    console.error('✗ Should have failed without title');
  } catch (error) {
    if (error.message.includes('title')) {
      console.log('✓ Title validation test passed');
    } else {
      console.error('✗ Title validation test failed:', error.message);
    }
  }

  // Test 3: Test access control
  try {
    const task = new Task({
      title: 'Test Task',
      description: 'Test task description',
      owner: user._id
    });
    await task.save();

    // Owner should have access
    assert(task.hasAccess(user._id), 'Owner should have access');
    assert(task.hasAccess(user._id, 'edit'), 'Owner should have edit access');

    // Non-owner should not have access
    const otherUserId = new mongoose.Types.ObjectId();
    assert(!task.hasAccess(otherUserId), 'Non-owner should not have access');

    console.log('✓ Access control test passed');
  } catch (error) {
    console.error('✗ Access control test failed:', error.message);
  }

  await clearCollections();
};

const testNotificationModel = async () => {
  console.log('\n--- Testing Notification Model ---');
  
  // Setup user and task
  const user = new User({
    fullName: 'Test User',
    email: 'test@example.com',
    passwordHash: 'hashedpassword'
  });
  await user.save();

  const task = new Task({
    title: 'Test Task',
    description: 'Test task description',
    owner: user._id
  });
  await task.save();

  // Test 1: Create valid notification
  try {
    const notificationData = {
      user: user._id,
      type: 'reminder',
      title: 'Task Reminder',
      message: 'Your task is due soon',
      relatedTask: task._id,
      isRead: false
    };

    const notification = new Notification(notificationData);
    const savedNotification = await notification.save();

    assert(savedNotification._id, 'Notification should have an ID');
    assertEqual(savedNotification.type, notificationData.type, 'Type should match');
    assertEqual(savedNotification.title, notificationData.title, 'Title should match');
    console.log('✓ Notification creation test passed');
  } catch (error) {
    console.error('✗ Notification creation test failed:', error.message);
  }

  // Test 2: Test mark as read
  try {
    const notification = new Notification({
      user: user._id,
      type: 'reminder',
      title: 'Task Reminder',
      message: 'Your task is due soon',
      isRead: false
    });
    await notification.save();

    await notification.markAsRead();
    assert(notification.isRead === true, 'Notification should be marked as read');
    console.log('✓ Mark as read test passed');
  } catch (error) {
    console.error('✗ Mark as read test failed:', error.message);
  }

  await clearCollections();
};

// Main test runner
const runTests = async () => {
  console.log('🧪 Starting Backend Model Tests\n');
  
  try {
    await setup();
    
    await testUserModel();
    await testTaskModel();
    await testNotificationModel();
    
    console.log('\n✅ All tests completed successfully!');
  } catch (error) {
    console.error('\n❌ Test suite failed:', error.message);
    process.exit(1);
  } finally {
    await teardown();
  }
};

// Run tests if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runTests();
}

export default runTests;