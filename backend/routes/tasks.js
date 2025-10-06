import express from 'express';
import mongoose from 'mongoose';
import Task from '../models/Task.js';
import Category from '../models/Category.js';
import User from '../models/User.js';
import RecurringPattern from '../models/RecurringPattern.js';
import { authenticateToken } from '../middleware/auth.js';
import { 
  logTaskActivity, 
  logAssignmentActivity, 
  logStatusChangeActivity,
  logPriorityChangeActivity,
  logDueDateChangeActivity
} from '../utils/activityService.js';
import {
  taskCreateSchema,
  taskUpdateSchema,
  taskStatusUpdateSchema
} from '../../shared/schemas/task.js';
import { patternToRRule, getNextOccurrence, calculateDueDate } from '../utils/recurringTasks.js';
import { calculateDuration } from '../../shared/utils/durationUtils.js';
import NotificationService from '../utils/notificationService.js';

const router = express.Router();

router.use(authenticateToken);

// GET /api/tasks - Get all tasks for authenticated user
router.get('/', async (req, res) => {
  try {
    const { 
      status, 
      priority, 
      category, 
      assignees,
      search, 
      dueDateFrom,
      dueDateTo,
      sortBy = 'createdAt', 
      sortOrder = 'desc',
      page = 1,
      limit = 20
    } = req.query;
    
    const query = {
      $or: [
        { owner: req.user._id },
        { assignees: req.user._id }
      ]
    };
    
    if (search && search.trim()) {
      const searchRegex = new RegExp(search.trim(), 'i');
      query.$and = query.$and || [];
      query.$and.push({
        $or: [
          { title: searchRegex },
          { description: searchRegex }
        ]
      });
    }
    
    if (status) {
      const statusFilters = Array.isArray(status) ? status : [status];
      query.status = { $in: statusFilters };
    }
    if (priority) {
      const priorityFilters = Array.isArray(priority) ? priority : [priority];
      query.priority = { $in: priorityFilters };
    }
    if (category) {
      const categoryFilters = Array.isArray(category) ? category : [category];
      query.category = { $in: categoryFilters };
    }
    if (assignees) {
      const assigneeFilters = Array.isArray(assignees) ? assignees : [assignees];
      query.$and = query.$and || [];
      query.$and.push({
        assignees: { $in: assigneeFilters }
      });
    }
    
    if (dueDateFrom || dueDateTo) {
      query.dueDate = {};
      if (dueDateFrom) {
        query.dueDate.$gte = new Date(dueDateFrom);
      }
      if (dueDateTo) {
        query.dueDate.$lte = new Date(dueDateTo);
      }
    }
    
    // Add special due date filters
    if (req.query.dueDate) {
      const dueDateFilters = Array.isArray(req.query.dueDate) ? req.query.dueDate : [req.query.dueDate];
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000);
      const weekFromNow = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
      const monthFromNow = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000);
      
      const dueDateConditions = [];
      
      dueDateFilters.forEach(filter => {
        switch (filter) {
          case 'overdue':
            dueDateConditions.push({
              dueDate: { $lt: today },
              status: { $ne: 'done' }
            });
            break;
          case 'today':
            dueDateConditions.push({
              dueDate: { $gte: today, $lt: tomorrow }
            });
            break;
          case 'week':
            dueDateConditions.push({
              dueDate: { $gte: today, $lte: weekFromNow }
            });
            break;
          case 'month':
            dueDateConditions.push({
              dueDate: { $gte: today, $lte: monthFromNow }
            });
            break;
        }
      });
      
      if (dueDateConditions.length > 0) {
        query.$and = query.$and || [];
        query.$and.push({ $or: dueDateConditions });
      }
    }
    
    // Build sort object
    const sort = {};
    sort[sortBy] = sortOrder === 'asc' ? 1 : -1;
    
    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit)));
    const skip = (pageNum - 1) * limitNum;
    const totalTasks = await Task.countDocuments(query);
    
    const tasks = await Task.find(query)
      .populate('category', 'name color')
      .populate('owner', 'fullName email')
      .populate('assignees', 'fullName email')
      .sort(sort)
      .skip(skip)
      .limit(limitNum);
    
    // Add permission info for each task
    const tasksWithPermissions = tasks.map(task => {
      const taskObj = task.toObject();
      taskObj.userPermission = task.getUserPermission(req.user._id);
      return taskObj;
    });
    
    // Calculate pagination metadata
    const totalPages = Math.ceil(totalTasks / limitNum);
    const hasNextPage = pageNum < totalPages;
    const hasPrevPage = pageNum > 1;
    
    res.json({
      tasks: tasksWithPermissions,
      pagination: {
        currentPage: pageNum,
        totalPages,
        totalTasks,
        limit: limitNum,
        hasNextPage,
        hasPrevPage,
        nextPage: hasNextPage ? pageNum + 1 : null,
        prevPage: hasPrevPage ? pageNum - 1 : null
      }
    });
  } catch (error) {
    console.error('Error fetching tasks:', error);
    res.status(500).json({ error: 'Failed to fetch tasks' });
  }
});

// GET /api/tasks/:id - Get specific task
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: 'Invalid task ID' });
    }
    
    const task = await Task.findById(id)
      .populate('category', 'name color')
      .populate('owner', 'fullName email')
;
    
    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }
    
    // Check if user has access to this task
    if (!task.hasAccess(req.user._id)) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    const taskObj = task.toObject();
    taskObj.userPermission = task.getUserPermission(req.user._id);
    
    res.json(taskObj);
  } catch (error) {
    console.error('Error fetching task:', error);
    res.status(500).json({ error: 'Failed to fetch task' });
  }
});

//  POST /api/tasks - Create new task
router.post('/', async (req, res) => {
  try {
    // Validate request body
    const validatedData = taskCreateSchema.parse(req.body);
    console.log('Validated data:', JSON.stringify(validatedData, null, 2));
    
    // Validate category if provided
    if (validatedData.category && validatedData.category.trim() !== '') {
      if (!mongoose.Types.ObjectId.isValid(validatedData.category)) {
        return res.status(400).json({ error: 'Invalid category ID' });
      }
      
      const category = await Category.findOne({
        _id: validatedData.category,
        owner: req.user._id
      });
      
      if (!category) {
        return res.status(400).json({ error: 'Category not found or access denied' });
      }
    }
    
    // Validate assignees if provided
    let assigneeIds = [];
    if (validatedData.assignees && validatedData.assignees.length > 0) {
      assigneeIds = validatedData.assignees.filter(id => mongoose.Types.ObjectId.isValid(id));
      if (assigneeIds.length !== validatedData.assignees.length) {
        return res.status(400).json({ error: 'Invalid assignee ID(s)' });
      }
      
      const assignees = await User.find({ _id: { $in: assigneeIds } });
      if (assignees.length !== assigneeIds.length) {
        return res.status(400).json({ error: 'One or more assignees not found' });
      }
    }
    
    const taskData = {
      ...validatedData,
      owner: req.user._id,
      assignees: assigneeIds,
      category: validatedData.category && validatedData.category.trim() !== '' ? validatedData.category : undefined
    };

    // Handle duration and due date logic
    if (validatedData.startDate) {
      taskData.startDate = new Date(validatedData.startDate);
    } else {
      taskData.startDate = new Date();
    }

    if (validatedData.duration) {
      taskData.duration = validatedData.duration;
      taskData.dueDate = calculateDueDate(taskData.startDate, validatedData.duration);
    } else if (validatedData.dueDate) {
      taskData.dueDate = new Date(validatedData.dueDate);
      taskData.duration = calculateDuration(taskData.startDate, taskData.dueDate);
    }
    
    // Validate date logic
    if (taskData.startDate && taskData.dueDate && taskData.startDate >= taskData.dueDate) {
      return res.status(400).json({ error: 'Start date must be before due date' });
    }
    
    // Handle recurring tasks
    if (validatedData.isRecurring && validatedData.recurringPattern) {
      try {
        // Validate that duration is provided for recurring tasks
        if (!validatedData.duration) {
          return res.status(400).json({ error: 'Duration is required for recurring tasks' });
        }
        
        // Convert pattern to RRule string
        const rruleString = patternToRRule(validatedData.recurringPattern, taskData.startDate);
        taskData.recurringPattern = validatedData.recurringPattern;
        
        // Calculate next occurrence for the recurring pattern
        const nextOccurrence = getNextOccurrence(rruleString, taskData.startDate);
        if (!nextOccurrence) {
          return res.status(400).json({ error: 'Invalid recurring pattern - no future occurrences' });
        }
        
        taskData.recurrenceVersion = 1;
        taskData.lastRecurrenceUpdate = new Date();
      } catch (rruleError) {
        console.error('RRule error:', rruleError);
        return res.status(400).json({ error: 'Invalid recurring pattern configuration: ' + rruleError.message });
      }
    }
    
    const task = new Task(taskData);
    await task.save();
    
    // Create RecurringPattern record if this is a recurring task
    if (task.isRecurring && task.recurringPattern) {
      const rruleString = patternToRRule(task.recurringPattern, task.startDate);
      const nextOccurrence = getNextOccurrence(rruleString, task.startDate);
      
      const recurringPattern = new RecurringPattern({
        task: task._id,
        rrule: rruleString,
        instanceDuration: task.duration,
        timezone: task.recurringPattern.timezone || 'UTC',
        nextDue: nextOccurrence,
        lastGenerated: new Date(),
        patternVersion: 1,
        endDate: task.recurringPattern.endDate ? new Date(task.recurringPattern.endDate) : null,
        endOccurrences: task.recurringPattern.endOccurrences || null
      });
      
      await recurringPattern.save();
    }
    
    // Populate the created task
    await task.populate('category', 'name color');
    await task.populate('owner', 'fullName email');
    await task.populate('assignees', 'fullName email');
    
    // Create notifications for assignees (excluding the task owner)
    if (task.assignees && task.assignees.length > 0) {
      try {
        const assigneeNotifications = [];
        for (const assigneeId of task.assignees) {
          // Don't notify the task owner if they're also an assignee
          if (assigneeId.toString() !== req.user._id.toString()) {
            const assignee = await User.findById(assigneeId);
            if (assignee) {
              const notification = await NotificationService.createTaskAssignmentNotification(
                task, 
                assignee, 
                req.user
              );
              assigneeNotifications.push(notification);
            }
          }
        }
        console.log(`Created ${assigneeNotifications.length} assignment notifications`);
      } catch (notificationError) {
        console.error('Error creating assignment notifications:', notificationError);
        // Don't fail the task creation if notifications fail
      }
    }
    
    // Log activity for task creator
    await logTaskActivity(
      'task_created',
      req.user._id,
      task._id,
      `Created task "${task.title}"`,
      { 
        status: task.status,
        priority: task.priority,
        category: task.category?.name,
        assignees: task.assignees?.length || 0
      }
    );
    
    // Log activity for assignees (excluding the task owner)
    if (task.assignees && task.assignees.length > 0) {
      try {
        for (const assigneeId of task.assignees) {
          // Don't log activity for the task owner if they're also an assignee
          if (assigneeId.toString() !== req.user._id.toString()) {
            const assignee = await User.findById(assigneeId);
            const assigneeName = assignee ? assignee.fullName : 'Unknown User';
            
            await logAssignmentActivity(
              req.user._id,
              task._id,
              assigneeId,
              `Assigned task "${task.title}" to ${assigneeName}`,
              { 
                taskTitle: task.title,
                status: task.status,
                priority: task.priority
              }
            );
          }
        }
        console.log(`Logged assignment activities for ${task.assignees.length} assignees`);
      } catch (activityError) {
        console.error('Error logging assignment activities:', activityError);
        // Don't fail the task creation if activity logging fails
      }
    }
    
    const taskObj = task.toObject();
    taskObj.userPermission = 'owner';
    
    res.status(201).json(taskObj);
  } catch (error) {
    if (error.name === 'ZodError') {
      console.log('=== VALIDATION ERROR ===');
      console.log('Validation errors:', error.errors);
      console.log('Raw request body:', JSON.stringify(req.body, null, 2));
      
      const validationErrors = error.errors.map(e => ({
        field: e.path.join('.'),
        message: e.message,
        received: e.received,
        expected: e.expected || 'valid value'
      }));
      
      return res.status(400).json({ 
        error: 'Validation error', 
        message: 'Please check the form fields and try again',
        details: validationErrors,
        receivedData: req.body
      });
    }
    
    console.error('=== TASK CREATION ERROR ===');
    console.error('Error name:', error.name);
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);
    console.error('Request body:', JSON.stringify(req.body, null, 2));
    console.error('User ID:', req.user?._id);
    
    res.status(500).json({ 
      error: 'Failed to create task',
      message: error.message || 'Internal server error',
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// PUT /api/tasks/:id - Update task
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: 'Invalid task ID' });
    }
    
    const validatedData = taskUpdateSchema.parse(req.body);
    
    const task = await Task.findById(id);
    
    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }
    
    if (!task.hasAccess(req.user._id, 'edit')) {
      return res.status(403).json({ error: 'Edit access denied' });
    }
    
    // Validate category if provided
    if (validatedData.category) {
      if (!mongoose.Types.ObjectId.isValid(validatedData.category)) {
        return res.status(400).json({ error: 'Invalid category ID' });
      }
      
      const category = await Category.findOne({
        _id: validatedData.category,
        owner: req.user._id
      });
      
      if (!category) {
        return res.status(400).json({ error: 'Category not found or access denied' });
      }
    }
    
    // Prepare update data with duration handling
    const updateData = { ...validatedData };
    const currentStartDate = task.startDate || new Date();
    
    if (validatedData.startDate) {
      updateData.startDate = new Date(validatedData.startDate);
    }
    
    // Handle duration vs due date logic
    if (validatedData.duration) {
      updateData.duration = validatedData.duration;
      const startDate = updateData.startDate || currentStartDate;
      updateData.dueDate = calculateDueDate(startDate, validatedData.duration);
    } else if (validatedData.dueDate) {
      updateData.dueDate = new Date(validatedData.dueDate);
      if (!validatedData.duration) {
        const startDate = updateData.startDate || currentStartDate;
        updateData.duration = calculateDuration(startDate, updateData.dueDate);
      }
    } else if (validatedData.startDate && task.duration) {
      updateData.dueDate = calculateDueDate(updateData.startDate, task.duration);
    }
    
    // Validate date logic
    const newStartDate = updateData.startDate || task.startDate;
    const newDueDate = updateData.dueDate || task.dueDate;
    
    if (newStartDate && newDueDate && newStartDate >= newDueDate) {
      return res.status(400).json({ error: 'Start date must be before due date' });
    }
    if (validatedData.isRecurring === true && !validatedData.duration && !task.duration) {
      return res.status(400).json({ error: 'Duration is required for recurring tasks' });
    }
    if (validatedData.isRecurring && validatedData.recurringPattern) {
      const pattern = validatedData.recurringPattern;

      if (pattern.frequency === 'weekly' && (!pattern.daysOfWeek || pattern.daysOfWeek.length === 0)) {
        return res.status(400).json({ error: 'Weekly recurrence must specify days of week' });
      }

      if (pattern.frequency === 'monthly' && !pattern.dayOfMonth) {
        return res.status(400).json({ error: 'Monthly recurrence must specify day of month' });
      }

      if (pattern.endDate && pattern.endOccurrences) {
        return res.status(400).json({ error: 'Cannot specify both end date and end occurrences' });
      }

      if (pattern.endDate) {
        const startDate = newStartDate || currentStartDate;
        const endDate = new Date(pattern.endDate);
        if (startDate >= endDate) {
          return res.status(400).json({ error: 'End date must be after start date' });
        }
      }
    }
    
    // Enforce assignee modification permissions:
    // - Only the owner can change the assignees list
    // - Assignees may only self-unassign (remove their own ID), not add or remove others
    if (Array.isArray(updateData.assignees)) {
      const isOwner = task.owner.toString() === req.user._id.toString();
      if (!isOwner) {
        // Compare requested assignees vs current
        const currentSet = new Set(task.assignees.map(a => a.toString()));
        const requestedSet = new Set(updateData.assignees.map(a => a.toString()));

        // Determine additions and removals
        const additions = updateData.assignees.filter(id => !currentSet.has(id.toString()));
        const removals = task.assignees.filter(id => !requestedSet.has(id.toString()));

        // Allow only self removal and no additions
        const onlySelfRemoval =
          additions.length === 0 &&
          removals.every(id => id.toString() === req.user._id.toString());

        if (!onlySelfRemoval) {
          return res.status(403).json({ error: 'Only the owner can modify assignees. Assignees may only remove themselves.' });
        }
      }
    }

    // Handle recurring task updates
    const isRecurringTask = task.isRecurring || updateData.isRecurring;
    const isEditingRecurring = isRecurringTask && validatedData.editScope;
    
    if (isEditingRecurring) {
      const editScope = validatedData.editScope || 'this_instance';
      
      try {
        const { handleRecurringTaskEdit, trackRecurrenceChanges } = await import('../utils/recurringTasks.js');
        
        const changes = trackRecurrenceChanges(task, updateData);
        
        if (changes.hasPatternChanges || changes.hasDurationChanges || changes.hasTimingChanges) {
          updateData.recurrenceVersion = (task.recurrenceVersion || 1) + 1;
          updateData.lastRecurrenceUpdate = new Date();
          
          if (updateData.recurringPattern) {
            const startDate = updateData.startDate || task.startDate || new Date();
            const rruleString = patternToRRule(updateData.recurringPattern, startDate);
            await RecurringPattern.updateOne(
              { task: task._id },
              {
                rrule: rruleString,
                instanceDuration: updateData.duration || task.duration,
                timezone: updateData.recurringPattern.timezone || 'UTC',
                patternVersion: updateData.recurrenceVersion,
                endDate: updateData.recurringPattern.endDate ? new Date(updateData.recurringPattern.endDate) : null,
                endOccurrences: updateData.recurringPattern.endOccurrences || null,
                nextDue: getNextOccurrence(rruleString, startDate)
              }
            );
          }
        }
        
        // Handle the recurring task edit with the specified scope
        const editResult = await handleRecurringTaskEdit(
          task,
          updateData,
          editScope
        );
        
        // If we created a new instance (for 'this_instance' scope), return that instead
        if (editResult.createdTasks.length > 0) {
          const newInstance = editResult.createdTasks[0];
          await newInstance.populate('category', 'name color');
          await newInstance.populate('owner', 'fullName email');
          await newInstance.populate('assignees', 'fullName email');
          
          const taskObj = newInstance.toObject();
          taskObj.userPermission = newInstance.getUserPermission(req.user._id);
          
          return res.json(taskObj);
        }
        
        // Otherwise, the task was updated in place
        // Reload the task to get the latest data
        await task.populate('category', 'name color');
        await task.populate('owner', 'fullName email');
        await task.populate('assignees', 'fullName email');
        
        const taskObj = task.toObject();
        taskObj.userPermission = task.getUserPermission(req.user._id);
        
        return res.json(taskObj);
        
      } catch (rruleError) {
        console.error('Recurring task edit error:', rruleError);
        return res.status(400).json({ error: 'Failed to update recurring task: ' + rruleError.message });
      }
    }
    
    // Track changes for activity logging and notifications
    const oldPriority = task.priority;
    const oldDueDate = task.dueDate;
    const oldStatus = task.status;
    const originalAssigneeIds = (task.assignees || []).map(a => a.toString());
    
    // Update the task
    Object.assign(task, updateData);
    await task.save();
    await task.populate('assignees', 'fullName email');
    
    // Log status change activity
    if (oldStatus !== task.status) {
      await logStatusChangeActivity(
        req.user._id,
        task._id,
        oldStatus,
        task.status,
        `Changed task status from "${oldStatus}" to "${task.status}"`,
        { taskTitle: task.title }
      );
    }

    // Notifications for assignment changes
    if (Array.isArray(updateData.assignees)) {
      const updatedAssigneeIds = (task.assignees || []).map(u => u._id?.toString?.() || u.toString());
      const addedAssigneeIds = updatedAssigneeIds.filter(id => !originalAssigneeIds.includes(id));
      const removedAssigneeIds = originalAssigneeIds.filter(id => !updatedAssigneeIds.includes(id));

      // Notify newly added assignees (reuse existing helper)
      if (addedAssigneeIds.length > 0) {
        try {
          await Promise.all(
            addedAssigneeIds.map(async userId => {
              const user = await User.findById(userId);
              if (user && user._id.toString() !== req.user._id.toString()) {
                return NotificationService.createTaskAssignmentNotification(task, user, req.user);
              }
            })
          );
        } catch (e) {
          console.error('Error creating assignment notifications on update:', e);
        }
      }

      // Notify users who were removed
      if (removedAssigneeIds.length > 0) {
        try {
          await Promise.all(
            removedAssigneeIds.map(async userId => {
              const user = await User.findById(userId);
              if (user && user._id.toString() !== req.user._id.toString()) {
                return NotificationService.createTaskUnassignedNotification(task, user, req.user);
              }
            })
          );
        } catch (e) {
          console.error('Error creating unassignment notifications:', e);
        }
      }
    }

    // Log specific activity types for important changes
    if (oldPriority !== task.priority) {
      await logPriorityChangeActivity(
        req.user._id,
        task._id,
        oldPriority,
        task.priority,
        `Changed task priority from "${oldPriority}" to "${task.priority}"`,
        { taskTitle: task.title }
      );
    }
    
    // Notifications for status change
    if (oldStatus !== task.status) {
      try {
        const recipients = (task.assignees || [])
          .filter(u => u._id.toString() !== req.user._id.toString());
        await Promise.all(
          recipients.map(user =>
            NotificationService.createTaskStatusChangeNotification(
              task, user, req.user, oldStatus, task.status
            )
          )
        );
      } catch (e) {
        console.error('Error creating status change notifications:', e);
      }
    }

    // Notifications for priority change
    if (oldPriority !== task.priority) {
      try {
        const recipients = (task.assignees || [])
          .filter(u => u._id.toString() !== req.user._id.toString());
        await Promise.all(
          recipients.map(user =>
            NotificationService.createTaskPriorityChangeNotification(
              task, user, req.user, oldPriority, task.priority
            )
          )
        );
      } catch (e) {
        console.error('Error creating priority change notifications:', e);
      }
    }

    if (oldDueDate?.getTime() !== task.dueDate?.getTime()) {
      await logDueDateChangeActivity(
        req.user._id,
        task._id,
        oldDueDate,
        task.dueDate,
        `Changed task due date from "${oldDueDate?.toLocaleDateString() || 'No date'}" to "${task.dueDate?.toLocaleDateString() || 'No date'}"`,
        { taskTitle: task.title }
      );
    }
    
    // Log general update activity
    await logTaskActivity(
      'task_updated',
      req.user._id,
      task._id,
      `Updated task "${task.title}"`,
      { 
        updatedFields: Object.keys(updateData),
        status: task.status,
        priority: task.priority
      }
    );
    
    // Populate the updated task
    await task.populate('category', 'name color');
    await task.populate('owner', 'fullName email');
    
    const taskObj = task.toObject();
    taskObj.userPermission = task.getUserPermission(req.user._id);
    
    res.json(taskObj);
  } catch (error) {
    if (error.name === 'ZodError') {
      return res.status(400).json({ 
        error: 'Validation error', 
        details: error.errors.map(e => e.message) 
      });
    }
    
    console.error('Error updating task:', error);
    res.status(500).json({ error: 'Failed to update task' });
  }
});

// PUT /api/tasks/:id/status - Update task status only
router.put('/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: 'Invalid task ID' });
    }
    
    // Validate request body
    const { status } = taskStatusUpdateSchema.parse(req.body);
    
    const task = await Task.findById(id);
    
    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }
    
    // Check if user has edit access
    if (!task.hasAccess(req.user._id, 'edit')) {
      return res.status(403).json({ error: 'Edit access denied' });
    }
    
    const oldStatus = task.status;
    task.status = status;
    await task.save();
    await task.populate('assignees', 'fullName email');
    
    // Log status change activity
    await logStatusChangeActivity(
      req.user._id,
      task._id,
      oldStatus,
      status,
      `Changed task status from "${oldStatus}" to "${status}"`,
      { taskTitle: task.title }
    );

    try {
      const recipients = (task.assignees || [])
        .filter(u => u._id.toString() !== req.user._id.toString());
      await Promise.all(
        recipients.map(user =>
          NotificationService.createTaskStatusChangeNotification(
            task, user, req.user, oldStatus, status
          )
        )
      );
    } catch (e) {
      console.error('Error creating status change notifications:', e);
    }
    
    // Populate the updated task
    await task.populate('category', 'name color');
    await task.populate('owner', 'fullName email');
    
    const taskObj = task.toObject();
    taskObj.userPermission = task.getUserPermission(req.user._id);
    
    res.json(taskObj);
  } catch (error) {
    if (error.name === 'ZodError') {
      return res.status(400).json({ 
        error: 'Validation error', 
        details: error.errors.map(e => e.message) 
      });
    }
    
    console.error('Error updating task status:', error);
    res.status(500).json({ error: 'Failed to update task status' });
  }
});

// DELETE /api/tasks/:id - Delete task
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { deleteScope = 'this_instance' } = req.query;
    
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: 'Invalid task ID' });
    }
    
    const task = await Task.findById(id);
    
    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }
    
    // Only owner can delete tasks
    if (task.owner.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: 'Only task owner can delete tasks' });
    }
    
    // Handle recurring task deletion
    if (task.isRecurring || task.parentTask) {
      try {
        const { handleRecurringTaskDelete } = await import('../utils/recurringTasks.js');
        
        const deleteResult = await handleRecurringTaskDelete(
          task,
          deleteScope
        );
        
        res.json({ 
          message: 'Recurring task deleted successfully',
          deletedTasks: deleteResult.deletedTasks.length,
          deletedPatterns: deleteResult.deletedPatterns.length
        });
      } catch (deleteError) {
        console.error('Recurring task delete error:', deleteError);
        return res.status(500).json({ error: 'Failed to delete recurring task: ' + deleteError.message });
      }
    } else {
      // Log activity before deletion
      await logTaskActivity(
        'task_deleted',
        req.user._id,
        task._id,
        `Deleted task "${task.title}"`,
        { 
          status: task.status,
          priority: task.priority,
          category: task.category?.toString()
        }
      );
      
      // Regular task deletion
      await Task.findByIdAndDelete(id);
      res.json({ message: 'Task deleted successfully' });
    }
  } catch (error) {
    console.error('Error deleting task:', error);
    res.status(500).json({ error: 'Failed to delete task' });
  }
});




// GET /api/tasks/:id/recurring - Get recurring pattern information for a task
router.get('/:id/recurring', async (req, res) => {
  try {
    const { id } = req.params;
    
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: 'Invalid task ID' });
    }
    
    const task = await Task.findById(id);
    
    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }
    
    // Check if user has access to this task
    if (!task.hasAccess(req.user._id)) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    const isRecurringTask = task.isRecurring || task.parentTask;
    
    if (!isRecurringTask) {
      return res.status(400).json({ error: 'Task is not part of a recurring series' });
    }
    
    // Get the parent task and pattern
    const parentTaskId = task.parentTask || task._id;
    const parentTask = task.parentTask ? await Task.findById(task.parentTask) : task;
    const recurringPattern = await RecurringPattern.findOne({ task: parentTaskId });
    
    if (!recurringPattern) {
      return res.status(404).json({ error: 'Recurring pattern not found' });
    }
    
    // Get all instances of this recurring task
    const instances = await Task.find({ parentTask: parentTaskId })
      .select('_id title status dueDate createdAt')
      .sort({ dueDate: 1 });
    
    res.json({
      isInstance: !!task.parentTask,
      parentTask: parentTask ? {
        _id: parentTask._id,
        title: parentTask.title,
        isRecurring: parentTask.isRecurring
      } : null,
      pattern: {
        rrule: recurringPattern.rrule,
        nextDue: recurringPattern.nextDue,
        lastGenerated: recurringPattern.lastGenerated,
        isActive: recurringPattern.isActive
      },
      instances: instances,
      editOptions: [
        {
          scope: 'this_instance',
          label: 'Only this instance',
          description: 'Changes will only apply to this specific occurrence'
        },
        {
          scope: 'this_and_future',
          label: 'This and future instances',
          description: 'Changes will apply to this occurrence and all future ones'
        },
        {
          scope: 'all_instances',
          label: 'All instances',
          description: 'Changes will apply to all past, current, and future occurrences'
        }
      ]
    });
  } catch (error) {
    console.error('Error fetching recurring pattern:', error);
    res.status(500).json({ error: 'Failed to fetch recurring pattern' });
  }
});

// GET /api/tasks/filters - Get available filter options
router.get('/filters', async (req, res) => {
  try {
    // Get all categories for the user
    const categories = await Category.find({ owner: req.user._id })
      .select('name color')
      .sort({ name: 1 });
    
    // Get all users that have shared tasks with this user or vice versa
    const userTasks = await Task.find({
      $or: [
        { owner: req.user._id },
        { assignees: req.user._id }
      ]
    }).populate('owner', 'fullName email').populate('assignees', 'fullName email');
    
    // Extract unique users from tasks
    const usersSet = new Set();
    userTasks.forEach(task => {
      if (task.owner) {
        usersSet.add(JSON.stringify({
          _id: task.owner._id,
          fullName: task.owner.fullName,
          email: task.owner.email
        }));
      }
      task.assignees.forEach(assignee => {
        if (assignee) {
          usersSet.add(JSON.stringify({
            _id: assignee._id,
            fullName: assignee.fullName,
            email: assignee.email
          }));
        }
      });
    });
    
    const users = Array.from(usersSet).map(userStr => JSON.parse(userStr));
    
    // Get task statistics for filter counts
    const taskStats = await Task.aggregate([
      {
        $match: {
          $or: [
            { owner: req.user._id },
            { assignees: req.user._id }
          ]
        }
      },
      {
        $group: {
          _id: null,
          totalTasks: { $sum: 1 },
          statusCounts: {
            $push: {
              status: '$status',
              priority: '$priority'
            }
          }
        }
      }
    ]);
    
    const stats = taskStats[0] || { totalTasks: 0, statusCounts: [] };
    
    // Count by status and priority
    const statusCounts = {};
    const priorityCounts = {};
    
    stats.statusCounts.forEach(item => {
      statusCounts[item.status] = (statusCounts[item.status] || 0) + 1;
      priorityCounts[item.priority] = (priorityCounts[item.priority] || 0) + 1;
    });
    
    res.json({
      categories: categories,
      users: users,
      statistics: {
        total: stats.totalTasks,
        byStatus: statusCounts,
        byPriority: priorityCounts
      },
      filterOptions: {
        status: [
          { value: 'todo', label: 'To Do', count: statusCounts.todo || 0 },
          { value: 'in_progress', label: 'In Progress', count: statusCounts.in_progress || 0 },
          { value: 'done', label: 'Done', count: statusCounts.done || 0 }
        ],
        priority: [
          { value: 'urgent', label: 'Urgent', count: priorityCounts.urgent || 0 },
          { value: 'high', label: 'High', count: priorityCounts.high || 0 },
          { value: 'medium', label: 'Medium', count: priorityCounts.medium || 0 },
          { value: 'low', label: 'Low', count: priorityCounts.low || 0 }
        ],
        dueDate: [
          { value: 'overdue', label: 'Overdue' },
          { value: 'today', label: 'Due Today' },
          { value: 'week', label: 'Due This Week' },
          { value: 'month', label: 'Due This Month' }
        ]
      }
    });
  } catch (error) {
    console.error('Error fetching filter options:', error);
    res.status(500).json({ error: 'Failed to fetch filter options' });
  }
});

// GET /api/tasks/search - Dedicated search endpoint with enhanced features
router.get('/search', async (req, res) => {
  try {
    const { q: query, limit = 50 } = req.query;
    
    if (!query || query.trim().length < 2) {
      return res.status(400).json({ error: 'Search query must be at least 2 characters long' });
    }
    
    // Build search query for tasks user owns or has access to
    const searchQuery = {
      $or: [
        { owner: req.user._id },
        { assignees: req.user._id }
      ]
    };
    
    // Add text search
    const searchRegex = new RegExp(query.trim(), 'i');
    searchQuery.$and = [{
      $or: [
        { title: searchRegex },
        { description: searchRegex }
      ]
    }];
    
    const tasks = await Task.find(searchQuery)
      .populate('category', 'name color')
      .populate('owner', 'fullName email')
      .sort({ updatedAt: -1 })
      .limit(parseInt(limit));
    
    // Add permission info for each task
    const tasksWithPermissions = tasks.map(task => {
      const taskObj = task.toObject();
      taskObj.userPermission = task.getUserPermission(req.user._id);
      return taskObj;
    });
    
    res.json({
      query: query.trim(),
      results: tasksWithPermissions,
      count: tasksWithPermissions.length,
      hasMore: tasksWithPermissions.length === parseInt(limit)
    });
  } catch (error) {
    console.error('Error searching tasks:', error);
    res.status(500).json({ error: 'Failed to search tasks' });
  }
});

// POST /api/tasks/:id/recurring/preview - Preview changes for recurring task edit
router.post('/:id/recurring/preview', async (req, res) => {
  try {
    const { id } = req.params;
    const { editScope, updateData } = req.body;
    
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: 'Invalid task ID' });
    }
    
    if (!editScope || !['this_instance', 'this_and_future', 'all_instances'].includes(editScope)) {
      return res.status(400).json({ error: 'Valid editScope is required' });
    }
    
    const task = await Task.findById(id);
    
    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }
    
    // Check if user has access to this task
    if (!task.hasAccess(req.user._id, 'edit')) {
      return res.status(403).json({ error: 'Edit access denied' });
    }
    
    const isRecurringTask = task.isRecurring || task.parentTask;
    
    if (!isRecurringTask) {
      return res.status(400).json({ error: 'Task is not part of a recurring series' });
    }
    
    // Get the parent task and instances
    const parentTaskId = task.parentTask || task._id;
    const parentTask = task.parentTask ? await Task.findById(task.parentTask) : task;
    const instances = await Task.find({ parentTask: parentTaskId })
      .select('_id title status dueDate')
      .sort({ dueDate: 1 });
    
    // Calculate what would be affected
    let affectedTasks = [];
    let description = '';
    
    switch (editScope) {
      case 'this_instance':
        affectedTasks = [task._id];
        description = 'Only this specific occurrence will be modified. The recurring pattern will remain unchanged.';
        break;
        
      case 'this_and_future':
        if (task.parentTask) {
          affectedTasks = [task._id];
          description = 'This occurrence will be modified and the recurring pattern will be updated for future occurrences.';
        } else {
          affectedTasks = [task._id];
          description = 'The recurring pattern will be updated, affecting all future occurrences.';
        }
        break;
        
      case 'all_instances':
        affectedTasks = [parentTask._id, ...instances.map(i => i._id)];
        description = 'All occurrences (past, current, and future) will be modified.';
        break;
    }
    
    res.json({
      editScope,
      description,
      affectedTasksCount: affectedTasks.length,
      affectedTasks: affectedTasks,
      currentTask: {
        _id: task._id,
        title: task.title,
        isInstance: !!task.parentTask
      },
      parentTask: parentTask ? {
        _id: parentTask._id,
        title: parentTask.title
      } : null,
      instancesCount: instances.length
    });
  } catch (error) {
    console.error('Error previewing recurring task edit:', error);
    res.status(500).json({ error: 'Failed to preview recurring task edit' });
  }
});

export default router;