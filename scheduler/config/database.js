import mongoose from 'mongoose';
import { createClient } from 'redis';

class DatabaseConnection {
  constructor() {
    this.mongoConnection = null;
    this.redisClient = null;
    this.isConnected = false;
  }

  async connectMongoDB() {
    try {
      const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/taskmanagement';
      
      this.mongoConnection = await mongoose.connect(mongoUri, {
        maxPoolSize: 10,
        serverSelectionTimeoutMS: 5500,
        socketTimeoutMS: 45500,
      });

      console.log(`[${new Date().toISOString()}] MongoDB connected successfully`);
      
      // Handle connection events
      mongoose.connection.on('error', (err) => {
        console.error(`[${new Date().toISOString()}] MongoDB connection error:`, err);
      });

      mongoose.connection.on('disconnected', () => {
        console.log(`[${new Date().toISOString()}] MongoDB disconnected`);
        this.isConnected = false;
      });

      return this.mongoConnection;
    } catch (error) {
      console.error(`[${new Date().toISOString()}] MongoDB connection failed:`, error);
      throw error;
    }
  }

  async connectRedis() {
    try {
      const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
      
      this.redisClient = createClient({
        url: redisUrl,
        socket: {
          reconnectStrategy: (retries) => {
            if (retries > 3) {
              console.error(`[${new Date().toISOString()}] Redis max reconnection attempts reached`);
              return false;
            }
            return Math.min(retries * 100, 3000);
          }
        }
      });

      this.redisClient.on('error', (err) => {
        console.error(`[${new Date().toISOString()}] Redis connection error:`, err);
      });

      this.redisClient.on('connect', () => {
        console.log(`[${new Date().toISOString()}] Redis connected successfully`);
      });

      this.redisClient.on('reconnecting', () => {
        console.log(`[${new Date().toISOString()}] Redis reconnecting...`);
      });

      await this.redisClient.connect();
      return this.redisClient;
    } catch (error) {
      console.error(`[${new Date().toISOString()}] Redis connection failed:`, error);
      throw error;
    }
  }

  async connect() {
    try {
      await Promise.all([
        this.connectMongoDB(),
        this.connectRedis()
      ]);
      
      this.isConnected = true;
      console.log(`[${new Date().toISOString()}] All database connections established`);
      return { mongo: this.mongoConnection, redis: this.redisClient };
    } catch (error) {
      console.error(`[${new Date().toISOString()}] Database connection setup failed:`, error);
      throw error;
    }
  }

  async disconnect() {
    try {
      const promises = [];
      
      if (this.mongoConnection) {
        promises.push(mongoose.disconnect());
      }
      
      if (this.redisClient) {
        promises.push(this.redisClient.quit());
      }

      await Promise.all(promises);
      this.isConnected = false;
      console.log(`[${new Date().toISOString()}] All database connections closed`);
    } catch (error) {
      console.error(`[${new Date().toISOString()}] Error closing database connections:`, error);
      throw error;
    }
  }

  getRedisClient() {
    return this.redisClient;
  }

  isHealthy() {
    return this.isConnected && 
           mongoose.connection.readyState === 1 && 
           this.redisClient && 
           this.redisClient.isReady;
  }
}

export default DatabaseConnection;