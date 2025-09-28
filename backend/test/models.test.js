import mongoose from 'mongoose';
import User from '../models/User.js';
import Task from '../models/Task.js';
import Category from '../models/Category.js';
import Notification from '../models/Notification.js';

describe('Model Validation Tests', () => {
  beforeAll(async () => {
    // Connect to in-memory MongoDB
    const { MongoMemoryServer } = await import('mongodb-memory-server');
    const mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();
    await mongoose.connect(mongoUri);
  });

  afterAll(async () => {
    await mongoose.connection.dropDatabase();
    await mongoose.connection.close();
  });

  afterEach(async () => {
    // Clean up after each test
    const collections = mongoose.connection.collections;
    for (const key in collections) {
      const collection = collections[key];
      await collection.deleteMany({});
    }
  });

  describe('User Model', () => {
    it('should create a valid user', async () => {
      const userData = {
        fullName: 'John Doe',
        email: 'john@example.com',
        passwordHash: 'hashedpassword123'
      };

      const user = new User(userData);
      const savedUser = await user.save();

      expect(savedUser._id).toBeDefined();
      expect(savedUser.fullName).toBe(userData.fullName);
      expect(savedUser.email).toBe(userData.email);
      expect(savedUser.passwordHash).toBe(userData.passwordHash);
      expect(savedUser.createdAt).toBeDefined();
      expect(savedUser.updatedAt).toBeDefined();
    });

    it('should require fullName', async () => {
      const userData = {
        email: 'john@example.com',
        passwordHash: 'hashedpassword123'
      };

      const user = new User(userData);
      
      await expect(user.save()).rejects.toThrow(/fullName/);
    });

    it('should require email', async () => {
      const userData = {
        fullName: 'John Doe',
        passwordHash: 'hashedpassword123'
      };

      const user = new User(userData);
      
      await expect(user.save()).rejects.toThrow(/email/);
    });

    it('should require unique email', async () => {
      const userData = {
        fullName: 'John Doe',
        email: 'john@example.com',
        passwordHash: 'hashedpassword123'
      };

      const user1 = new User(userData);
      await user1.save();

      const user2 = new User(userData);
      
      await expect(user2.save()).rejects.toThrow(/duplicate/);
    });
  });

  describe('Category Model', () => {
    let user;

    beforeEach(async () => {
      user = new User({
        fullName: 'Test User',
        email: 'test@example.com',
        passwordHash: 'hashedpassword'
      });
      await user.save();
    });

    it('should create a valid category', async () => {
      const categoryData = {
        name: 'Work',
        color: '#3b82f6',
        owner: user._id
      };

      const category = new Category(categoryData);
      const savedCategory = await category.save();

      expect(savedCategory._id).toBeDefined();
      expect(savedCategory.name).toBe(categoryData.name);
      expect(savedCategory.color).toBe(categoryData.color);
      expect(savedCategory.owner.toString()).toBe(user._id.toString());
    });

    it('should require name', async () => {
      const categoryData = {
        color: '#3b82f6',
        owner: user._id
      };

      const category = new Category(categoryData);
      
      await expect(category.save()).rejects.toThrow(/name/);
    });

    it('should require owner', async () => {
      const categoryData = {
        name: 'Work',
        color: '#3b82f6'
      };

      const category = new Category(categoryData);
      
      await expect(category.save()).rejects.toThrow(/owner/);
    });
  });

  describe('Task Model', () => {
    let user, category;

    beforeEach(async () => {
      user = new User({
        fullName: 'Test User',
        email: 'test@example.com',
        passwordHash: 'hashedpassword'
      });
      await user.save();

      category = new Category({
        name: 'Test Category',
        color: '#3b82f6',
        owner: user._id
      });
      await category.save();
    });

    it('should create a valid task', async () => {
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

      expect(savedTask._id).toBeDefined();
      expect(savedTask.title).toBe(taskData.title);
      expect(savedTask.description).toBe(taskData.description);
      expect(savedTask.status).toBe(taskData.status);
      expect(savedTask.priority).toBe(taskData.priority);
      expect(savedTask.owner.toString()).toBe(user._id.toString());
    });

    it('should require title', async () => {
      const taskData = {
        description: 'Test task description',
        owner: user._id
      };

      const task = new Task(taskData);
      
      await expect(task.save()).rejects.toThrow(/title/);
    });

    it('should require owner', async () => {
      const taskData = {
        title: 'Test Task',
        description: 'Test task description'
      };

      const task = new Task(taskData);
      
      await expect(task.save()).rejects.toThrow(/owner/);
    });

    it('should validate status enum', async () => {
      const taskData = {
        title: 'Test Task',
        description: 'Test task description',
        status: 'invalid_status',
        owner: user._id
      };

      const task = new Task(taskData);
      
      await expect(task.save()).rejects.toThrow(/status/);
    });

    it('should validate priority enum', async () => {
      const taskData = {
        title: 'Test Task',
        description: 'Test task description',
        priority: 'invalid_priority',
        owner: user._id
      };

      const task = new Task(taskData);
      
      await expect(task.save()).rejects.toThrow(/priority/);
    });

    it('should check user access correctly', async () => {
      const task = new Task({
        title: 'Test Task',
        description: 'Test task description',
        owner: user._id
      });
      await task.save();

      // Owner should have access
      expect(task.hasAccess(user._id)).toBe(true);
      expect(task.hasAccess(user._id, 'edit')).toBe(true);

      // Non-owner should not have access
      const otherUserId = new mongoose.Types.ObjectId();
      expect(task.hasAccess(otherUserId)).toBe(false);
    });

    it('should handle shared access correctly', async () => {
      const otherUser = new User({
        fullName: 'Other User',
        email: 'other@example.com',
        passwordHash: 'hashedpassword'
      });
      await otherUser.save();

      const task = new Task({
        title: 'Test Task',
        description: 'Test task description',
        owner: user._id,
        sharedWith: [{
          user: otherUser._id,
          permission: 'view'
        }]
      });
      await task.save();

      // Shared user should have view access
      expect(task.hasAccess(otherUser._id, 'view')).toBe(true);
      expect(task.hasAccess(otherUser._id, 'edit')).toBe(false);
    });
  });

  describe('Notification Model', () => {
    let user, task;

    beforeEach(async () => {
      user = new User({
        fullName: 'Test User',
        email: 'test@example.com',
        passwordHash: 'hashedpassword'
      });
      await user.save();

      task = new Task({
        title: 'Test Task',
        description: 'Test task description',
        owner: user._id
      });
      await task.save();
    });

    it('should create a valid notification', async () => {
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

      expect(savedNotification._id).toBeDefined();
      expect(savedNotification.user.toString()).toBe(user._id.toString());
      expect(savedNotification.type).toBe(notificationData.type);
      expect(savedNotification.title).toBe(notificationData.title);
      expect(savedNotification.message).toBe(notificationData.message);
      expect(savedNotification.isRead).toBe(false);
    });

    it('should require user', async () => {
      const notificationData = {
        type: 'reminder',
        title: 'Task Reminder',
        message: 'Your task is due soon'
      };

      const notification = new Notification(notificationData);
      
      await expect(notification.save()).rejects.toThrow(/user/);
    });

    it('should require type', async () => {
      const notificationData = {
        user: user._id,
        title: 'Task Reminder',
        message: 'Your task is due soon'
      };

      const notification = new Notification(notificationData);
      
      await expect(notification.save()).rejects.toThrow(/type/);
    });

    it('should validate type enum', async () => {
      const notificationData = {
        user: user._id,
        type: 'invalid_type',
        title: 'Task Reminder',
        message: 'Your task is due soon'
      };

      const notification = new Notification(notificationData);
      
      await expect(notification.save()).rejects.toThrow(/type/);
    });

    it('should mark notification as read', async () => {
      const notification = new Notification({
        user: user._id,
        type: 'reminder',
        title: 'Task Reminder',
        message: 'Your task is due soon',
        isRead: false
      });
      await notification.save();

      await notification.markAsRead();
      
      expect(notification.isRead).toBe(true);
    });
  });
});