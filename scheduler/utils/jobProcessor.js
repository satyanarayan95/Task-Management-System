import { Task, Notification, RecurringPattern } from '../models/index.js';
import { getNextOccurrence } from './rruleHelper.js';

class JobProcessor {
  constructor(redisClient) {
    this.redisClient = redisClient;
    this.isProcessing = false;
  }

  async processJobs() {
    if (this.isProcessing) {
      console.log(`[${new Date().toISOString()}] Job processing already in progress, skipping...`);
      return;
    }

    this.isProcessing = true;
    
    try {
      console.log(`[${new Date().toISOString()}] Starting job processing cycle`);
      
      // Process different types of jobs
      await Promise.all([
        this.processRecurringTasks(),
        this.processTaskReminders(),
        this.processOverdueTasks(),
        this.processFailedNotifications()
      ]);

      console.log(`[${new Date().toISOString()}] Job processing cycle completed`);
    } catch (error) {
      console.error(`[${new Date().toISOString()}] Error in job processing:`, error);
    } finally {
      this.isProcessing = false;
    }
  }

  async processRecurringTasks() {
    try {
      console.log(`[${new Date().toISOString()}] Processing recurring tasks...`);
      
      // Find due recurring patterns
      const now = new Date();
      const duePatterns = await RecurringPattern.find({
        nextDue: { $lte: now },
        isActive: true
      }).populate('task');

      console.log(`[${new Date().toISOString()}] Found ${duePatterns.length} due recurring patterns`);

      for (const pattern of duePatterns) {
        try {
          await this.createRecurringTaskInstance(pattern);
        } catch (error) {
          console.error(`[${new Date().toISOString()}] Error processing recurring pattern ${pattern._id}:`, error);
          // Continue processing other patterns
        }
      }
    } catch (error) {
      console.error(`[${new Date().toISOString()}] Error in processRecurringTasks:`, error);
    }
  }

  async createRecurringTaskInstance(pattern) {
    try {
      console.log(`[${new Date().toISOString()}] Creating instance for recurring pattern ${pattern._id}`);
      
      if (!pattern.task) {
        console.error(`[${new Date().toISOString()}] Pattern ${pattern._id} has no associated task`);
        return;
      }

      // Create a new task instance based on the parent task
      const parentTask = pattern.task;
      const instanceData = {
        title: parentTask.title,
        description: parentTask.description,
        status: 'todo',
        priority: parentTask.priority,
        category: parentTask.category,
        owner: parentTask.owner,
        assignees: parentTask.assignees || [],
        dueDate: pattern.nextDue,
        startDate: pattern.nextDue,
        isRecurring: false,
        recurringPattern: null,
        parentTask: parentTask._id
      };

      const taskInstance = new Task(instanceData);
      await taskInstance.save();
      
      console.log(`[${new Date().toISOString()}] Created task instance ${taskInstance._id} for pattern ${pattern._id}`);

      const afterCurrentOccurrence = new Date(pattern.nextDue.getTime() + 60000); // 1 minute after current occurrence
      const nextOccurrence = getNextOccurrence(pattern.rrule, afterCurrentOccurrence);
      
      if (nextOccurrence) {
        pattern.nextDue = nextOccurrence;
        pattern.lastGenerated = new Date();
        await pattern.save();
        
        console.log(`[${new Date().toISOString()}] Updated pattern ${pattern._id} next due to ${nextOccurrence}`);
      } else {
        // No more occurrences, deactivate the pattern
        pattern.isActive = false;
        await pattern.save();
        
        console.log(`[${new Date().toISOString()}] Deactivated pattern ${pattern._id} - no more occurrences`);
      }

      // Create notification for the task owner about the new instance
      await this.createNotification({
        user: parentTask.owner,
        type: 'reminder',
        title: 'New Recurring Task',
        message: `A new instance of "${parentTask.title}" has been created`,
        relatedTask: taskInstance._id
      });

      return taskInstance;
      
    } catch (error) {
      console.error(`[${new Date().toISOString()}] Error creating recurring task instance for pattern ${pattern._id}:`, error);
      throw error;
    }
  }

  async processTaskReminders() {
    try {
      console.log(`[${new Date().toISOString()}] Processing task reminders...`);
      
      // Find tasks with due dates in the next hour that need reminders
      const now = new Date();
      const oneHourFromNow = new Date(now.getTime() + 60 * 60 * 1000);
      
      const tasksNeedingReminders = await Task.find({
        dueDate: { 
          $gte: now, 
          $lte: oneHourFromNow 
        },
        status: { $ne: 'done' }
      }).populate('owner');

      console.log(`[${new Date().toISOString()}] Found ${tasksNeedingReminders.length} tasks needing reminders`);

      for (const task of tasksNeedingReminders) {
        try {
          // Check if reminder already sent
          const existingReminder = await this.checkExistingReminder(task._id, 'reminder');
          if (!existingReminder) {
            await this.createNotification({
              user: task.owner._id,
              type: 'reminder',
              title: 'Task Reminder',
              message: `Task "${task.title}" is due soon`,
              relatedTask: task._id
            });
          }
        } catch (error) {
          console.error(`[${new Date().toISOString()}] Error creating reminder for task ${task._id}:`, error);
        }
      }
    } catch (error) {
      console.error(`[${new Date().toISOString()}] Error in processTaskReminders:`, error);
    }
  }

  async processOverdueTasks() {
    try {
      console.log(`[${new Date().toISOString()}] Processing overdue tasks...`);
      
      const now = new Date();
      const overdueTasks = await Task.find({
        dueDate: { $lt: now },
        status: { $ne: 'done' }
      }).populate('owner');

      console.log(`[${new Date().toISOString()}] Found ${overdueTasks.length} overdue tasks`);

      for (const task of overdueTasks) {
        try {
          // Check if overdue notification already sent
          const existingOverdue = await this.checkExistingReminder(task._id, 'overdue');
          if (!existingOverdue) {
            await this.createNotification({
              user: task.owner._id,
              type: 'overdue',
              title: 'Task Overdue',
              message: `Task "${task.title}" is overdue`,
              relatedTask: task._id
            });
          }
        } catch (error) {
          console.error(`[${new Date().toISOString()}] Error creating overdue notification for task ${task._id}:`, error);
        }
      }
    } catch (error) {
      console.error(`[${new Date().toISOString()}] Error in processOverdueTasks:`, error);
    }
  }

  async processFailedNotifications() {
    try {
      console.log(`[${new Date().toISOString()}] Processing failed notifications...`);
      
      if (!this.redisClient || !this.redisClient.isReady) {
        console.log(`[${new Date().toISOString()}] Redis not available, skipping failed notification processing`);
        return;
      }

      // Get failed notifications from Redis queue
      const failedNotifications = await this.redisClient.lRange('failed_notifications', 0, -1);
      
      console.log(`[${new Date().toISOString()}] Found ${failedNotifications.length} failed notifications to retry`);

      for (const notificationData of failedNotifications) {
        try {
          const notification = JSON.parse(notificationData);
          
          // Check retry count
          if (notification.retryCount >= 5) {
            console.log(`[${new Date().toISOString()}] Max retries reached for notification, removing from queue`);
            await this.redisClient.lRem('failed_notifications', 1, notificationData);
            
            // Log the failed notification for manual review
            console.error(`[${new Date().toISOString()}] FAILED NOTIFICATION (max retries): ${JSON.stringify(notification.data)}`);
            continue;
          }

          // Attempt to create notification
          await this.createNotification(notification.data);
          
          // Remove from failed queue on success
          await this.redisClient.lRem('failed_notifications', 1, notificationData);
          console.log(`[${new Date().toISOString()}] Successfully retried failed notification (attempt ${notification.retryCount + 1})`);
          
        } catch (error) {
          console.error(`[${new Date().toISOString()}] Error retrying failed notification:`, error);
          
          // Update retry count and put back in queue
          try {
            const notification = JSON.parse(notificationData);
            notification.retryCount = (notification.retryCount || 0) + 1;
            notification.lastRetryAt = new Date().toISOString();
            
            await this.redisClient.lRem('failed_notifications', 1, notificationData);
            
            if (notification.retryCount < 5) {
              await this.redisClient.rPush('failed_notifications', JSON.stringify(notification));
              console.log(`[${new Date().toISOString()}] Queued notification for retry ${notification.retryCount + 1}/5`);
            } else {
              console.error(`[${new Date().toISOString()}] Notification exceeded max retries, discarding`);
            }
          } catch (updateError) {
            console.error(`[${new Date().toISOString()}] Error updating retry count:`, updateError);
          }
        }
      }
    } catch (error) {
      console.error(`[${new Date().toISOString()}] Error in processFailedNotifications:`, error);
    }
  }

  async createNotification(notificationData) {
    try {
      const notification = new Notification(notificationData);
      await notification.save();
      console.log(`[${new Date().toISOString()}] Created notification: ${notification.type} for user ${notification.user}`);
      return notification;
    } catch (error) {
      console.error(`[${new Date().toISOString()}] Error creating notification:`, error);
      
      // Queue for retry if Redis is available
      if (this.redisClient && this.redisClient.isReady) {
        const failedNotification = {
          data: notificationData,
          retryCount: 0,
          failedAt: new Date().toISOString()
        };
        await this.redisClient.rPush('failed_notifications', JSON.stringify(failedNotification));
        console.log(`[${new Date().toISOString()}] Queued failed notification for retry`);
      }
      
      throw error;
    }
  }

  async checkExistingReminder(taskId, type) {
    // Check if reminder/overdue notification was sent in the last 24 hours
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    
    const existingNotification = await Notification.findOne({
      relatedTask: taskId,
      type: type,
      createdAt: { $gte: oneDayAgo }
    });

    return existingNotification;
  }

  async healthCheck() {
    try {
      // Check database connectivity
      const taskCount = await Task.countDocuments();
      const notificationCount = await Notification.countDocuments();
      const recurringPatternCount = await RecurringPattern.countDocuments({ isActive: true });
      
      console.log(`[${new Date().toISOString()}] Health check - Tasks: ${taskCount}, Notifications: ${notificationCount}, Active Patterns: ${recurringPatternCount}`);
      
      // Check Redis connectivity
      if (this.redisClient && this.redisClient.isReady) {
        const failedCount = await this.redisClient.lLen('failed_notifications');
        console.log(`[${new Date().toISOString()}] Health check - Failed notifications in queue: ${failedCount}`);
        
        // Check for old failed notifications (older than 24 hours)
        if (failedCount > 0) {
          const oldNotifications = await this.cleanupOldFailedNotifications();
          if (oldNotifications > 0) {
            console.log(`[${new Date().toISOString()}] Cleaned up ${oldNotifications} old failed notifications`);
          }
        }
      }
      
      return true;
    } catch (error) {
      console.error(`[${new Date().toISOString()}] Health check failed:`, error);
      return false;
    }
  }

  async cleanupOldFailedNotifications() {
    try {
      if (!this.redisClient || !this.redisClient.isReady) {
        return 0;
      }

      const failedNotifications = await this.redisClient.lRange('failed_notifications', 0, -1);
      let cleanedCount = 0;
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

      for (const notificationData of failedNotifications) {
        try {
          const notification = JSON.parse(notificationData);
          const failedAt = new Date(notification.failedAt || notification.lastRetryAt);
          
          if (failedAt < oneDayAgo) {
            await this.redisClient.lRem('failed_notifications', 1, notificationData);
            cleanedCount++;
            console.log(`[${new Date().toISOString()}] Removed old failed notification from ${failedAt}`);
          }
        } catch (parseError) {
          // Remove malformed notification data
          await this.redisClient.lRem('failed_notifications', 1, notificationData);
          cleanedCount++;
          console.log(`[${new Date().toISOString()}] Removed malformed failed notification`);
        }
      }

      return cleanedCount;
    } catch (error) {
      console.error(`[${new Date().toISOString()}] Error cleaning up old failed notifications:`, error);
      return 0;
    }
  }

  async getProcessingStats() {
    try {
      const stats = {
        timestamp: new Date().toISOString(),
        tasks: {
          total: await Task.countDocuments(),
          todo: await Task.countDocuments({ status: 'todo' }),
          inProgress: await Task.countDocuments({ status: 'in_progress' }),
          done: await Task.countDocuments({ status: 'done' }),
          overdue: await Task.countDocuments({ 
            dueDate: { $lt: new Date() }, 
            status: { $ne: 'done' } 
          })
        },
        notifications: {
          total: await Notification.countDocuments(),
          unread: await Notification.countDocuments({ isRead: false })
        },
        recurringPatterns: {
          active: await RecurringPattern.countDocuments({ isActive: true }),
          inactive: await RecurringPattern.countDocuments({ isActive: false }),
          dueNow: await RecurringPattern.countDocuments({ 
            nextDue: { $lte: new Date() }, 
            isActive: true 
          })
        }
      };

      if (this.redisClient && this.redisClient.isReady) {
        stats.failedNotifications = await this.redisClient.lLen('failed_notifications');
      }

      return stats;
    } catch (error) {
      console.error(`[${new Date().toISOString()}] Error getting processing stats:`, error);
      return null;
    }
  }
}

export default JobProcessor;