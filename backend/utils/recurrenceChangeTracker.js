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
