import mongoose from 'mongoose';

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
    type: Date
  },
  dueDate: {
    type: Date
  },
  isRecurring: {
    type: Boolean,
    default: false
  },
  recurringPattern: {
    type: String // rrule string
  },
  parentTask: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Task' // for recurring task instances
  }
}, {
  timestamps: true
});

// Indexes for common queries
taskSchema.index({ owner: 1, status: 1 });
taskSchema.index({ owner: 1, dueDate: 1 });
taskSchema.index({ owner: 1, category: 1 });
taskSchema.index({ assignees: 1 }); // For assignee queries
taskSchema.index({ dueDate: 1, status: 1 }); // For scheduler queries
taskSchema.index({ isRecurring: 1, status: 1 }); // For recurring task queries

// Virtual for checking if task has assignees
taskSchema.virtual('hasAssignees').get(function() {
  return this.assignees && this.assignees.length > 0;
});

// Method to check if user has access to task
taskSchema.methods.hasAccess = function(userId, permission = 'view') {
  // Handle both ObjectId and string comparison
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
    // Assignees have full access to tasks they are assigned to
    return true;
  }
  
  return false;
};

// Method to get user's permission level
taskSchema.methods.getUserPermission = function(userId) {
  // Handle both ObjectId and string comparison
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

export default mongoose.model('Task', taskSchema);