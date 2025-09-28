import mongoose from 'mongoose';

const categorySchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Category name is required'],
    trim: true,
    maxlength: [50, 'Category name must be less than 50 characters']
  },
  color: {
    type: String,
    match: [/^#[0-9A-F]{6}$/i, 'Color must be a valid hex color'],
    default: '#6366f1' // Default indigo color
  },
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Owner is required']
  }
}, {
  timestamps: true
});

// Compound index for user's categories (ensures unique category names per user)
categorySchema.index({ owner: 1, name: 1 }, { unique: true });

// Virtual for task count
categorySchema.virtual('taskCount', {
  ref: 'Task',
  localField: '_id',
  foreignField: 'category',
  count: true
});

// Ensure virtual fields are serialized
categorySchema.set('toJSON', { virtuals: true });
categorySchema.set('toObject', { virtuals: true });

// Method to check if category can be deleted
categorySchema.methods.canDelete = async function() {
  const Task = mongoose.model('Task');
  const taskCount = await Task.countDocuments({ category: this._id });
  return taskCount === 0;
};

export default mongoose.model('Category', categorySchema);