import mongoose from 'mongoose';
import Task from '../models/Task.js';
import RecurringPattern from '../models/RecurringPattern.js';
import { calculateDuration } from '../../shared/utils/durationUtils.js';
import dotenv from 'dotenv';

dotenv.config();

/**
 * Migration script to update existing tasks to use duration-based system
 * 
 * This script will:
 * 1. Add duration field to existing tasks based on start/due dates
 * 2. Update recurring patterns to use new schema
 * 3. Add recurrence version tracking
 * 4. Migrate RRule strings to pattern objects
 */

async function migrateTasks() {
  try {
    console.log('Starting task migration...');
    
    // Connect to database
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/todo-app');
    console.log('Connected to database');
    
    // Get all tasks that need migration
    const tasks = await Task.find({
      $or: [
        { duration: { $exists: false } },
        { recurrenceVersion: { $exists: false } },
        { recurringPattern: { $type: 'string' } }
      ]
    });
    
    console.log(`Found ${tasks.length} tasks to migrate`);
    
    let migratedCount = 0;
    let errorCount = 0;
    
    for (const task of tasks) {
      try {
        const updateData = {};
        
        // 1. Calculate duration from start and due dates
        if (!task.duration && task.startDate && task.dueDate) {
          const duration = calculateDuration(task.startDate, task.dueDate);
          if (duration) {
            updateData.duration = duration;
            console.log(`  - Added duration to task "${task.title}"`);
          }
        }
        
        // 2. Add recurrence version
        if (task.recurrenceVersion === undefined) {
          updateData.recurrenceVersion = 1;
          updateData.lastRecurrenceUpdate = new Date();
        }
        
        // 3. Convert RRule string to pattern object
        if (typeof task.recurringPattern === 'string') {
          const pattern = parseRRuleToPattern(task.recurringPattern);
          if (pattern) {
            updateData.recurringPattern = pattern;
            console.log(`  - Converted RRule to pattern for task "${task.title}"`);
          }
        }
        
        // Update the task
        if (Object.keys(updateData).length > 0) {
          await Task.updateOne({ _id: task._id }, updateData);
          migratedCount++;
        }
        
      } catch (error) {
        console.error(`  - Error migrating task "${task.title}":`, error.message);
        errorCount++;
      }
    }
    
    console.log(`\nMigration completed:`);
    console.log(`  - Successfully migrated: ${migratedCount} tasks`);
    console.log(`  - Errors: ${errorCount} tasks`);
    
    // Migrate recurring patterns
    await migrateRecurringPatterns();
    
  } catch (error) {
    console.error('Migration failed:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from database');
  }
}

async function migrateRecurringPatterns() {
  try {
    console.log('\nMigrating recurring patterns...');
    
    const patterns = await RecurringPattern.find({
      $or: [
        { instanceDuration: { $exists: false } },
        { patternVersion: { $exists: false } },
        { timezone: { $exists: false } }
      ]
    });
    
    console.log(`Found ${patterns.length} recurring patterns to migrate`);
    
    let migratedCount = 0;
    
    for (const pattern of patterns) {
      try {
        const updateData = {};
        
        // Add instance duration from parent task
        if (!pattern.instanceDuration) {
          const parentTask = await Task.findById(pattern.task);
          if (parentTask && parentTask.duration) {
            updateData.instanceDuration = parentTask.duration;
          } else if (parentTask && parentTask.startDate && parentTask.dueDate) {
            const duration = calculateDuration(parentTask.startDate, parentTask.dueDate);
            if (duration) {
              updateData.instanceDuration = duration;
            }
          }
        }
        
        // Add pattern version
        if (pattern.patternVersion === undefined) {
          updateData.patternVersion = 1;
        }
        
        // Add timezone
        if (!pattern.timezone) {
          updateData.timezone = 'UTC';
        }
        
        // Update the pattern
        if (Object.keys(updateData).length > 0) {
          await RecurringPattern.updateOne({ _id: pattern._id }, updateData);
          migratedCount++;
          console.log(`  - Migrated pattern for task ${pattern.task}`);
        }
        
      } catch (error) {
        console.error(`  - Error migrating pattern ${pattern._id}:`, error.message);
      }
    }
    
    console.log(`\nRecurring pattern migration completed:`);
    console.log(`  - Successfully migrated: ${migratedCount} patterns`);
    
  } catch (error) {
    console.error('Recurring pattern migration failed:', error);
  }
}

/**
 * Parse RRule string to pattern object
 */
function parseRRuleToPattern(rruleString) {
  try {
    const pattern = {
      frequency: 'daily',
      interval: 1,
      endDate: null,
      endOccurrences: null,
      timezone: 'UTC'
    };
    
    // Parse frequency
    if (rruleString.includes('FREQ=DAILY')) pattern.frequency = 'daily';
    else if (rruleString.includes('FREQ=WEEKLY')) pattern.frequency = 'weekly';
    else if (rruleString.includes('FREQ=MONTHLY')) pattern.frequency = 'monthly';
    else if (rruleString.includes('FREQ=YEARLY')) pattern.frequency = 'yearly';
    
    // Parse interval
    const intervalMatch = rruleString.match(/INTERVAL=(\d+)/);
    if (intervalMatch) pattern.interval = parseInt(intervalMatch[1]);
    
    // Parse end conditions
    const countMatch = rruleString.match(/COUNT=(\d+)/);
    if (countMatch) pattern.endOccurrences = parseInt(countMatch[1]);
    
    const untilMatch = rruleString.match(/UNTIL=([^;]+)/);
    if (untilMatch) {
      // Convert RRule date format (YYYYMMDDTHHMMSSZ) to ISO string
      const untilDate = untilMatch[1];
      if (untilDate.length === 15) { // Format: YYYYMMDDTHHMMSSZ
        const year = untilDate.substring(0, 4);
        const month = untilDate.substring(4, 6);
        const day = untilDate.substring(6, 8);
        const hour = untilDate.substring(9, 11);
        const minute = untilDate.substring(11, 13);
        const second = untilDate.substring(13, 15);
        
        pattern.endDate = new Date(`${year}-${month}-${day}T${hour}:${minute}:${second}Z`).toISOString();
      }
    }
    
    // Parse days of week for weekly patterns
    if (pattern.frequency === 'weekly') {
      const days = [];
      if (rruleString.includes('SU')) days.push(0);
      if (rruleString.includes('MO')) days.push(1);
      if (rruleString.includes('TU')) days.push(2);
      if (rruleString.includes('WE')) days.push(3);
      if (rruleString.includes('TH')) days.push(4);
      if (rruleString.includes('FR')) days.push(5);
      if (rruleString.includes('SA')) days.push(6);
      
      if (days.length > 0) pattern.daysOfWeek = days;
    }
    
    // Parse day of month for monthly patterns
    if (pattern.frequency === 'monthly') {
      const dayMatch = rruleString.match(/BYMONTHDAY=(\d+)/);
      if (dayMatch) pattern.dayOfMonth = parseInt(dayMatch[1]);
    }
    
    return pattern;
    
  } catch (error) {
    console.error('Error parsing RRule:', error);
    return null;
  }
}

// Run migration if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  migrateTasks().then(() => {
    console.log('Migration script completed');
    process.exit(0);
  }).catch((error) => {
    console.error('Migration script failed:', error);
    process.exit(1);
  });
}

export default migrateTasks;