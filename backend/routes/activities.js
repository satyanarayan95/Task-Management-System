import express from 'express';
import Activity from '../models/Activity.js';
import { authenticateToken } from '../middleware/auth.js';
import { activityQuerySchema } from '../../shared/schemas/activity.js';

const router = express.Router();

// GET /api/activities - Get user's activities
router.get('/', authenticateToken, async (req, res) => {
  try {
    // Validate query parameters using shared schema
    const validatedQuery = activityQuerySchema.parse(req.query);
    const { 
      page, 
      limit, 
      type, 
      user: userFilter, 
      date: dateFilter, 
      search,
      taskId 
    } = validatedQuery;
    const skip = (page - 1) * limit;
    
    // Build query for activities
    let query = {};
    
    // Show activities where user is the actor OR where user is assigned to the task
    query.$or = [
      { user: req.user._id },
      { assignee: req.user._id }
    ];
    
    
    // Filter by activity type
    if (type && type !== 'all') {
      query.type = type;
    }
    
    // Filter by user (me/others)
    if (userFilter && userFilter !== 'all') {
      if (userFilter === 'me') {
        query.user = req.user._id;
      } else if (userFilter === 'others') {
        query.user = { $ne: req.user._id };
      }
    }
    
    // Filter by date
    if (dateFilter && dateFilter !== 'all') {
      const now = new Date();
      let startDate;
      
      switch (dateFilter) {
        case 'today':
          startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
          break;
        case 'week':
          startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case 'month':
          startDate = new Date(now.getFullYear(), now.getMonth(), 1);
          break;
        default:
          break;
      }
      
      if (startDate) {
        query.createdAt = { $gte: startDate };
      }
    }
    
    // Filter by task
    if (taskId) {
      query.task = taskId;
    }
    
    // Search in description
    if (search) {
      query.description = { $regex: search, $options: 'i' };
    }
    
    
    const activities = await Activity.find(query)
      .populate('user', 'fullName email')
      .populate('task', 'title status priority')
      .populate('category', 'name color')
      .populate('assignee', 'fullName email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));
    
    const total = await Activity.countDocuments(query);
    const hasMore = skip + activities.length < total;
    
    
    res.json({
      success: true,
      data: {
        activities,
        hasMore,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error) {
    console.error('Error fetching activities:', error);
    res.status(500).json({ error: 'Failed to fetch activities' });
  }
});

// GET /api/activities/task/:taskId - Get activities for a specific task
router.get('/task/:taskId', authenticateToken, async (req, res) => {
  try {
    const { taskId } = req.params;
    const { page = 1, limit = 10 } = req.query;
    const skip = (page - 1) * limit;
    
    const activities = await Activity.find({ 
      task: taskId,
      $or: [
        { user: req.user._id },
        { assignee: req.user._id }
      ]
    })
      .populate('user', 'fullName email')
      .populate('assignee', 'fullName email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));
    
    const total = await Activity.countDocuments({ 
      task: taskId,
      $or: [
        { user: req.user._id },
        { assignee: req.user._id }
      ]
    });
    
    res.json({
      activities,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching task activities:', error);
    res.status(500).json({ error: 'Failed to fetch task activities' });
  }
});

export default router;
