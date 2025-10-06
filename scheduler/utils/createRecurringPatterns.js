import mongoose from 'mongoose';
import { Task, RecurringPattern } from '../models/index.js';
import { getNextOccurrence } from './rruleHelper.js';

async function createRecurringPatterns() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect( process.env.MONGODB_URI || 'mongodb://localhost:27017/taskmanagement');
    console.log('Connected to MongoDB');

    const recurringTasks = await Task.find({ 
      isRecurring: true,
      recurringPattern: { $exists: true, $ne: null }
    });

    console.log(`Found ${recurringTasks.length} recurring tasks`);

    for (const task of recurringTasks) {
      try {
        const existingPattern = await RecurringPattern.findOne({ task: task._id });
        
        if (existingPattern) {
          console.log(`RecurringPattern already exists for task ${task._id}`);
          continue;
        }

        const rruleString = task.recurringPattern;
        const startDate = task.startDate || new Date();
        
        const nextOccurrence = getNextOccurrence(rruleString, startDate);
        
        if (!nextOccurrence) {
          console.log(`No next occurrence found for task ${task._id}, skipping`);
          continue;
        }

        const recurringPattern = new RecurringPattern({
          task: task._id,
          rrule: rruleString,
          nextDue: nextOccurrence,
          lastGenerated: new Date(),
          isActive: true
        });

        await recurringPattern.save();
        console.log(`Created RecurringPattern for task ${task._id} with next due: ${nextOccurrence}`);

      } catch (error) {
        console.error(`Error processing task ${task._id}:`, error.message);
      }
    }

    console.log('RecurringPattern creation completed');
    
    const totalPatterns = await RecurringPattern.countDocuments();
    const activePatterns = await RecurringPattern.countDocuments({ isActive: true });
    console.log(`Total RecurringPatterns: ${totalPatterns}, Active: ${activePatterns}`);

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  createRecurringPatterns();
}

export default createRecurringPatterns;
