import mongoose from 'mongoose';

const durationSchema = new mongoose.Schema({
  years: { type: Number, default: 0, min: 0 },
  months: { type: Number, default: 0, min: 0 },
  days: { type: Number, default: 0, min: 0 },
  hours: { type: Number, default: 0, min: 0 },
  minutes: { type: Number, default: 0, min: 0 }
}, { _id: false });

const recurringPatternSchema = new mongoose.Schema({
  task: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Task',
    required: [true, 'Task reference is required']
  },

  rrule: {
    type: String,
    required: [true, 'RRule string is required']
  },
  
  //  Track the duration for instances
  instanceDuration: {
    type: durationSchema,
    required: [true, 'Instance duration is required'],
    validate: {
      validator: function(v) {
        const total = v.years + v.months + v.days + v.hours + v.minutes;
        return total > 0;
      },
      message: 'Instance duration must have at least one positive value'
    }
  },
  
  //  Timezone for accurate scheduling
  timezone: {
    type: String,
    default: 'UTC',
    validate: {
      validator: function(v) {
        try {
          Intl.DateTimeFormat(undefined, { timeZone: v });
          return true;
        } catch {
          return false;
        }
      },
      message: 'Invalid timezone'
    }
  },
  
  // tracking
  nextDue: {
    type: Date,
    required: [true, 'Next due date is required'],
    validate: {
      validator: function(v) {
        return v > new Date();
      },
      message: 'Next due date must be in the future'
    }
  },
  
  lastGenerated: {
    type: Date,
    default: Date.now
  },
  
  //  Track pattern version
  patternVersion: {
    type: Number,
    default: 1,
    min: [1, 'Pattern version must be at least 1']
  },
  
  isActive: {
    type: Boolean,
    default: true
  },
  
  //  Statistics
  totalInstancesCreated: {
    type: Number,
    default: 0,
    min: [0, 'Total instances cannot be negative']
  },
  
  lastInstanceDate: {
    type: Date,
    validate: {
      validator: function(v) {
        if (!v) return true;
        return v <= new Date();
      },
      message: 'Last instance date cannot be in the future'
    }
  },
  
  //  End conditions from parent task
  endDate: {
    type: Date,
    validate: {
      validator: function(v) {
        if (!v) return true;
        return v > new Date();
      },
      message: 'End date must be in the future'
    }
  },
  
  endOccurrences: {
    type: Number,
    min: [1, 'End occurrences must be at least 1'],
    validate: {
      validator: function(v) {
        if (!v) return true;
        return v >= this.totalInstancesCreated;
      },
      message: 'End occurrences must be greater than or equal to total instances created'
    }
  }
}, {
  timestamps: true
});

//  Method to check if recurrence should continue
recurringPatternSchema.methods.shouldContinue = function() {
  if (!this.isActive) return false;
  
  // Check end date
  if (this.endDate && new Date() > this.endDate) return false;
  
  // Check end occurrences
  if (this.endOccurrences && this.totalInstancesCreated >= this.endOccurrences) return false;
  
  return true;
};

//  Method to get next occurrence date
recurringPatternSchema.methods.getNextOccurrence = function(after = new Date()) {
  try {
    const { getNextOccurrence } = require('../utils/recurringTasks.js');
    return getNextOccurrence(this.rrule, after);
  } catch (error) {
    console.error('Error getting next occurrence:', error);
    return null;
  }
};

//  Method to update next due date
recurringPatternSchema.methods.updateNextDue = function() {
  const next = this.getNextOccurrence(this.nextDue);
  if (next) {
    this.nextDue = next;
    return true;
  }
  
  // No more occurrences
  this.isActive = false;
  return false;
};

//  Method to increment instance count
recurringPatternSchema.methods.incrementInstances = function(instanceDate) {
  this.totalInstancesCreated += 1;
  this.lastInstanceDate = instanceDate;
  this.lastGenerated = new Date();
};

// Indexes for scheduler queries
recurringPatternSchema.index({ nextDue: 1, isActive: 1 });
recurringPatternSchema.index({ task: 1 });
recurringPatternSchema.index({ patternVersion: 1 });
recurringPatternSchema.index({ isActive: 1, endDate: 1 });
recurringPatternSchema.index({ isActive: 1, endOccurrences: 1, totalInstancesCreated: 1 });

export default mongoose.model('RecurringPattern', recurringPatternSchema);