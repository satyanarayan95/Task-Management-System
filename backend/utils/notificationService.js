import Notification from '../models/Notification.js';
import Task from '../models/Task.js';
import User from '../models/User.js';

/**
 * Notification Service
 * Handles creation of notifications for different event types
 */
class NotificationService {
  
  /**
   * Create a task assignment notification
   * @param {Object} task - The task being assigned
   * @param {Object} assignee - The user being assigned the task
   * @param {Object} assigner - The user who assigned the task
   */
  static async createTaskAssignmentNotification(task, assignee, assigner) {
    try {
      // Don't create notification if user is assigning task to themselves
      if (assignee._id.toString() === assigner._id.toString()) {
        console.log(`Skipping notification: User ${assigner.fullName} assigned task to themselves`);
        return null;
      }

      const notification = new Notification({
        user: assignee._id,
        type: 'shared_task',
        title: 'New task assigned to you',
        message: `${assigner.fullName} assigned you the task "${task.title}"`,
        relatedTask: task._id,
        triggeredBy: assigner._id
      });

      await notification.save();
      await notification.populate('relatedTask', 'title status priority');
      
      return notification;
    } catch (error) {
      console.error('Error creating task assignment notification:', error);
      throw error;
    }
  }

  /**
   * Create a task reminder notification
   * @param {Object} task - The task for the reminder
   * @param {Object} user - The user to notify
   * @param {number} hoursUntilDue - Hours until the task is due
   */
  static async createTaskReminderNotification(task, user, hoursUntilDue = null) {
    try {
      let message;
      if (hoursUntilDue && hoursUntilDue > 0) {
        const timeText = hoursUntilDue === 1 ? '1 hour' : `${hoursUntilDue} hours`;
        message = `Don't forget: "${task.title}" is due in ${timeText}`;
      } else {
        message = `Reminder: "${task.title}" is due soon`;
      }

      const notification = new Notification({
        user: user._id,
        type: 'reminder',
        title: 'Task reminder',
        message,
        relatedTask: task._id
      });

      await notification.save();
      await notification.populate('relatedTask', 'title status priority');
      
      return notification;
    } catch (error) {
      console.error('Error creating task reminder notification:', error);
      throw error;
    }
  }

  /**
   * Create an overdue task notification
   * @param {Object} task - The overdue task
   * @param {Object} user - The user to notify
   */
  static async createOverdueTaskNotification(task, user) {
    try {
      const notification = new Notification({
        user: user._id,
        type: 'overdue',
        title: 'Task overdue',
        message: `The task "${task.title}" is now overdue`,
        relatedTask: task._id
      });

      await notification.save();
      await notification.populate('relatedTask', 'title status priority');
      
      return notification;
    } catch (error) {
      console.error('Error creating overdue task notification:', error);
      throw error;
    }
  }

  /**
   * Create notifications for task assignment changes
   * @param {Object} task - The task being updated
   * @param {string} oldAssigneeId - Previous assignee ID
   * @param {string} newAssigneeId - New assignee ID
   * @param {Object} updater - User making the change
   */
  static async handleTaskAssignmentChange(task, oldAssigneeId, newAssigneeId, updater) {
    try {
      const notifications = [];

      // If task is being assigned to someone new
      if (newAssigneeId && newAssigneeId !== oldAssigneeId) {
        const newAssignee = await User.findById(newAssigneeId);
        if (newAssignee && newAssigneeId.toString() !== updater._id.toString()) {
          const notification = await this.createTaskAssignmentNotification(task, newAssignee, updater);
          notifications.push(notification);
        }
      }

      return notifications;
    } catch (error) {
      console.error('Error handling task assignment change:', error);
      throw error;
    }
  }

  /**
   * Create notifications for recurring task instances
   * @param {Object} task - The recurring task instance
   * @param {Object} user - The user to notify
   */
  static async createRecurringTaskNotification(task, user) {
    try {
      const notification = new Notification({
        user: user._id,
        type: 'reminder',
        title: 'Recurring task created',
        message: `A new instance of "${task.title}" has been created`,
        relatedTask: task._id
      });

      await notification.save();
      await notification.populate('relatedTask', 'title status priority');
      
      return notification;
    } catch (error) {
      console.error('Error creating recurring task notification:', error);
      throw error;
    }
  }

  /**
   * Get notifications for a user with pagination
   * @param {string} userId - User ID
   * @param {number} page - Page number (default: 1)
   * @param {number} limit - Items per page (default: 20)
   */
  static async getUserNotifications(userId, page = 1, limit = 20) {
    try {
      const skip = (page - 1) * limit;

      const notifications = await Notification.find({ user: userId })
        .populate('relatedTask', 'title status priority')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit);

      const total = await Notification.countDocuments({ user: userId });
      const unreadCount = await Notification.getUnreadCount(userId);

      return {
        notifications,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        },
        unreadCount
      };
    } catch (error) {
      console.error('Error fetching user notifications:', error);
      throw error;
    }
  }

  /**
   * Mark notification as read
   * @param {string} notificationId - Notification ID
   * @param {string} userId - User ID (for security)
   */
  static async markAsRead(notificationId, userId) {
    try {
      const notification = await Notification.findOne({
        _id: notificationId,
        user: userId
      });

      if (!notification) {
        throw new Error('Notification not found');
      }

      if (!notification.isRead) {
        await notification.markAsRead();
      }

      const unreadCount = await Notification.getUnreadCount(userId);
      
      return { notification, unreadCount };
    } catch (error) {
      console.error('Error marking notification as read:', error);
      throw error;
    }
  }

  /**
   * Mark all notifications as read for a user
   * @param {string} userId - User ID
   */
  static async markAllAsRead(userId) {
    try {
      const result = await Notification.markAllAsRead(userId);
      return { modifiedCount: result.modifiedCount, unreadCount: 0 };
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
      throw error;
    }
  }

  /**
   * Delete a notification
   * @param {string} notificationId - Notification ID
   * @param {string} userId - User ID (for security)
   */
  static async deleteNotification(notificationId, userId) {
    try {
      const notification = await Notification.findOneAndDelete({
        _id: notificationId,
        user: userId
      });

      if (!notification) {
        throw new Error('Notification not found');
      }

      const unreadCount = await Notification.getUnreadCount(userId);
      
      return { unreadCount };
    } catch (error) {
      console.error('Error deleting notification:', error);
      throw error;
    }
  }

  /**
   * Clean up old read notifications (older than 30 days)
   * This can be called by a scheduled job
   */
  static async cleanupOldNotifications() {
    try {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const result = await Notification.deleteMany({
        isRead: true,
        createdAt: { $lt: thirtyDaysAgo }
      });

      console.log(`Cleaned up ${result.deletedCount} old notifications`);
      return result.deletedCount;
    } catch (error) {
      console.error('Error cleaning up old notifications:', error);
      throw error;
    }
  }
}

export default NotificationService;