# Task Management Scheduler Service

A background service for processing recurring tasks, notifications, and reminders in the Task Management System.

## Features

- **Recurring Task Generation**: Automatically creates new task instances based on RRule patterns
- **Task Reminders**: Sends notifications for tasks due within the next hour
- **Overdue Task Notifications**: Alerts users about overdue tasks
- **Failed Notification Retry**: Redis-based queue for retrying failed notifications
- **Health Monitoring**: Regular health checks and processing statistics
- **Graceful Shutdown**: Clean shutdown handling for Docker environments

## Architecture

### Components

- **DatabaseConnection**: Manages MongoDB and Redis connections with retry logic
- **JobProcessor**: Core processing logic for all background jobs
- **RRule Helper**: Utilities for working with recurring patterns
- **Models**: Mongoose schemas for Task, Notification, RecurringPattern, and User

### Processing Schedule

- **Job Processing**: Every minute
- **Health Checks**: Every 5 minutes
- **Failed Notification Retry**: Every 5 minutes
- **Processing Statistics**: Every 10 minutes

## Configuration

### Environment Variables

```bash
NODE_ENV=development
MONGODB_URI=mongodb://localhost:27017/taskmanagement
REDIS_URL=redis://localhost:6379
```

### Dependencies

- **mongoose**: MongoDB ODM
- **redis**: Redis client for queuing
- **rrule**: RFC 5545 recurrence rule processing
- **node-cron**: Cron job scheduling
- **dotenv**: Environment variable management

## Usage

### Development

```bash
npm install
npm run dev
```

### Production

```bash
npm install --production
npm start
```

### Testing

```bash
npm test
```

## Job Processing Logic

### Recurring Tasks

1. Finds active recurring patterns with `nextDue <= now`
2. Creates new task instances based on parent task properties
3. Calculates next occurrence using RRule
4. Updates pattern or deactivates if no more occurrences
5. Creates notification for task owner

### Task Reminders

1. Finds tasks due within the next hour
2. Checks for existing reminders (prevents duplicates)
3. Creates reminder notifications for task owners

### Overdue Tasks

1. Finds tasks past their due date and not completed
2. Checks for existing overdue notifications
3. Creates overdue notifications for task owners

### Failed Notifications

1. Retrieves failed notifications from Redis queue
2. Retries up to 5 times with exponential backoff
3. Logs permanently failed notifications for manual review
4. Cleans up old failed notifications (>24 hours)

## Error Handling

- **Database Connection Errors**: Automatic retry with exponential backoff
- **Individual Job Failures**: Logged and skipped, doesn't stop other processing
- **Redis Failures**: Graceful degradation, continues without queuing
- **RRule Parsing Errors**: Logged and pattern deactivated
- **Notification Creation Failures**: Queued for retry in Redis

## Monitoring

### Health Checks

- Database connectivity (MongoDB and Redis)
- Active recurring patterns count
- Failed notification queue length
- Task and notification counts

### Processing Statistics

```json
{
  "timestamp": "2024-01-01T12:00:00.000Z",
  "tasks": {
    "total": 150,
    "todo": 45,
    "inProgress": 30,
    "done": 75,
    "overdue": 5
  },
  "notifications": {
    "total": 200,
    "unread": 25
  },
  "recurringPatterns": {
    "active": 20,
    "inactive": 5,
    "dueNow": 3
  },
  "failedNotifications": 2
}
```

## Docker Integration

The scheduler service is designed to run in a Docker container alongside the main application:

```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
CMD ["npm", "run", "dev"]
```

## Troubleshooting

### Common Issues

1. **MongoDB Connection Failures**
   - Check `MONGODB_URI` environment variable
   - Ensure MongoDB is running and accessible
   - Check network connectivity in Docker environment

2. **Redis Connection Failures**
   - Check `REDIS_URL` environment variable
   - Ensure Redis is running and accessible
   - Service continues without Redis but loses retry functionality

3. **RRule Parsing Errors**
   - Check recurring pattern data in database
   - Validate RRule strings using online validators
   - Patterns with errors are automatically deactivated

4. **High Failed Notification Count**
   - Check database connectivity
   - Review notification creation logic
   - Monitor Redis queue for patterns

### Logs

All operations are logged with timestamps:
- `[timestamp] message` format
- Error logs include stack traces
- Health checks log system status
- Processing stats logged every 10 minutes

## Development

### Adding New Job Types

1. Add processing method to `JobProcessor` class
2. Call from `processJobs()` method
3. Add error handling and logging
4. Update health checks if needed

### Modifying Schedules

Update cron expressions in `scheduler.js`:
- `* * * * *` - Every minute
- `*/5 * * * *` - Every 5 minutes
- `*/10 * * * *` - Every 10 minutes

### Testing

The service includes basic infrastructure tests:
- File structure validation
- Class instantiation tests
- Method existence verification
- Basic RRule functionality tests