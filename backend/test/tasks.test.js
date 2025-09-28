import request from 'supertest';
import express from 'express';
import cors from 'cors';
import jwt from 'jsonwebtoken';
import taskRoutes from '../routes/tasks.js';
import authMiddleware from '../middleware/auth.js';
import User from '../models/User.js';
import Category from '../models/Category.js';
import Task from '../models/Task.js';

const app = express();
app.use(cors());
app.use(express.json());
app.use('/api/tasks', authMiddleware, taskRoutes);

describe('Tasks API', () => {
  let user, authToken, category;

  beforeEach(async () => {
    // Create test user
    user = new User({
      fullName: 'Test User',
      email: 'test@example.com',
      passwordHash: 'hashedpassword'
    });
    await user.save();

    // Create auth token
    authToken = jwt.sign(
      { userId: user._id },
      process.env.JWT_SECRET || 'test-secret',
      { expiresIn: '1h' }
    );

    // Create test category
    category = new Category({
      name: 'Test Category',
      color: '#3b82f6',
      owner: user._id
    });
    await category.save();
  });

  describe('POST /api/tasks', () => {
    it('should create a new task successfully', async () => {
      const taskData = {
        title: 'Test Task',
        description: 'Test task description',
        priority: 'medium',
        category: category._id.toString(),
        dueDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
      };

      const response = await request(app)
        .post('/api/tasks')
        .set('Authorization', `Bearer ${authToken}`)
        .send(taskData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.task.title).toBe(taskData.title);
      expect(response.body.task.description).toBe(taskData.description);
      expect(response.body.task.priority).toBe(taskData.priority);
      expect(response.body.task.status).toBe('todo');
      expect(response.body.task.owner).toBe(user._id.toString());
    });

    it('should not create task without authentication', async () => {
      const taskData = {
        title: 'Test Task',
        description: 'Test task description'
      };

      const response = await request(app)
        .post('/api/tasks')
        .send(taskData)
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('token');
    });

    it('should not create task with invalid data', async () => {
      const taskData = {
        // Missing required title
        description: 'Test task description'
      };

      const response = await request(app)
        .post('/api/tasks')
        .set('Authorization', `Bearer ${authToken}`)
        .send(taskData)
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/tasks', () => {
    beforeEach(async () => {
      // Create test tasks
      const tasks = [
        {
          title: 'Task 1',
          description: 'First task',
          status: 'todo',
          priority: 'high',
          owner: user._id,
          category: category._id
        },
        {
          title: 'Task 2',
          description: 'Second task',
          status: 'in_progress',
          priority: 'medium',
          owner: user._id,
          category: category._id
        },
        {
          title: 'Task 3',
          description: 'Third task',
          status: 'done',
          priority: 'low',
          owner: user._id,
          category: category._id
        }
      ];

      await Task.insertMany(tasks);
    });

    it('should get all user tasks', async () => {
      const response = await request(app)
        .get('/api/tasks')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.tasks).toHaveLength(3);
      expect(response.body.tasks[0].owner).toBe(user._id.toString());
    });

    it('should filter tasks by status', async () => {
      const response = await request(app)
        .get('/api/tasks?status=todo')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.tasks).toHaveLength(1);
      expect(response.body.tasks[0].status).toBe('todo');
    });

    it('should search tasks by title', async () => {
      const response = await request(app)
        .get('/api/tasks?search=Task 1')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.tasks).toHaveLength(1);
      expect(response.body.tasks[0].title).toBe('Task 1');
    });

    it('should not get tasks without authentication', async () => {
      const response = await request(app)
        .get('/api/tasks')
        .expect(401);

      expect(response.body.success).toBe(false);
    });
  });

  describe('PUT /api/tasks/:id', () => {
    let task;

    beforeEach(async () => {
      task = new Task({
        title: 'Original Task',
        description: 'Original description',
        status: 'todo',
        priority: 'medium',
        owner: user._id,
        category: category._id
      });
      await task.save();
    });

    it('should update task successfully', async () => {
      const updateData = {
        title: 'Updated Task',
        description: 'Updated description',
        priority: 'high'
      };

      const response = await request(app)
        .put(`/api/tasks/${task._id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.task.title).toBe(updateData.title);
      expect(response.body.task.description).toBe(updateData.description);
      expect(response.body.task.priority).toBe(updateData.priority);
    });

    it('should not update task of another user', async () => {
      // Create another user
      const otherUser = new User({
        fullName: 'Other User',
        email: 'other@example.com',
        passwordHash: 'hashedpassword'
      });
      await otherUser.save();

      const otherToken = jwt.sign(
        { userId: otherUser._id },
        process.env.JWT_SECRET || 'test-secret',
        { expiresIn: '1h' }
      );

      const updateData = {
        title: 'Hacked Task'
      };

      const response = await request(app)
        .put(`/api/tasks/${task._id}`)
        .set('Authorization', `Bearer ${otherToken}`)
        .send(updateData)
        .expect(404);

      expect(response.body.success).toBe(false);
    });
  });

  describe('DELETE /api/tasks/:id', () => {
    let task;

    beforeEach(async () => {
      task = new Task({
        title: 'Task to Delete',
        description: 'This task will be deleted',
        status: 'todo',
        priority: 'medium',
        owner: user._id,
        category: category._id
      });
      await task.save();
    });

    it('should delete task successfully', async () => {
      const response = await request(app)
        .delete(`/api/tasks/${task._id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('deleted');

      // Verify task is deleted
      const deletedTask = await Task.findById(task._id);
      expect(deletedTask).toBeNull();
    });

    it('should not delete non-existent task', async () => {
      const fakeId = '507f1f77bcf86cd799439011';
      
      const response = await request(app)
        .delete(`/api/tasks/${fakeId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);

      expect(response.body.success).toBe(false);
    });
  });
});