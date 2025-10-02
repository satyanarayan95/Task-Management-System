import mongoose from 'mongoose';

const durationSchema = new mongoose.Schema({
  years: {
    type: Number,
    default: 0,
    min: [0, 'Years cannot be negative'],
    max: [99, 'Years cannot exceed 99']
  },
  months: {
    type: Number,
    default: 0,
    min: [0, 'Months cannot be negative'],
    max: [11, 'Months cannot exceed 11']
  },
  days: {
    type: Number,
    default: 0,
    min: [0, 'Days cannot be negative'],
    max: [30, 'Days cannot exceed 30']
  },
  hours: {
    type: Number,
    default: 0,
    min: [0, 'Hours cannot be negative'],
    max: [23, 'Hours cannot exceed 23']
  },
  minutes: {
    type: Number,
    default: 0,
    min: [0, 'Minutes cannot be negative'],
    max: [59, 'Minutes cannot exceed 59']
  }
}, { _id: false });

const recurringPatternSchema = new mongoose.Schema({
  frequency: {
    type: String,
    enum: ['daily', 'weekly', 'monthly', 'yearly'],
    required: function() { return this.parent?.isRecurring; }
  },
  interval: {
    type: Number,
    default: 1,
    min: [1, 'Interval must be at least 1'],
    max: [99, 'Interval cannot exceed 99'],
    required: function() { return this.parent?.isRecurring; }
  },
  daysOfWeek: [{
    type: Number,
    min: [0, 'Day of week must be between 0 and 6'],
    max: [6, 'Day of week must be between 0 and 6']
  }],
  dayOfMonth: {
    type: Number,
    min: [1, 'Day of month must be between 1 and 31'],
    max: [31, 'Day of month must be between 1 and 31']
  },
  endDate: {
    type: Date,
    validate: {
      validator: function(v) {
        if (!v || !this.parent?.startDate) return true;
        return v > this.parent.startDate;
      },
      message: 'End date must be after start date'
    }
  },
  endOccurrences: {
    type: Number,
    min: [1, 'End occurrences must be at least 1'],
    max: [999, 'End occurrences cannot exceed 999']
  },
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
  }
}, { _id: false });

const taskSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Title is required'],
    trim: true,
    maxlength: [200, 'Title must be less than 200 characters']
  },
  description: {
    type: String,
    trim: true,
    maxlength: [1000, 'Description must be less than 1000 characters']
  },
  status: {
    type: String,
    enum: ['todo', 'in_progress', 'done'],
    default: 'todo'
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium'
  },
  category: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category'
  },
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Owner is required']
  },
  assignees: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  
  startDate: {
    type: Date,
    default: () => new Date(),
    validate: {
      validator: function(v) {
        if (!v || !this.dueDate) return true;
        return v < this.dueDate;
      },
      message: 'Start date must be before due date'
    }
  },
  
  dueDate: {
    type: Date,
    validate: {
      validator: function(v) {
        if (!v || !this.startDate) return true;
        return v > this.startDate;
      },
      message: 'Due date must be after start date'
    }
  },
  
  // Structured duration
  duration: {
    type: durationSchema,
    validate: {
      validator: function(v) {
        if (!this.isRecurring && !v) return true;
        if (this.isRecurring && !v) return false;
        
        if (this.isRecurring) {
          const total = v.years + v.months + v.days + v.hours + v.minutes;
          return total > 0;
        }
        
        return true;
      },
      message: function() {
        return this.isRecurring
          ? 'Duration is required for recurring tasks and must have at least one positive value'
          : 'Duration must have at least one positive value if provided';
      }
    }
  },
  
  isRecurring: {
    type: Boolean,
    default: false
  },
  
  recurringPattern: {
    type: recurringPatternSchema,
    required: function() { return this.isRecurring; }
  },
  
  // Instance tracking
  parentTask: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Task'
  },
  
  instanceNumber: {
    type: Number,
    min: [1, 'Instance number must be at least 1']
  },
  
  // Change tracking for recurrence
  recurrenceVersion: {
    type: Number,
    default: 1,
    min: [1, 'Recurrence version must be at least 1']
  },
  
  lastRecurrenceUpdate: {
    type: Date
  }
}, {
  timestamps: true
});

// Virtual to calculate dueDate from duration
taskSchema.virtual('calculatedDueDate').get(function() {
  if (!this.duration) return null;
  
  const dueDate = new Date(this.startDate);
  dueDate.setFullYear(dueDate.getFullYear() + (this.duration.years || 0));
  dueDate.setMonth(dueDate.getMonth() + (this.duration.months || 0));
  dueDate.setDate(dueDate.getDate() + (this.duration.days || 0));
  dueDate.setHours(dueDate.getHours() + (this.duration.hours || 0));
  dueDate.setMinutes(dueDate.getMinutes() + (this.duration.minutes || 0));
  
  return dueDate;
});

// Middleware to calculate dueDate before save
taskSchema.pre('save', function(next) {
  if (this.isModified('duration') || this.isModified('startDate')) {
    if (this.duration && this.startDate) {
      this.dueDate = this.calculatedDueDate;
    }
  }
  
  // Validate recurrence pattern
  if (this.isRecurring && this.recurringPattern) {
    const pattern = this.recurringPattern;
    
    // Validate weekly pattern has days
    if (pattern.frequency === 'weekly' && (!pattern.daysOfWeek || pattern.daysOfWeek.length === 0)) {
      return next(new Error('Weekly recurrence must specify days of week'));
    }
    
    // Validate monthly pattern has day
    if (pattern.frequency === 'monthly' && !pattern.dayOfMonth) {
      return next(new Error('Monthly recurrence must specify day of month'));
    }
    
    // Validate end conditions
    if (pattern.endDate && pattern.endOccurrences) {
      return next(new Error('Cannot specify both end date and end occurrences'));
    }
  }
  
  next();
});

// Indexes for common queries
taskSchema.index({ owner: 1, status: 1 });
taskSchema.index({ owner: 1, dueDate: 1 });
taskSchema.index({ owner: 1, category: 1 });
taskSchema.index({ assignees: 1 });
taskSchema.index({ dueDate: 1, status: 1 }); // For scheduler queries
taskSchema.index({ isRecurring: 1, status: 1 }); // For recurring task queries

// NEW: Additional indexes for enhanced functionality
taskSchema.index({ parentTask: 1, instanceNumber: 1 });
taskSchema.index({ recurrenceVersion: 1 });
taskSchema.index({ isRecurring: 1, startDate: 1 });
taskSchema.index({ parentTask: 1, dueDate: 1 });

// Virtual for checking if task has assignees
taskSchema.virtual('hasAssignees').get(function() {
  return this.assignees && this.assignees.length > 0;
});

// Method to check if user has access to task
taskSchema.methods.hasAccess = function(userId, permission = 'view') {
  const userIdStr = userId.toString();
  const ownerIdStr = this.owner._id ? this.owner._id.toString() : this.owner.toString();
  
  // Owner has full access
  if (ownerIdStr === userIdStr) {
    return true;
  }
  
  // Check if user is assigned to the task
  const isAssignee = this.assignees.some(assignee => {
    const assigneeIdStr = assignee._id ? assignee._id.toString() : assignee.toString();
    return assigneeIdStr === userIdStr;
  });
  
  if (isAssignee) {
    return true;
  }
  
  return false;
};

// Method to get user's permission level
taskSchema.methods.getUserPermission = function(userId) {
  const userIdStr = userId.toString();
  const ownerIdStr = this.owner._id ? this.owner._id.toString() : this.owner.toString();
  
  if (ownerIdStr === userIdStr) {
    return 'owner';
  }
  
  // Check if user is assigned to the task
  const isAssignee = this.assignees.some(assignee => {
    const assigneeIdStr = assignee._id ? assignee._id.toString() : assignee.toString();
    return assigneeIdStr === userIdStr;
  });
  
  if (isAssignee) {
    return 'assignee';
  }
  
  return null;
};

// NEW: Method to check if task has any duration
taskSchema.methods.hasDuration = function() {
  return this.duration && (
    this.duration.years > 0 ||
    this.duration.months > 0 ||
    this.duration.days > 0 ||
    this.duration.hours > 0 ||
    this.duration.minutes > 0
  );
};

// NEW: Method to get duration in minutes (for scheduler)
taskSchema.methods.getDurationInMinutes = function() {
  if (!this.duration) return 0;
  
  let totalMinutes = 0;
  totalMinutes += this.duration.years * 365 * 24 * 60; // Approximate
  totalMinutes += this.duration.months * 30 * 24 * 60;  // Approximate
  totalMinutes += this.duration.days * 24 * 60;
  totalMinutes += this.duration.hours * 60;
  totalMinutes += this.duration.minutes;
  
  return totalMinutes;
};

// NEW: Method to check if task is overdue
taskSchema.methods.isOverdue = function() {
  if (!this.dueDate || this.status === 'done') return false;
  return new Date(this.dueDate) < new Date();
};

// NEW: Method to get next occurrence date for recurring tasks
taskSchema.methods.getNextOccurrence = function() {
  if (!this.isRecurring || !this.recurringPattern) return null;
  
  try {
    const { getNextOccurrence } = require('../utils/recurringTasks.js');
    return getNextOccurrence(this.recurringPattern, new Date());
  } catch (error) {
    console.error('Error getting next occurrence:', error);
    return null;
  }
};

// NEW: Method to validate recurrence pattern
taskSchema.methods.validateRecurrencePattern = function() {
  if (!this.isRecurring) return { valid: true };
  
  const errors = [];
  const pattern = this.recurringPattern;
  
  if (!pattern) {
    errors.push('Recurring pattern is required for recurring tasks');
    return { valid: false, errors };
  }
  
  // Validate frequency
  if (!pattern.frequency) {
    errors.push('Frequency is required for recurring pattern');
  }
  
  // Validate interval
  if (!pattern.interval || pattern.interval < 1) {
    errors.push('Interval must be at least 1');
  }
  
  // Validate frequency-specific requirements
  switch (pattern.frequency) {
    case 'weekly':
      if (!pattern.daysOfWeek || pattern.daysOfWeek.length === 0) {
        errors.push('Weekly recurrence must specify days of week');
      }
      break;
    case 'monthly':
      if (!pattern.dayOfMonth) {
        errors.push('Monthly recurrence must specify day of month');
      }
      break;
  }
  
  // Validate end conditions
  if (pattern.endDate && pattern.endOccurrences) {
    errors.push('Cannot specify both end date and end occurrences');
  }
  
  if (pattern.endDate && this.startDate && pattern.endDate <= this.startDate) {
    errors.push('End date must be after start date');
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
};

export default mongoose.model('Task', taskSchema);