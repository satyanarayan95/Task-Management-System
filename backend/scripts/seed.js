import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import User from '../models/User.js';
import Category from '../models/Category.js';
import Task from '../models/Task.js';
import Notification from '../models/Notification.js';
import RecurringPattern from '../models/RecurringPattern.js';
import { patternToRRule, getNextOccurrence } from '../utils/recurringTasks.js';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/taskmanagement';

async function connectDB() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');
  } catch (error) {
    console.error('MongoDB connection error:', error);
    process.exit(1);
  }
}

async function clearDatabase() {
  console.log('Clearing existing data...');
  await User.deleteMany({});
  await Category.deleteMany({});
  await Task.deleteMany({});
  await Notification.deleteMany({});
  await RecurringPattern.deleteMany({});
  console.log('Database cleared');
}

async function createUsers() {
  console.log('Creating demo users...');
  
  const users = [
    {
      fullName: 'John Doe',
      email: 'john@example.com',
      passwordHash: 'password123' // Will be hashed by pre-save middleware
    },
    {
      fullName: 'Jane Smith',
      email: 'jane@example.com',
      passwordHash: 'password123' // Will be hashed by pre-save middleware
    },
    {
      fullName: 'Mike Johnson',
      email: 'mike@example.com',
      passwordHash: 'password123' // Will be hashed by pre-save middleware
    },
    {
      fullName: 'Sarah Wilson',
      email: 'sarah@example.com',
      passwordHash: 'password123' // Will be hashed by pre-save middleware
    },
    {
      fullName: 'David Chen',
      email: 'david@example.com',
      passwordHash: 'password123' // Will be hashed by pre-save middleware
    },
    {
      fullName: 'Emily Rodriguez',
      email: 'emily@example.com',
      passwordHash: 'password123' // Will be hashed by pre-save middleware
    }
  ];

  const createdUsers = [];
  for (const userData of users) {
    const user = new User(userData);
    await user.save();
    createdUsers.push(user);
  }
  
  console.log(`Created ${createdUsers.length} users`);
  return createdUsers;
}

async function createCategories(users) {
  console.log('Creating demo categories...');
  
  const categoryData = [
    // John's categories
    { name: 'Work', color: '#3b82f6', owner: users[0]._id },
    { name: 'Personal', color: '#10b981', owner: users[0]._id },
    { name: 'Health & Fitness', color: '#f59e0b', owner: users[0]._id },
    { name: 'Learning', color: '#8b5cf6', owner: users[0]._id },
    
    // Jane's categories
    { name: 'Projects', color: '#ef4444', owner: users[1]._id },
    { name: 'Home', color: '#06b6d4', owner: users[1]._id },
    { name: 'Finance', color: '#84cc16', owner: users[1]._id },
    
    // Mike's categories
    { name: 'Development', color: '#f97316', owner: users[2]._id },
    { name: 'Research', color: '#ec4899', owner: users[2]._id },
    
    // Sarah's categories
    { name: 'Marketing', color: '#14b8a6', owner: users[3]._id },
    { name: 'Events', color: '#a855f7', owner: users[3]._id },
    
    // David's categories
    { name: 'Design', color: '#f43f5e', owner: users[4]._id },
    { name: 'Client Work', color: '#6366f1', owner: users[4]._id },
    
    // Emily's categories
    { name: 'Content', color: '#eab308', owner: users[5]._id },
    { name: 'Social Media', color: '#22c55e', owner: users[5]._id }
  ];

  const categories = [];
  for (const catData of categoryData) {
    const category = new Category(catData);
    await category.save();
    categories.push(category);
  }
  
  console.log(`Created ${categories.length} categories`);
  return categories;
}

async function createTasks(users, categories) {
  console.log('Creating demo tasks...');
  
  const now = new Date();
  const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const twoDaysAgo = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000);
  const nextMonth = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
  const inThreeDays = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
  const inFiveDays = new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000);
  
  // Helper function to get category by name and owner
  const getCategoryByName = (name, ownerId) => {
    return categories.find(cat => cat.name === name && cat.owner.toString() === ownerId.toString());
  };
  
  const taskData = [
    // John's tasks (users[0])
    {
      title: 'Complete Q1 Project Proposal',
      description: 'Write and submit the Q1 project proposal for the new enterprise client. Include budget estimates, timeline, and resource allocation.',
      status: 'in_progress',
      priority: 'high',
      category: getCategoryByName('Work', users[0]._id)?._id,
      owner: users[0]._id,
      startDate: twoDaysAgo,
      dueDate: tomorrow,
      sharedWith: [{
        user: users[1]._id,
        permission: 'view'
      }]
    },
    {
      title: 'Review Team Performance Reports',
      description: 'Conduct quarterly performance reviews for all team members. Schedule 1:1 meetings and prepare feedback.',
      status: 'todo',
      priority: 'medium',
      category: getCategoryByName('Work', users[0]._id)?._id,
      owner: users[0]._id,
      dueDate: nextWeek
    },
    {
      title: 'Weekly Grocery Shopping',
      description: 'Buy groceries for the week: vegetables, fruits, dairy, and household essentials',
      status: 'todo',
      priority: 'low',
      category: getCategoryByName('Personal', users[0]._id)?._id,
      owner: users[0]._id,
      dueDate: tomorrow,
      isRecurring: true
    },
    {
      title: 'Morning Workout Routine',
      description: 'Complete 45-minute workout: 20 min cardio + 25 min strength training',
      status: 'done',
      priority: 'medium',
      category: getCategoryByName('Health & Fitness', users[0]._id)?._id,
      owner: users[0]._id,
      startDate: yesterday,
      dueDate: yesterday,
      isRecurring: true
    },
    {
      title: 'Learn Advanced React Patterns',
      description: 'Study React hooks, context patterns, and performance optimization techniques. Complete online course modules.',
      status: 'in_progress',
      priority: 'medium',
      category: getCategoryByName('Learning', users[0]._id)?._id,
      owner: users[0]._id,
      dueDate: nextWeek
    },
    {
      title: 'Plan Summer Vacation',
      description: 'Research destinations, compare prices, and book flights and accommodation for family vacation',
      status: 'todo',
      priority: 'low',
      category: getCategoryByName('Personal', users[0]._id)?._id,
      owner: users[0]._id,
      dueDate: nextMonth,
      sharedWith: [{
        user: users[1]._id,
        permission: 'edit'
      }]
    },
    
    // Jane's tasks (users[1])
    {
      title: 'Website Redesign Project',
      description: 'Complete redesign of company website with modern UI/UX. Include mobile responsiveness and accessibility features.',
      status: 'in_progress',
      priority: 'urgent',
      category: getCategoryByName('Projects', users[1]._id)?._id,
      owner: users[1]._id,
      dueDate: nextWeek,
      sharedWith: [{
        user: users[0]._id,
        permission: 'edit'
      }, {
        user: users[4]._id,
        permission: 'view'
      }]
    },
    {
      title: 'Fix Kitchen Sink Leak',
      description: 'Repair the leaky kitchen sink faucet. May need to replace washers or call plumber if complex.',
      status: 'todo',
      priority: 'high',
      category: getCategoryByName('Home', users[1]._id)?._id,
      owner: users[1]._id,
      dueDate: tomorrow
    },
    {
      title: 'Monthly Budget Review',
      description: 'Review monthly expenses, update budget spreadsheet, and plan for next month\'s financial goals',
      status: 'todo',
      priority: 'medium',
      category: getCategoryByName('Finance', users[1]._id)?._id,
      owner: users[1]._id,
      dueDate: inThreeDays,
      isRecurring: true
    },
    {
      title: 'Organize Home Office',
      description: 'Declutter desk, organize files, and set up better lighting for remote work',
      status: 'done',
      priority: 'low',
      category: getCategoryByName('Home', users[1]._id)?._id,
      owner: users[1]._id,
      dueDate: yesterday
    },
    
    // Mike's tasks (users[2])
    {
      title: 'API Documentation Update',
      description: 'Update REST API documentation with new endpoints and authentication changes',
      status: 'in_progress',
      priority: 'high',
      category: getCategoryByName('Development', users[2]._id)?._id,
      owner: users[2]._id,
      dueDate: inThreeDays,
      sharedWith: [{
        user: users[0]._id,
        permission: 'view'
      }]
    },
    {
      title: 'Research New Framework Options',
      description: 'Evaluate Next.js vs Nuxt.js for upcoming project. Compare performance, features, and learning curve.',
      status: 'todo',
      priority: 'medium',
      category: getCategoryByName('Research', users[2]._id)?._id,
      owner: users[2]._id,
      dueDate: nextWeek
    },
    {
      title: 'Code Review - Authentication Module',
      description: 'Review pull request for new authentication system. Check security, performance, and code quality.',
      status: 'todo',
      priority: 'urgent',
      category: getCategoryByName('Development', users[2]._id)?._id,
      owner: users[2]._id,
      dueDate: tomorrow
    },
    
    // Sarah's tasks (users[3])
    {
      title: 'Q1 Marketing Campaign Launch',
      description: 'Launch social media campaign for new product. Coordinate with design team and schedule posts.',
      status: 'in_progress',
      priority: 'urgent',
      category: getCategoryByName('Marketing', users[3]._id)?._id,
      owner: users[3]._id,
      dueDate: tomorrow,
      sharedWith: [{
        user: users[5]._id,
        permission: 'edit'
      }]
    },
    {
      title: 'Plan Company Retreat',
      description: 'Organize annual company retreat: venue booking, catering, activities, and transportation',
      status: 'todo',
      priority: 'medium',
      category: getCategoryByName('Events', users[3]._id)?._id,
      owner: users[3]._id,
      dueDate: nextMonth
    },
    {
      title: 'Weekly Marketing Metrics Review',
      description: 'Analyze website traffic, conversion rates, and social media engagement metrics',
      status: 'done',
      priority: 'medium',
      category: getCategoryByName('Marketing', users[3]._id)?._id,
      owner: users[3]._id,
      dueDate: yesterday,
      isRecurring: true
    },
    
    // David's tasks (users[4])
    {
      title: 'Mobile App UI Mockups',
      description: 'Create high-fidelity mockups for mobile app redesign. Focus on user experience and accessibility.',
      status: 'in_progress',
      priority: 'high',
      category: getCategoryByName('Design', users[4]._id)?._id,
      owner: users[4]._id,
      dueDate: inFiveDays
    },
    {
      title: 'Client Presentation Slides',
      description: 'Design presentation slides for client meeting. Include project timeline and design concepts.',
      status: 'todo',
      priority: 'urgent',
      category: getCategoryByName('Client Work', users[4]._id)?._id,
      owner: users[4]._id,
      dueDate: tomorrow,
      sharedWith: [{
        user: users[1]._id,
        permission: 'view'
      }]
    },
    {
      title: 'Brand Guidelines Update',
      description: 'Update company brand guidelines with new logo variations and color palette',
      status: 'todo',
      priority: 'low',
      category: getCategoryByName('Design', users[4]._id)?._id,
      owner: users[4]._id,
      dueDate: nextWeek
    },
    
    // Emily's tasks (users[5])
    {
      title: 'Blog Post - React Best Practices',
      description: 'Write comprehensive blog post about React performance optimization and best practices',
      status: 'in_progress',
      priority: 'medium',
      category: getCategoryByName('Content', users[5]._id)?._id,
      owner: users[5]._id,
      dueDate: inThreeDays
    },
    {
      title: 'Social Media Content Calendar',
      description: 'Plan and schedule social media posts for next month. Include product updates and industry news.',
      status: 'todo',
      priority: 'medium',
      category: getCategoryByName('Social Media', users[5]._id)?._id,
      owner: users[5]._id,
      dueDate: nextWeek,
      sharedWith: [{
        user: users[3]._id,
        permission: 'edit'
      }]
    },
    {
      title: 'Daily Social Media Check',
      description: 'Monitor social media channels, respond to comments, and engage with community',
      status: 'done',
      priority: 'low',
      category: getCategoryByName('Social Media', users[5]._id)?._id,
      owner: users[5]._id,
      dueDate: yesterday,
      isRecurring: true
    },
    
    // Shared collaborative tasks
    {
      title: 'Team Standup Meeting',
      description: 'Daily team standup to discuss progress, blockers, and plan for the day',
      status: 'todo',
      priority: 'medium',
      category: getCategoryByName('Work', users[0]._id)?._id,
      owner: users[0]._id,
      startDate: now,
      dueDate: now,
      isRecurring: true,
      sharedWith: [{
        user: users[1]._id,
        permission: 'view'
      }, {
        user: users[2]._id,
        permission: 'view'
      }]
    },
    {
      title: 'Product Roadmap Planning',
      description: 'Collaborative session to plan Q2 product roadmap and feature prioritization',
      status: 'todo',
      priority: 'high',
      category: getCategoryByName('Projects', users[1]._id)?._id,
      owner: users[1]._id,
      dueDate: inFiveDays,
      sharedWith: [{
        user: users[0]._id,
        permission: 'edit'
      }, {
        user: users[2]._id,
        permission: 'edit'
      }, {
        user: users[3]._id,
        permission: 'view'
      }]
    }
  ];

  const tasks = [];
  for (let i = 0; i < taskData.length; i++) {
    const taskInfo = taskData[i];
    
    // Skip tasks with missing categories
    if (!taskInfo.category) {
      console.log(`Skipping task "${taskInfo.title}" - category not found`);
      continue;
    }
    
    const task = new Task(taskInfo);
    
    // Handle recurring tasks
    if (task.isRecurring) {
      let recurringPattern;
      
      // Different patterns for different tasks
      if (task.title.includes('Workout') || task.title.includes('Social Media Check')) {
        recurringPattern = {
          type: 'daily',
          interval: 1
        };
      } else if (task.title.includes('Grocery') || task.title.includes('Metrics Review')) {
        recurringPattern = {
          type: 'weekly',
          interval: 1,
          daysOfWeek: [0] // Sunday for grocery, Monday for metrics
        };
      } else if (task.title.includes('Budget Review')) {
        recurringPattern = {
          type: 'monthly',
          interval: 1,
          dayOfMonth: 1
        };
      } else if (task.title.includes('Standup')) {
        recurringPattern = {
          type: 'daily',
          interval: 1,
          daysOfWeek: [1, 2, 3, 4, 5] // Weekdays only
        };
      } else {
        // Default weekly pattern
        recurringPattern = {
          type: 'weekly',
          interval: 1
        };
      }
      
      const startDate = task.startDate || task.dueDate || new Date();
      const rruleString = patternToRRule(recurringPattern, startDate);
      task.recurringPattern = rruleString;
    }
    
    await task.save();
    
    // Create RecurringPattern record for recurring tasks
    if (task.isRecurring && task.recurringPattern) {
      const startDate = task.startDate || task.dueDate || new Date();
      const nextOccurrence = getNextOccurrence(task.recurringPattern, startDate);
      
      const recurringPatternRecord = new RecurringPattern({
        task: task._id,
        rrule: task.recurringPattern,
        nextDue: nextOccurrence,
        lastGenerated: new Date()
      });
      
      await recurringPatternRecord.save();
    }
    
    tasks.push(task);
  }
  
  console.log(`Created ${tasks.length} tasks`);
  return tasks;
}

async function createNotifications(users, tasks) {
  console.log('Creating demo notifications...');
  
  // Helper function to find task by title
  const findTaskByTitle = (title) => {
    return tasks.find(task => task.title.includes(title));
  };
  
  const notificationData = [
    // John's notifications (users[0])
    {
      user: users[0]._id,
      type: 'reminder',
      title: 'Task Due Tomorrow',
      message: 'Q1 Project Proposal is due tomorrow',
      relatedTask: findTaskByTitle('Q1 Project Proposal')?._id,
      isRead: false,
      createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000) // 2 hours ago
    },
    {
      user: users[0]._id,
      type: 'shared_task',
      title: 'Task Shared With You',
      message: 'Jane Smith shared "Website Redesign Project" with you',
      relatedTask: findTaskByTitle('Website Redesign')?._id,
      isRead: false,
      createdAt: new Date(Date.now() - 4 * 60 * 60 * 1000) // 4 hours ago
    },
    {
      user: users[0]._id,
      type: 'reminder',
      title: 'Weekly Task Due',
      message: 'Don\'t forget your weekly grocery shopping',
      relatedTask: findTaskByTitle('Grocery Shopping')?._id,
      isRead: true,
      createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000) // 1 day ago
    },
    
    // Jane's notifications (users[1])
    {
      user: users[1]._id,
      type: 'reminder',
      title: 'High Priority Task',
      message: 'Kitchen sink repair is due tomorrow',
      relatedTask: findTaskByTitle('Kitchen Sink')?._id,
      isRead: false,
      createdAt: new Date(Date.now() - 1 * 60 * 60 * 1000) // 1 hour ago
    },
    {
      user: users[1]._id,
      type: 'shared_task',
      title: 'Task Shared With You',
      message: 'John Doe shared "Plan Summer Vacation" with you',
      relatedTask: findTaskByTitle('Summer Vacation')?._id,
      isRead: false,
      createdAt: new Date(Date.now() - 6 * 60 * 60 * 1000) // 6 hours ago
    },
    {
      user: users[1]._id,
      type: 'reminder',
      title: 'Monthly Review Due',
      message: 'Time for your monthly budget review',
      relatedTask: findTaskByTitle('Budget Review')?._id,
      isRead: true,
      createdAt: new Date(Date.now() - 12 * 60 * 60 * 1000) // 12 hours ago
    },
    
    // Mike's notifications (users[2])
    {
      user: users[2]._id,
      type: 'reminder',
      title: 'Urgent Code Review',
      message: 'Authentication module code review is due tomorrow',
      relatedTask: findTaskByTitle('Code Review')?._id,
      isRead: false,
      createdAt: new Date(Date.now() - 30 * 60 * 1000) // 30 minutes ago
    },
    {
      user: users[2]._id,
      type: 'shared_task',
      title: 'Added to Collaborative Task',
      message: 'You were added to "Product Roadmap Planning"',
      relatedTask: findTaskByTitle('Roadmap Planning')?._id,
      isRead: false,
      createdAt: new Date(Date.now() - 3 * 60 * 60 * 1000) // 3 hours ago
    },
    
    // Sarah's notifications (users[3])
    {
      user: users[3]._id,
      type: 'reminder',
      title: 'Campaign Launch Tomorrow',
      message: 'Q1 Marketing Campaign launches tomorrow - final preparations needed',
      relatedTask: findTaskByTitle('Marketing Campaign')?._id,
      isRead: false,
      createdAt: new Date(Date.now() - 45 * 60 * 1000) // 45 minutes ago
    },
    {
      user: users[3]._id,
      type: 'shared_task',
      title: 'Collaboration Request',
      message: 'Emily Rodriguez shared "Social Media Content Calendar" with you',
      relatedTask: findTaskByTitle('Content Calendar')?._id,
      isRead: true,
      createdAt: new Date(Date.now() - 8 * 60 * 60 * 1000) // 8 hours ago
    },
    
    // David's notifications (users[4])
    {
      user: users[4]._id,
      type: 'reminder',
      title: 'Client Presentation Due',
      message: 'Client presentation slides are due tomorrow',
      relatedTask: findTaskByTitle('Presentation Slides')?._id,
      isRead: false,
      createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000) // 2 hours ago
    },
    {
      user: users[4]._id,
      type: 'shared_task',
      title: 'Task Visibility',
      message: 'Jane Smith gave you view access to "Website Redesign Project"',
      relatedTask: findTaskByTitle('Website Redesign')?._id,
      isRead: true,
      createdAt: new Date(Date.now() - 5 * 60 * 60 * 1000) // 5 hours ago
    },
    
    // Emily's notifications (users[5])
    {
      user: users[5]._id,
      type: 'reminder',
      title: 'Blog Post Deadline',
      message: 'React Best Practices blog post is due in 3 days',
      relatedTask: findTaskByTitle('Blog Post')?._id,
      isRead: false,
      createdAt: new Date(Date.now() - 1 * 60 * 60 * 1000) // 1 hour ago
    },
    {
      user: users[5]._id,
      type: 'shared_task',
      title: 'Marketing Collaboration',
      message: 'Sarah Wilson shared "Q1 Marketing Campaign Launch" with you',
      relatedTask: findTaskByTitle('Marketing Campaign')?._id,
      isRead: false,
      createdAt: new Date(Date.now() - 4 * 60 * 60 * 1000) // 4 hours ago
    },
    
    // Additional reminder notifications
    {
      user: users[0]._id,
      type: 'reminder',
      title: 'Daily Standup Reminder',
      message: 'Team standup meeting starts in 15 minutes',
      relatedTask: findTaskByTitle('Standup Meeting')?._id,
      isRead: true,
      createdAt: new Date(Date.now() - 48 * 60 * 60 * 1000) // 2 days ago
    },
    {
      user: users[1]._id,
      type: 'overdue',
      title: 'Overdue Task',
      message: 'Monthly budget review was due yesterday',
      relatedTask: findTaskByTitle('Budget Review')?._id,
      isRead: false,
      createdAt: new Date(Date.now() - 18 * 60 * 60 * 1000) // 18 hours ago
    }
  ];

  const notifications = [];
  for (const notifData of notificationData) {
    // Skip notifications with missing related tasks
    if (notifData.relatedTask === undefined) {
      continue;
    }
    
    const notification = new Notification(notifData);
    await notification.save();
    notifications.push(notification);
  }
  
  console.log(`Created ${notifications.length} notifications`);
  return notifications;
}

async function seedDatabase() {
  try {
    await connectDB();
    await clearDatabase();
    
    const users = await createUsers();
    const categories = await createCategories(users);
    const tasks = await createTasks(users, categories);
    const notifications = await createNotifications(users, tasks);
    
    console.log('\n=== Database Seeding Complete ===');
    console.log(`Users: ${users.length}`);
    console.log(`Categories: ${categories.length}`);
    console.log(`Tasks: ${tasks.length}`);
    console.log(`Notifications: ${notifications.length}`);
    console.log('\n=== Demo Accounts ===');
    console.log('All accounts use password: password123');
    console.log('');
    console.log('👤 john@example.com (John Doe)');
    console.log('   - Focus: Work tasks, personal planning, learning');
    console.log('   - Has shared tasks with Jane');
    console.log('');
    console.log('👤 jane@example.com (Jane Smith)');
    console.log('   - Focus: Projects, home management, finance');
    console.log('   - Collaborates on website redesign');
    console.log('');
    console.log('👤 mike@example.com (Mike Johnson)');
    console.log('   - Focus: Development, research, code reviews');
    console.log('   - Technical team member');
    console.log('');
    console.log('👤 sarah@example.com (Sarah Wilson)');
    console.log('   - Focus: Marketing campaigns, event planning');
    console.log('   - Collaborates with Emily on content');
    console.log('');
    console.log('👤 david@example.com (David Chen)');
    console.log('   - Focus: Design work, client presentations');
    console.log('   - Visual design specialist');
    console.log('');
    console.log('👤 emily@example.com (Emily Rodriguez)');
    console.log('   - Focus: Content creation, social media');
    console.log('   - Content marketing specialist');
    console.log('');
    console.log('🔄 Recurring Tasks: Daily workouts, weekly meetings, monthly reviews');
    console.log('🤝 Shared Tasks: Multiple collaborative projects across users');
    console.log('🔔 Notifications: Mix of reminders, shared task alerts, and system messages');
    
  } catch (error) {
    console.error('Seeding error:', error);
  } finally {
    await mongoose.connection.close();
    console.log('Database connection closed');
  }
}

// Run seeding if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  seedDatabase();
}

export default seedDatabase;