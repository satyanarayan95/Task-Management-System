import cron from 'node-cron';
import dotenv from 'dotenv';
import DatabaseConnection from './config/database.js';
import JobProcessor from './utils/jobProcessor.js';

dotenv.config();

class SchedulerService {
  constructor() {
    this.dbConnection = new DatabaseConnection();
    this.jobProcessor = null;
    this.isRunning = false;
    this.cronJobs = [];
  }

  async start() {
    try {
      console.log(`[${new Date().toISOString()}] Task Management Scheduler Service Starting...`);
      const { redis } = await this.dbConnection.connect();
      this.jobProcessor = new JobProcessor(redis);
      this.setupCronJobs();
      this.isRunning = true;
      console.log(`[${new Date().toISOString()}] Scheduler service started successfully!`);
      
    } catch (error) {
      console.error(`[${new Date().toISOString()}] Failed to start scheduler service:`, error);
      process.exit(1);
    }
  }

  setupCronJobs() {
    // Health check every 5 minutes
    const healthCheckJob = cron.schedule('*/5 * * * *', async () => {
      try {
        if (this.jobProcessor) {
          await this.jobProcessor.healthCheck();
        }
        
        if (this.dbConnection.isHealthy()) {
          console.log(`[${new Date().toISOString()}] Scheduler service is healthy`);
        } else {
          console.warn(`[${new Date().toISOString()}] Scheduler service health check warning - database connections may be unstable`);
        }
      } catch (error) {
        console.error(`[${new Date().toISOString()}] Health check error:`, error);
      }
    });

    // Main job processing every minute
    const jobProcessingJob = cron.schedule('* * * * *', async () => {
      try {
        if (this.jobProcessor && this.dbConnection.isHealthy()) {
          await this.jobProcessor.processJobs();
        } else {
          console.warn(`[${new Date().toISOString()}] Skipping job processing - service not ready`);
        }
      } catch (error) {
        console.error(`[${new Date().toISOString()}] Job processing error:`, error);
      }
    });

    // Processing stats every 10 minutes
    const statsJob = cron.schedule('*/10 * * * *', async () => {
      try {
        if (this.jobProcessor && this.dbConnection.isHealthy()) {
          const stats = await this.jobProcessor.getProcessingStats();
          if (stats) {
            console.log(`[${new Date().toISOString()}] Processing Stats:`, JSON.stringify(stats, null, 2));
          }
        }
      } catch (error) {
        console.error(`[${new Date().toISOString()}] Stats collection error:`, error);
      }
    });

    // Failed notification retry every 5 minutes
    const retryJob = cron.schedule('*/5 * * * *', async () => {
      try {
        if (this.jobProcessor && this.dbConnection.isHealthy()) {
          await this.jobProcessor.processFailedNotifications();
        }
      } catch (error) {
        console.error(`[${new Date().toISOString()}] Failed notification retry error:`, error);
      }
    });

    this.cronJobs = [healthCheckJob, jobProcessingJob, retryJob, statsJob];
    console.log(`[${new Date().toISOString()}] Cron jobs scheduled successfully`);
  }

  async shutdown() {
    try {
      console.log(`[${new Date().toISOString()}] Scheduler service shutting down gracefully...`);
      
      this.isRunning = false;
      
      // Stop all cron jobs
      this.cronJobs.forEach(job => {
        if (job) {
          job.stop();
        }
      });
      
      // Wait for any ongoing job processing to complete
      if (this.jobProcessor && this.jobProcessor.isProcessing) {
        console.log(`[${new Date().toISOString()}] Waiting for ongoing job processing to complete...`);
        let attempts = 0;
        while (this.jobProcessor.isProcessing && attempts < 30) {
          await new Promise(resolve => setTimeout(resolve, 1000));
          attempts++;
        }
      }
      
      // Close database connections
      await this.dbConnection.disconnect();
      
      console.log(`[${new Date().toISOString()}] Scheduler service shutdown complete`);
      process.exit(0);
    } catch (error) {
      console.error(`[${new Date().toISOString()}] Error during shutdown:`, error);
      process.exit(1);
    }
  }
}

// Initialize and start the scheduler service
const schedulerService = new SchedulerService();

// Graceful shutdown handlers
process.on('SIGTERM', () => {
  schedulerService.shutdown();
});

process.on('SIGINT', () => {
  schedulerService.shutdown();
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error(`[${new Date().toISOString()}] Uncaught exception:`, error);
  schedulerService.shutdown();
});

process.on('unhandledRejection', (reason, promise) => {
  console.error(`[${new Date().toISOString()}] Unhandled rejection at:`, promise, 'reason:', reason);
  schedulerService.shutdown();
});

// Start the service
schedulerService.start();