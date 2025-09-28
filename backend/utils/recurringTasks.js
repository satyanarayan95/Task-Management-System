import pkg from 'rrule';
const { RRule } = pkg;

/**
 * Convert recurring pattern object to RRule string
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

  switch (pattern.type) {
    case 'daily':
      options.freq = RRule.DAILY;
      if (pattern.interval) {
        options.interval = pattern.interval;
      }
      break;

    case 'weekly':
      options.freq = RRule.WEEKLY;
      if (pattern.interval) {
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
      }
      break;

    case 'monthly':
      options.freq = RRule.MONTHLY;
      if (pattern.interval) {
        options.interval = pattern.interval;
      }
      if (pattern.dayOfMonth) {
        options.bymonthday = pattern.dayOfMonth;
      }
      break;

    case 'custom':
      // For custom patterns, we expect a more detailed configuration
      // This is a simplified implementation
      options.freq = RRule.DAILY;
      if (pattern.interval) {
        options.interval = pattern.interval;
      }
      break;

    default:
      throw new Error(`Unsupported recurring pattern type: ${pattern.type}`);
  }

  // Add end conditions
  if (pattern.endDate) {
    options.until = new Date(pattern.endDate);
  } else if (pattern.occurrences) {
    options.count = pattern.occurrences;
  }

  const rule = new RRule(options);
  return rule.toString();
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
 * Get all occurrences between two dates
 * @param {string} rruleString - The RRule string
 * @param {Date} start - Start date
 * @param {Date} end - End date
 * @returns {Date[]} Array of occurrence dates
 */
export function getOccurrencesBetween(rruleString, start, end) {
  try {
    const rule = RRule.fromString(rruleString);
    return rule.between(start, end);
  } catch (error) {
    console.error('Error parsing RRule:', error);
    return [];
  }
}

/**
 * Validate if an RRule string is valid
 * @param {string} rruleString - The RRule string to validate
 * @returns {boolean} True if valid, false otherwise
 */
export function validateRRule(rruleString) {
  try {
    RRule.fromString(rruleString);
    return true;
  } catch (error) {
    return false;
  }
}

/**
 * Convert RRule string back to a human-readable pattern object
 * @param {string} rruleString - The RRule string
 * @returns {Object} Pattern object with type and configuration
 */
export function rruleToPattern(rruleString) {
  try {
    const rule = RRule.fromString(rruleString);
    const options = rule.options;
    
    const pattern = {
      interval: options.interval || 1
    };

    switch (options.freq) {
      case RRule.DAILY:
        pattern.type = 'daily';
        break;
      case RRule.WEEKLY:
        pattern.type = 'weekly';
        if (options.byweekday) {
          // Convert RRule weekdays back to Sunday=0 format
          pattern.daysOfWeek = options.byweekday.map(day => {
            // Handle both object format and number format
            const dayNum = typeof day === 'object' ? day.weekday : day;
            if (dayNum === RRule.SU.weekday) return 0;
            if (dayNum === RRule.MO.weekday) return 1;
            if (dayNum === RRule.TU.weekday) return 2;
            if (dayNum === RRule.WE.weekday) return 3;
            if (dayNum === RRule.TH.weekday) return 4;
            if (dayNum === RRule.FR.weekday) return 5;
            if (dayNum === RRule.SA.weekday) return 6;
            return dayNum;
          });
        }
        break;
      case RRule.MONTHLY:
        pattern.type = 'monthly';
        if (options.bymonthday) {
          pattern.dayOfMonth = Array.isArray(options.bymonthday) 
            ? options.bymonthday[0] 
            : options.bymonthday;
        }
        break;
      default:
        pattern.type = 'custom';
    }

    if (options.until) {
      pattern.endDate = options.until.toISOString();
    }
    if (options.count) {
      pattern.occurrences = options.count;
    }

    return pattern;
  } catch (error) {
    console.error('Error parsing RRule to pattern:', error);
    return null;
  }
}
/*
*
 * Handle recurring task editing with different scopes
 * @param {Object} task - The task being edited
 * @param {Object} updateData - The update data
 * @param {string} editScope - 'this_instance', 'this_and_future', or 'all_instances'
 * @param {Object} models - Object containing Task and RecurringPattern models
 * @returns {Object} Result object with updated tasks and patterns
 */
export async function handleRecurringTaskEdit(task, updateData, editScope, models) {
  const { Task, RecurringPattern } = models;
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
      // Update this and all future instances
      if (task.parentTask) {
        // This is an instance, need to update the parent pattern
        const parentTask = await Task.findById(task.parentTask);
        if (parentTask) {
          // Update the parent task's recurring pattern
          if (updateData.recurringPattern) {
            const startDate = updateData.startDate || task.startDate || task.dueDate || new Date();
            const rruleString = patternToRRule(updateData.recurringPattern, startDate);
            parentTask.recurringPattern = rruleString;
            
            // Update other properties on parent
            Object.assign(parentTask, {
              title: updateData.title || parentTask.title,
              description: updateData.description || parentTask.description,
              priority: updateData.priority || parentTask.priority,
              category: updateData.category || parentTask.category
            });
            
            await parentTask.save();
            result.updatedTasks.push(parentTask);
            
            // Update the recurring pattern
            const recurringPattern = await RecurringPattern.findOne({ task: parentTask._id });
            if (recurringPattern) {
              recurringPattern.rrule = rruleString;
              recurringPattern.nextDue = getNextOccurrence(rruleString, startDate);
              await recurringPattern.save();
              result.updatedPatterns.push(recurringPattern);
            }
          }
          
          // Update this instance
          Object.assign(task, updateData);
          task.isRecurring = false;
          task.recurringPattern = null;
          await task.save();
          result.updatedTasks.push(task);
        }
      } else {
        // This is the parent task, update it and its pattern
        Object.assign(task, updateData);
        
        if (updateData.recurringPattern) {
          const startDate = updateData.startDate || task.startDate || task.dueDate || new Date();
          const rruleString = patternToRRule(updateData.recurringPattern, startDate);
          task.recurringPattern = rruleString;
          
          // Update the recurring pattern
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
export async function handleRecurringTaskDelete(task, deleteScope, models) {
  const { Task, RecurringPattern } = models;
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