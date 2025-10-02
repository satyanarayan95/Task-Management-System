import mongoose from 'mongoose';

/**
 * Track changes in recurring task patterns and manage versioning
 */

/**
 * Track changes between old and new task data
 * @param {Object} oldTask - Original task data
 * @param {Object} newTaskData - Updated task data
 * @returns {Object} Change tracking information
 */
export function trackRecurrenceChanges(oldTask, newTaskData) {
  const changes = {
    hasPatternChanges: false,
    hasDurationChanges: false,
    hasTimingChanges: false,
    hasNonRecurringChanges: false,
    changes: [],
    severity: 'none' // 'minor', 'major', 'breaking'
  };

  // Check for pattern changes
  if (newTaskData.recurringPattern && oldTask.recurringPattern) {
    const patternChanges = comparePatterns(oldTask.recurringPattern, newTaskData.recurringPattern);
    if (patternChanges.length > 0) {
      changes.hasPatternChanges = true;
      changes.changes.push(...patternChanges);
      changes.severity = determineSeverity(patternChanges, changes.severity);
    }
  } else if (newTaskData.recurringPattern !== oldTask.recurringPattern) {
    changes.hasPatternChanges = true;
    changes.changes.push({
      type: 'pattern_addition',
      field: 'recurringPattern',
      oldValue: oldTask.recurringPattern,
      newValue: newTaskData.recurringPattern
    });
    changes.severity = 'major';
  }

  // Check for duration changes
  if (newTaskData.duration && oldTask.duration) {
    const durationChanges = compareDurations(oldTask.duration, newTaskData.duration);
    if (durationChanges.length > 0) {
      changes.hasDurationChanges = true;
      changes.changes.push(...durationChanges);
      changes.severity = determineSeverity(durationChanges, changes.severity);
    }
  } else if (newTaskData.duration !== oldTask.duration) {
    changes.hasDurationChanges = true;
    changes.changes.push({
      type: 'duration_addition',
      field: 'duration',
      oldValue: oldTask.duration,
      newValue: newTaskData.duration
    });
    changes.severity = 'major';
  }

  // Check for timing changes (start date)
  if (newTaskData.startDate && oldTask.startDate) {
    const oldStart = new Date(oldTask.startDate);
    const newStart = new Date(newTaskData.startDate);
    if (oldStart.getTime() !== newStart.getTime()) {
      changes.hasTimingChanges = true;
      changes.changes.push({
        type: 'timing_change',
        field: 'startDate',
        oldValue: oldTask.startDate,
        newValue: newTaskData.startDate
      });
      changes.severity = determineSeverity([{ type: 'timing_change' }], changes.severity);
    }
  }

  // Check for non-recurring field changes
  const nonRecurringFields = ['title', 'description', 'priority', 'status', 'category', 'assignees'];
  for (const field of nonRecurringFields) {
    if (newTaskData[field] !== undefined && newTaskData[field] !== oldTask[field]) {
      changes.hasNonRecurringChanges = true;
      changes.changes.push({
        type: 'field_change',
        field,
        oldValue: oldTask[field],
        newValue: newTaskData[field]
      });
    }
  }

  return changes;
}

/**
 * Compare two recurrence patterns
 * @param {Object} oldPattern - Original pattern
 * @param {Object} newPattern - New pattern
 * @returns {Array} Array of changes
 */
function comparePatterns(oldPattern, newPattern) {
  const changes = [];
  const fields = ['frequency', 'interval', 'daysOfWeek', 'dayOfMonth', 'endDate', 'endOccurrences', 'timezone'];

  for (const field of fields) {
    const oldValue = oldPattern[field];
    const newValue = newPattern[field];

    // Handle array comparison
    if (Array.isArray(oldValue) && Array.isArray(newValue)) {
      if (oldValue.length !== newValue.length || 
          !oldValue.every((val, index) => val === newValue[index])) {
        changes.push({
          type: 'pattern_field_change',
          field,
          oldValue,
          newValue
        });
      }
    } else if (oldValue !== newValue) {
      changes.push({
        type: 'pattern_field_change',
        field,
        oldValue,
        newValue
      });
    }
  }

  return changes;
}

/**
 * Compare two duration objects
 * @param {Object} oldDuration - Original duration
 * @param {Object} newDuration - New duration
 * @returns {Array} Array of changes
 */
function compareDurations(oldDuration, newDuration) {
  const changes = [];
  const fields = ['years', 'months', 'days', 'hours', 'minutes'];

  for (const field of fields) {
    const oldValue = oldDuration[field] || 0;
    const newValue = newDuration[field] || 0;

    if (oldValue !== newValue) {
      changes.push({
        type: 'duration_field_change',
        field,
        oldValue,
        newValue
      });
    }
  }

  return changes;
}

/**
 * Determine change severity based on changes
 * @param {Array} changes - Array of changes
 * @param {string} currentSeverity - Current severity level
 * @returns {string} New severity level
 */
function determineSeverity(changes, currentSeverity) {
  if (currentSeverity === 'breaking') return 'breaking';

  const hasMajorChanges = changes.some(change => {
    return change.type === 'pattern_addition' ||
           change.type === 'duration_addition' ||
           (change.field === 'frequency' && change.oldValue !== change.newValue) ||
           (change.field === 'interval' && Math.abs(change.oldValue - change.newValue) > 1);
  });

  if (hasMajorChanges) return 'major';

  const hasMinorChanges = changes.some(change => {
    return change.type === 'pattern_field_change' ||
           change.type === 'duration_field_change' ||
           change.type === 'timing_change';
  });

  if (hasMinorChanges) return 'minor';

  return currentSeverity;
}

/**
 * Create a recurrence change record
 * @param {Object} task - The task being changed
 * @param {Object} changes - The changes detected
 * @param {Object} user - The user making the changes
 * @param {string} editScope - The scope of the edit
 * @returns {Object} Change record
 */
export function createRecurrenceChangeRecord(task, changes, user, editScope) {
  return {
    taskId: task._id,
    userId: user._id,
    editScope,
    changes: changes.changes,
    severity: changes.severity,
    hasPatternChanges: changes.hasPatternChanges,
    hasDurationChanges: changes.hasDurationChanges,
    hasTimingChanges: changes.hasTimingChanges,
    hasNonRecurringChanges: changes.hasNonRecurringChanges,
    oldRecurrenceVersion: task.recurrenceVersion || 1,
    newRecurrenceVersion: (task.recurrenceVersion || 1) + 1,
    timestamp: new Date(),
    affectedInstances: estimateAffectedInstances(task, changes, editScope)
  };
}

/**
 * Estimate how many instances will be affected by the change
 * @param {Object} task - The task
 * @param {Object} changes - The changes
 * @param {string} editScope - The edit scope
 * @returns {Object} Affected instances estimation
 */
function estimateAffectedInstances(task, changes, editScope) {
  const estimate = {
    total: 0,
    past: 0,
    present: 0,
    future: 0
  };

  if (editScope === 'this_instance') {
    estimate.total = 1;
    estimate.present = 1;
  } else if (editScope === 'this_and_future') {
    // Estimate future instances (simplified calculation)
    if (task.recurringPattern) {
      const now = new Date();
      const taskStart = task.startDate || task.createdAt;
      
      if (changes.hasPatternChanges || changes.hasDurationChanges) {
        // For major changes, estimate based on pattern
        estimate.future = estimateFutureInstances(task, now);
      } else {
        // For minor changes, count existing future instances
        estimate.future = 10; // Conservative estimate
      }
    }
    estimate.present = 1;
    estimate.total = estimate.present + estimate.future;
  } else if (editScope === 'all_instances') {
    // All instances - this is harder to estimate without querying
    estimate.past = 5; // Conservative estimate
    estimate.present = 1;
    estimate.future = 20; // Conservative estimate
    estimate.total = estimate.past + estimate.present + estimate.future;
  }

  return estimate;
}

/**
 * Estimate future instances for a recurring task
 * @param {Object} task - The task
 * @param {Date} fromDate - Date to start counting from
 * @returns {number} Estimated number of future instances
 */
function estimateFutureInstances(task, fromDate) {
  if (!task.recurringPattern) return 0;

  const pattern = task.recurringPattern;
  let count = 0;
  let currentDate = new Date(fromDate);
  const maxDate = new Date(fromDate);
  maxDate.setFullYear(maxDate.getFullYear() + 1); // Estimate 1 year ahead

  // Simple estimation - not perfectly accurate but good enough for planning
  while (currentDate <= maxDate) {
    count++;
    
    // Increment based on frequency
    switch (pattern.frequency) {
      case 'daily':
        currentDate.setDate(currentDate.getDate() + (pattern.interval || 1));
        break;
      case 'weekly':
        currentDate.setDate(currentDate.getDate() + (7 * (pattern.interval || 1)));
        break;
      case 'monthly':
        currentDate.setMonth(currentDate.getMonth() + (pattern.interval || 1));
        break;
      case 'yearly':
        currentDate.setFullYear(currentDate.getFullYear() + (pattern.interval || 1));
        break;
    }

    // Stop if we have an end condition
    if (pattern.endDate && currentDate > new Date(pattern.endDate)) {
      break;
    }
    if (pattern.endOccurrences && count >= pattern.endOccurrences) {
      break;
    }
  }

  return count;
}

/**
 * Log recurrence changes for audit purposes
 * @param {Object} changeRecord - The change record to log
 */
export async function logRecurrenceChange(changeRecord) {
  try {
    // This would typically save to a RecurrenceChangeLog collection
    // For now, we'll just log to console for debugging
    console.log('Recurrence Change Logged:', {
      taskId: changeRecord.taskId,
      userId: changeRecord.userId,
      severity: changeRecord.severity,
      affectedInstances: changeRecord.affectedInstances.total,
      timestamp: changeRecord.timestamp
    });
    
    // In a real implementation, you would:
    // await RecurrenceChangeLog.create(changeRecord);
    
    return true;
  } catch (error) {
    console.error('Failed to log recurrence change:', error);
    return false;
  }
}

/**
 * Check if a change requires scheduler restart
 * @param {Object} changes - The changes detected
 * @returns {boolean} Whether scheduler restart is needed
 */
export function requiresSchedulerRestart(changes) {
  return changes.hasPatternChanges || 
         changes.hasDurationChanges || 
         changes.hasTimingChanges;
}

/**
 * Get user-friendly description of changes
 * @param {Object} changes - The changes detected
 * @returns {string} Human-readable description
 */
export function getChangeDescription(changes) {
  const descriptions = [];

  if (changes.hasPatternChanges) {
    descriptions.push('recurrence pattern');
  }

  if (changes.hasDurationChanges) {
    descriptions.push('task duration');
  }

  if (changes.hasTimingChanges) {
    descriptions.push('start timing');
  }

  if (changes.hasNonRecurringChanges) {
    descriptions.push('task details');
  }

  if (descriptions.length === 0) {
    return 'No changes detected';
  }

  if (descriptions.length === 1) {
    return `Changed ${descriptions[0]}`;
  }

  if (descriptions.length === 2) {
    return `Changed ${descriptions[0]} and ${descriptions[1]}`;
  }

  return `Changed ${descriptions.slice(0, -1).join(', ')}, and ${descriptions.slice(-1)[0]}`;
}