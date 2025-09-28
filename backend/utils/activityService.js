import Activity from '../models/Activity.js';

export const logActivity = async (activityData) => {
  try {
    const activity = new Activity(activityData);
    const savedActivity = await activity.save();
    return savedActivity;
  } catch (error) {
    console.error('Error logging activity:', error);
    throw error;
  }
};

export const logTaskActivity = async (type, userId, taskId, description, metadata = {}) => {
  return await logActivity({
    user: userId,
    type,
    description,
    task: taskId,
    metadata
  });
};

export const logCategoryActivity = async (type, userId, categoryId, description, metadata = {}) => {
  return await logActivity({
    user: userId,
    type,
    description,
    category: categoryId,
    metadata
  });
};

export const logAssignmentActivity = async (userId, taskId, assigneeId, description, metadata = {}) => {
  return await logActivity({
    user: userId,
    type: 'task_assigned',
    description,
    task: taskId,
    assignee: assigneeId,
    metadata
  });
};

export const logStatusChangeActivity = async (userId, taskId, oldStatus, newStatus, description, metadata = {}) => {
  return await logActivity({
    user: userId,
    type: 'task_status_changed',
    description,
    task: taskId,
    metadata: {
      ...metadata,
      oldStatus,
      newStatus
    }
  });
};

export const logPriorityChangeActivity = async (userId, taskId, oldPriority, newPriority, description, metadata = {}) => {
  return await logActivity({
    user: userId,
    type: 'task_priority_changed',
    description,
    task: taskId,
    metadata: {
      ...metadata,
      oldPriority,
      newPriority
    }
  });
};

export const logDueDateChangeActivity = async (userId, taskId, oldDueDate, newDueDate, description, metadata = {}) => {
  return await logActivity({
    user: userId,
    type: 'task_due_date_changed',
    description,
    task: taskId,
    metadata: {
      ...metadata,
      oldDueDate,
      newDueDate
    }
  });
};

export const logCommentActivity = async (userId, taskId, description, metadata = {}) => {
  return await logActivity({
    user: userId,
    type: 'comment_added',
    description,
    task: taskId,
    metadata
  });
};

export const logTaskShareActivity = async (userId, taskId, sharedWithUserId, description, metadata = {}) => {
  return await logActivity({
    user: userId,
    type: 'task_shared',
    description,
    task: taskId,
    assignee: sharedWithUserId,
    metadata
  });
};

export const logTaskUnshareActivity = async (userId, taskId, unsharedWithUserId, description, metadata = {}) => {
  return await logActivity({
    user: userId,
    type: 'task_unshared',
    description,
    task: taskId,
    assignee: unsharedWithUserId,
    metadata
  });
};
