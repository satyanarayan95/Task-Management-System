import mongoose from 'mongoose';
import Activity from '../models/Activity.js';

const checkActivities = async () => {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/task-management');
    console.log('Connected to MongoDB');

    console.log('Finding activities with ObjectId...');
    
    const activities = await Activity.find({
      description: { $regex: /ObjectId/ }
    });

    console.log(`Found ${activities.length} activities with ObjectId`);

    for (const activity of activities) {
      console.log(`Activity ID: ${activity._id}`);
      console.log(`Type: ${activity.type}`);
      console.log(`Description: ${JSON.stringify(activity.description)}`);
      console.log('---');
    }

    process.exit(0);
  } catch (error) {
    console.error('Error checking activities:', error);
    process.exit(1);
  }
};

checkActivities();
