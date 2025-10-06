import pkg from 'rrule';
const { RRule } = pkg;
import { addToDate, calculateDuration as calculateDurationFromDates } from '../../shared/utils/durationUtils.js';
import RecurringPattern from '../models/RecurringPattern.js';
import Task from '../models/Task.js';

/**
 *  Convert recurring pattern object to RRule string
 * @param {Object} pattern - The recurring pattern object
 * @param {Date} startDate - The start date for the recurrence
 * @returns {string} RRule string
 */
export function patternToRRule(pattern, startDate) {
  if (!pattern || !startDate) {
    throw new Error('Pattern and start date are required');
  }

  const options = {
    dtstart: new Date(startDate)
  };

  //  Handle new frequency format
  switch (pattern.frequency) {
    case 'daily':
      options.freq = RRule.DAILY;
      if (pattern.interval && pattern.interval > 1) {
        options.interval = pattern.interval;
      }
      break;

    case 'weekly':
      options.freq = RRule.WEEKLY;
      if (pattern.interval && pattern.interval > 1) {
        options.interval = pattern.interval;
      }
      if (pattern.daysOfWeek && pattern.daysOfWeek.length > 0) {
        // Convert Sunday=0 to Monday=0 format for RRule
        options.byweekday = pattern.daysOfWeek.map(day =>
          day === 0 ? RRule.SU :
          day === 1 ? RRule.MO :
          day === 2 ? RRule.TU :
          day === 3 ? RRule.WE :
          day === 4 ? RRule.TH :
          day === 5 ? RRule.FR :
          RRule.SA
        );
      } else {
        throw new Error('Weekly recurrence must specify days of week');
      }
      break;

    case 'monthly':
      options.freq = RRule.MONTHLY;
      if (pattern.interval && pattern.interval > 1) {
        options.interval = pattern.interval;
      }
      if (pattern.dayOfMonth) {
        options.bymonthday = pattern.dayOfMonth;
      } else {
        throw new Error('Monthly recurrence must specify day of month');
      }
      break;

    case 'yearly':
      options.freq = RRule.YEARLY;
      if (pattern.interval && pattern.interval > 1) {
        options.interval = pattern.interval;
      }
      break;

    default:
      throw new Error(`Unsupported recurring pattern frequency: ${pattern.frequency}`);
  }

  //  Handle end conditions with proper validation
  if (pattern.endDate && pattern.endOccurrences) {
    throw new Error('Cannot specify both end date and end occurrences');
  }

  if (pattern.endDate) {
    const endDate = new Date(pattern.endDate);
    if (endDate <= startDate) {
      throw new Error('End date must be after start date');
    }
    options.until = endDate;
  } else if (pattern.endOccurrences) {
    if (pattern.endOccurrences < 1) {
      throw new Error('End occurrences must be at least 1');
    }
    options.count = pattern.endOccurrences;
  }

  const rule = new RRule(options);
  return rule.toString();
}

/**
 *  Calculate due date from start date and duration
 * @param {Date} startDate - Start date
 * @param {Object} duration - Duration object
 * @returns {Date} Due date
 */
export function calculateDueDate(startDate, duration) {
  if (!startDate || !duration) return null;
  
  try {
    return addToDate(startDate, duration);
  } catch (error) {
    console.error('Error calculating due date:', error);
    return null;
  }
}

/**
 * Get the next occurrence date from an RRule string
 * @param {string} rruleString - The RRule string
 * @param {Date} after - Get next occurrence after this date (default: now)
 * @returns {Date|null} Next occurrence date or null if no more occurrences
 */
export function getNextOccurrence(rruleString, after = new Date()) {
  try {
    const rule = RRule.fromString(rruleString);
    return rule.after(after);
  } catch (error) {
    console.error('Error parsing RRule:', error);
    return null;
  }
}


/**
 *  Track recurrence pattern changes
 * @param {Object} task - The task being updated
 * @param {Object} updateData - The update data
 * @returns {Object} Change tracking information
 */
export function trackRecurrenceChanges(task, updateData) {
  const changes = {
    hasPatternChanges: false,
    hasDurationChanges: false,
    hasTimingChanges: false,
    oldPattern: task.recurringPattern,
    newPattern: updateData.recurringPattern,
    oldDuration: task.duration,
    newDuration: updateData.duration,
    oldStartDate: task.startDate,
    newStartDate: updateData.startDate
  };

  // Check for pattern changes
  if (updateData.recurringPattern) {
    changes.hasPatternChanges = true;
  }

  // Check for duration changes
  if (updateData.duration) {
    changes.hasDurationChanges = true;
  }

  // Check for timing changes
  if (updateData.startDate && updateData.startDate !== task.startDate) {
    changes.hasTimingChanges = true;
  }

  return changes;
}

/**
 *  Handle recurring task editing with different scopes
 * @param {Object} task - The task being edited
 * @param {Object} updateData - The update data
 * @param {string} editScope - 'this_instance', 'this_and_future', or 'all_instances'
 * @param {Object} models - Object containing Task and RecurringPattern models
 * @returns {Object} Result object with updated tasks and patterns
 */
export async function handleRecurringTaskEdit(task, updateData, editScope) {
  const result = {
    updatedTasks: [],
    createdTasks: [],
    updatedPatterns: [],
    deletedPatterns: []
  };

  switch (editScope) {
    case 'this_instance':
      // Only edit this specific instance
      if (task.parentTask) {
        // This is already an instance, just update it
        Object.assign(task, updateData);
        // Remove recurring properties for this instance
        task.isRecurring = false;
        task.recurringPattern = null;
        await task.save();
        result.updatedTasks.push(task);
      } else {
        // This is the parent task, create a new instance and update the parent's next occurrence
        const instanceData = {
          ...task.toObject(),
          ...updateData,
          _id: undefined,
          parentTask: task._id,
          isRecurring: false,
          recurringPattern: null,
          createdAt: undefined,
          updatedAt: undefined
        };
        
        const instance = new Task(instanceData);
        await instance.save();
        result.createdTasks.push(instance);
        
        // Update the recurring pattern to skip this occurrence
        const recurringPattern = await RecurringPattern.findOne({ task: task._id });
        if (recurringPattern) {
          const nextOccurrence = getNextOccurrence(recurringPattern.rrule, task.dueDate || new Date());
          if (nextOccurrence) {
            recurringPattern.nextDue = nextOccurrence;
            await recurringPattern.save();
            result.updatedPatterns.push(recurringPattern);
          }
        }
      }
      break;

    case 'this_and_future':
      // Update this and all future instances by updating the parent pattern
      // and detaching the current instance from the series
      if (task.parentTask) {
        const parentTask = await Task.findById(task.parentTask);
        if (parentTask) {
          // Apply non-recurring field updates to the parent for future instances
          const parentUpdate = { ...updateData };
          delete parentUpdate.isRecurring;
          delete parentUpdate.recurringPattern;
          Object.assign(parentTask, parentUpdate);

          // If pattern is being updated, regenerate rrule and pattern fields
          if (updateData.recurringPattern) {
            const startDate = updateData.startDate || task.startDate || task.dueDate || new Date();
            const rruleString = patternToRRule(updateData.recurringPattern, startDate);
            parentTask.recurringPattern = rruleString;

            const recurringPattern = await RecurringPattern.findOne({ task: parentTask._id });
            if (recurringPattern) {
              recurringPattern.rrule = rruleString;
              recurringPattern.nextDue = getNextOccurrence(rruleString, startDate);
              await recurringPattern.save();
              result.updatedPatterns.push(recurringPattern);
            }
          }

          await parentTask.save();
          result.updatedTasks.push(parentTask);

          // Detach and update this instance independently
          const instanceUpdate = { ...updateData };
          Object.assign(task, instanceUpdate);
          task.isRecurring = false;
          task.recurringPattern = null;
          await task.save();
          result.updatedTasks.push(task);
        }
      } else {
        // Editing the parent: apply updates to parent so future instances inherit
        const parentUpdate = { ...updateData };
        delete parentUpdate.isRecurring;
        // Keep recurring status on parent
        Object.assign(task, parentUpdate);

        if (updateData.recurringPattern) {
          const startDate = updateData.startDate || task.startDate || task.dueDate || new Date();
          const rruleString = patternToRRule(updateData.recurringPattern, startDate);
          task.recurringPattern = rruleString;

          const recurringPattern = await RecurringPattern.findOne({ task: task._id });
          if (recurringPattern) {
            recurringPattern.rrule = rruleString;
            recurringPattern.nextDue = getNextOccurrence(rruleString, startDate);
            await recurringPattern.save();
            result.updatedPatterns.push(recurringPattern);
          }
        }

        await task.save();
        result.updatedTasks.push(task);
      }
      break;

    case 'all_instances':
      // Update all instances (past, present, and future)
      const parentTaskId = task.parentTask || task._id;
      const parentTask = task.parentTask ? await Task.findById(task.parentTask) : task;
      
      if (parentTask) {
        // Update the parent task
        Object.assign(parentTask, updateData);
        
        if (updateData.recurringPattern) {
          const startDate = updateData.startDate || parentTask.startDate || parentTask.dueDate || new Date();
          const rruleString = patternToRRule(updateData.recurringPattern, startDate);
          parentTask.recurringPattern = rruleString;
          
          // Update the recurring pattern
          const recurringPattern = await RecurringPattern.findOne({ task: parentTask._id });
          if (recurringPattern) {
            recurringPattern.rrule = rruleString;
            recurringPattern.nextDue = getNextOccurrence(rruleString, startDate);
            await recurringPattern.save();
            result.updatedPatterns.push(recurringPattern);
          }
        }
        
        await parentTask.save();
        result.updatedTasks.push(parentTask);
        
        // Update all existing instances
        const instances = await Task.find({ parentTask: parentTaskId });
        for (const instance of instances) {
          // Update non-recurring properties only
          const instanceUpdate = { ...updateData };
          delete instanceUpdate.isRecurring;
          delete instanceUpdate.recurringPattern;
          
          Object.assign(instance, instanceUpdate);
          await instance.save();
          result.updatedTasks.push(instance);
        }
      }
      break;

    default:
      throw new Error(`Invalid edit scope: ${editScope}`);
  }

  return result;
}

/**
 * Delete a recurring task with different scopes
 * @param {Object} task - The task being deleted
 * @param {string} deleteScope - 'this_instance', 'this_and_future', or 'all_instances'
 * @param {Object} models - Object containing Task and RecurringPattern models
 * @returns {Object} Result object with deleted tasks and patterns
 */
export async function handleRecurringTaskDelete(task, deleteScope) {
  const result = {
    deletedTasks: [],
    deletedPatterns: [],
    updatedPatterns: []
  };

  switch (deleteScope) {
    case 'this_instance':
      // Only delete this specific instance
      if (task.parentTask) {
        // This is an instance, just delete it
        await Task.findByIdAndDelete(task._id);
        result.deletedTasks.push(task._id);
      } else {
        // This is the parent task, we need to handle this carefully
        // For now, we'll just mark this occurrence as deleted by updating the next occurrence
        const recurringPattern = await RecurringPattern.findOne({ task: task._id });
        if (recurringPattern) {
          const nextOccurrence = getNextOccurrence(recurringPattern.rrule, task.dueDate || new Date());
          if (nextOccurrence) {
            recurringPattern.nextDue = nextOccurrence;
            await recurringPattern.save();
            result.updatedPatterns.push(recurringPattern);
          }
        }
      }
      break;

    case 'this_and_future':
      // Delete this and all future instances
      if (task.parentTask) {
        // This is an instance, delete the recurring pattern and this instance
        const parentTask = await Task.findById(task.parentTask);
        if (parentTask) {
          const recurringPattern = await RecurringPattern.findOne({ task: parentTask._id });
          if (recurringPattern) {
            await RecurringPattern.findByIdAndDelete(recurringPattern._id);
            result.deletedPatterns.push(recurringPattern._id);
          }
          
          // Update parent to not be recurring
          parentTask.isRecurring = false;
          parentTask.recurringPattern = null;
          await parentTask.save();
        }
        
        // Delete this instance
        await Task.findByIdAndDelete(task._id);
        result.deletedTasks.push(task._id);
      } else {
        // This is the parent task, delete the recurring pattern
        const recurringPattern = await RecurringPattern.findOne({ task: task._id });
        if (recurringPattern) {
          await RecurringPattern.findByIdAndDelete(recurringPattern._id);
          result.deletedPatterns.push(recurringPattern._id);
        }
        
        // Update task to not be recurring
        task.isRecurring = false;
        task.recurringPattern = null;
        await task.save();
      }
      break;

    case 'all_instances':
      // Delete all instances and the recurring pattern
      const parentTaskId = task.parentTask || task._id;
      const parentTask = task.parentTask ? await Task.findById(task.parentTask) : task;
      
      if (parentTask) {
        // Delete the recurring pattern
        const recurringPattern = await RecurringPattern.findOne({ task: parentTask._id });
        if (recurringPattern) {
          await RecurringPattern.findByIdAndDelete(recurringPattern._id);
          result.deletedPatterns.push(recurringPattern._id);
        }
        
        // Delete all instances
        const instances = await Task.find({ parentTask: parentTaskId });
        for (const instance of instances) {
          await Task.findByIdAndDelete(instance._id);
          result.deletedTasks.push(instance._id);
        }
        
        // Delete the parent task
        await Task.findByIdAndDelete(parentTask._id);
        result.deletedTasks.push(parentTask._id);
      }
      break;

    default:
      throw new Error(`Invalid delete scope: ${deleteScope}`);
  }

  return result;
}