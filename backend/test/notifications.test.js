import request from 'supertest';
import express from 'express';
import cors from 'cors';
import jwt from 'jsonwebtoken';
import notificationRoutes from '../routes/notifications.js';
import authMiddleware from '../middleware/auth.js';
import User from '../models/User.js';
import Task from '../models/Task.js';
import Notification from '../models/Notification.js';

const app = express();
app.use(cors());
app.use(express.json());
app.use('/api/notifications', authMiddleware, notificationRoutes);

describe('Notifications API', () => {
  let user, authToken, task;

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

    // Create test task
    task = new Task({
      title: 'Test Task',
      description: 'Test task for notifications',
      status: 'todo',
      priority: 'medium',
      owner: user._id
    });
    await task.save();
  });

  describe('GET /api/notifications', () => {
    beforeEach(async () => {
      // Create test notifications
      const notifications = [
        {
          user: user._id,
          type: 'reminder',
          title: 'Task Reminder',
          message: 'Test task is due soon',
          relatedTask: task._id,
          isRead: false
        },
        {
          user: user._id,
          type: 'overdue',
          title: 'Overdue Task',
          message: 'Test task is overdue',
          relatedTask: task._id,
          isRead: true
        },
        {
          user: user._id,
          type: 'shared_task',
          title: 'Task Shared',
          message: 'A task was shared with you',
          relatedTask: task._id,
          isRead: false
        }
      ];

      await Notification.insertMany(notifications);
    });

    it('should get all user notifications', async () => {
      const response = await request(app)
        .get('/api/notifications')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.notifications).toHaveLength(3);
      expect(response.body.unreadCount).toBe(2);
    });

    it('should get only unread notifications', async () => {
      const response = await request(app)
        .get('/api/notifications?unread=true')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.notifications).toHaveLength(2);
      expect(response.body.notifications.every(n => !n.isRead)).toBe(true);
    });

    it('should not get notifications without authentication', async () => {
      const response = await request(app)
        .get('/api/notifications')
        .expect(401);

      expect(response.body.success).toBe(false);
    });
  });

  describe('PUT /api/notifications/:id/read', () => {
    let notification;

    beforeEach(async () => {
      notification = new Notification({
        user: user._id,
        type: 'reminder',
        title: 'Test Notification',
        message: 'Test notification message',
        relatedTask: task._id,
        isRead: false
      });
      await notification.save();
    });

    it('should mark notification as read', async () => {
      const response = await request(app)
        .put(`/api/notifications/${notification._id}/read`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.notification.isRead).toBe(true);
    });

    it('should not mark notification of another user as read', async () => {
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

      const response = await request(app)
        .put(`/api/notifications/${notification._id}/read`)
        .set('Authorization', `Bearer ${otherToken}`)
        .expect(404);

      expect(response.body.success).toBe(false);
    });
  });

  describe('PUT /api/notifications/mark-all-read', () => {
    beforeEach(async () => {
      // Create multiple unread notifications
      const notifications = [
        {
          user: user._id,
          type: 'reminder',
          title: 'Notification 1',
          message: 'Message 1',
          relatedTask: task._id,
          isRead: false
        },
        {
          user: user._id,
          type: 'reminder',
          title: 'Notification 2',
          message: 'Message 2',
          relatedTask: task._id,
          isRead: false
        },
        {
          user: user._id,
          type: 'reminder',
          title: 'Notification 3',
          message: 'Message 3',
          relatedTask: task._id,
          isRead: true
        }
      ];

      await Notification.insertMany(notifications);
    });

    it('should mark all notifications as read', async () => {
      const response = await request(app)
        .put('/api/notifications/mark-all-read')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.modifiedCount).toBe(2); // Only 2 were unread

      // Verify all notifications are now read
      const notifications = await Notification.find({ user: user._id });
      expect(notifications.every(n => n.isRead)).toBe(true);
    });
  });

  describe('DELETE /api/notifications/:id', () => {
    let notification;

    beforeEach(async () => {
      notification = new Notification({
        user: user._id,
        type: 'reminder',
        title: 'Test Notification',
        message: 'Test notification message',
        relatedTask: task._id,
        isRead: false
      });
      await notification.save();
    });

    it('should delete notification successfully', async () => {
      const response = await request(app)
        .delete(`/api/notifications/${notification._id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('deleted');

      // Verify notification is deleted
      const deletedNotification = await Notification.findById(notification._id);
      expect(deletedNotification).toBeNull();
    });

    it('should not delete notification of another user', async () => {
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

      const response = await request(app)
        .delete(`/api/notifications/${notification._id}`)
        .set('Authorization', `Bearer ${otherToken}`)
        .expect(404);

      expect(response.body.success).toBe(false);
    });
  });
});