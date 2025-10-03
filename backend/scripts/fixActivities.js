import mongoose from 'mongoose';
import Activity from '../models/Activity.js';
import User from '../models/User.js';

const fixActivities = async () => {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/task-management');
    console.log('Connected to MongoDB');

    console.log('Finding activities with raw MongoDB documents...');
    
    const activities = await Activity.find({
      description: { $regex: /ObjectId/ }
    });

    console.log(`Found ${activities.length} activities with raw MongoDB documents`);

    for (const activity of activities) {
      console.log(`Fixing activity: ${activity.description}`);
      
      if (activity.type === 'task_assigned') {
        const match = activity.description.match(/Assigned task "([^"]+)" to \{.*fullName: '([^']+)'.*\}/);
        if (match) {
          const taskTitle = match[1];
          const userName = match[2];
          const newDescription = `Assigned task "${taskTitle}" to ${userName}`;
          
          console.log(`  Old: ${activity.description}`);
          console.log(`   ${newDescription}`);
          
          activity.description = newDescription;
          await activity.save();
          console.log(`  Fixed!`);
        }
      }
    }

    console.log('All activities fixed!');
    process.exit(0);
  } catch (error) {
    console.error('Error fixing activities:', error);
    process.exit(1);
  }
};

fixActivities();
