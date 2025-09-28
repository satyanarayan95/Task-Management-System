import mongoose from 'mongoose';

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
  nextDue: {
    type: Date,
    required: [true, 'Next due date is required']
  },
  lastGenerated: {
    type: Date,
    default: Date.now
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Indexes for scheduler queries
recurringPatternSchema.index({ nextDue: 1, isActive: 1 });
recurringPatternSchema.index({ task: 1 });

export default mongoose.model('RecurringPattern', recurringPatternSchema);