import express from 'express';
import Notification from '../models/Notification.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// Get all notifications for the authenticated user
router.get('/', authenticateToken, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const notifications = await Notification.find({ user: req.user._id })
      .populate('relatedTask', 'title status priority')
      .populate('triggeredBy', 'fullName email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Notification.countDocuments({ user: req.user._id });
    const unreadCount = await Notification.getUnreadCount(req.user._id);

    res.json({
      notifications,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      },
      unreadCount
    });
  } catch (error) {
    console.error('Error fetching notifications:', error);
    res.status(500).json({ 
      message: 'Failed to fetch notifications',
      error: error.message 
    });
  }
});

// Get unread count only
router.get('/unread-count', authenticateToken, async (req, res) => {
  try {
    const unreadCount = await Notification.getUnreadCount(req.user._id);
    res.json({ unreadCount });
  } catch (error) {
    console.error('Error fetching unread count:', error);
    res.status(500).json({ 
      message: 'Failed to fetch unread count',
      error: error.message 
    });
  }
});

// Mark a specific notification as read
router.patch('/:id/read', authenticateToken, async (req, res) => {
  try {
    const notification = await Notification.findOne({
      _id: req.params.id,
      user: req.user._id
    });

    if (!notification) {
      return res.status(404).json({ message: 'Notification not found' });
    }

    if (!notification.isRead) {
      await notification.markAsRead();
    }

    const unreadCount = await Notification.getUnreadCount(req.user._id);

    res.json({ 
      message: 'Notification marked as read',
      notification,
      unreadCount
    });
  } catch (error) {
    console.error('Error marking notification as read:', error);
    res.status(500).json({ 
      message: 'Failed to mark notification as read',
      error: error.message 
    });
  }
});

// Mark all notifications as read for the user
router.patch('/read-all', authenticateToken, async (req, res) => {
  try {
    const result = await Notification.markAllAsRead(req.user._id);
    
    res.json({ 
      message: 'All notifications marked as read',
      modifiedCount: result.modifiedCount,
      unreadCount: 0
    });
  } catch (error) {
    console.error('Error marking all notifications as read:', error);
    res.status(500).json({ 
      message: 'Failed to mark all notifications as read',
      error: error.message 
    });
  }
});

// Delete a specific notification
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const notification = await Notification.findOneAndDelete({
      _id: req.params.id,
      user: req.user._id
    });

    if (!notification) {
      return res.status(404).json({ message: 'Notification not found' });
    }

    const unreadCount = await Notification.getUnreadCount(req.user._id);

    res.json({ 
      message: 'Notification deleted successfully',
      unreadCount
    });
  } catch (error) {
    console.error('Error deleting notification:', error);
    res.status(500).json({ 
      message: 'Failed to delete notification',
      error: error.message 
    });
  }
});

// Delete all read notifications for the user
router.delete('/read', authenticateToken, async (req, res) => {
  try {
    const result = await Notification.deleteMany({
      user: req.user._id,
      isRead: true
    });

    res.json({ 
      message: 'Read notifications deleted successfully',
      deletedCount: result.deletedCount
    });
  } catch (error) {
    console.error('Error deleting read notifications:', error);
    res.status(500).json({ 
      message: 'Failed to delete read notifications',
      error: error.message 
    });
  }
});

// Create a new notification (typically used by system/other services)
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { type, title, message, relatedTask } = req.body;

    // Validate required fields
    if (!type || !title || !message) {
      return res.status(400).json({ 
        message: 'Type, title, and message are required' 
      });
    }

    const notification = new Notification({
      user: req.user._id,
      type,
      title,
      message,
      relatedTask
    });

    await notification.save();
    await notification.populate('relatedTask', 'title status priority');
    await notification.populate('triggeredBy', 'fullName email');

    const unreadCount = await Notification.getUnreadCount(req.user._id);

    res.status(201).json({ 
      message: 'Notification created successfully',
      notification,
      unreadCount
    });
  } catch (error) {
    console.error('Error creating notification:', error);
    
    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({ 
        message: 'Validation error',
        errors 
      });
    }

    res.status(500).json({ 
      message: 'Failed to create notification',
      error: error.message 
    });
  }
});

export default router;