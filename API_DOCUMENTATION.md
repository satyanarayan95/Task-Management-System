# Task Management API Documentation

## Overview

This document describes the updated Task Management API with enhanced duration-based scheduling and improved recurrence handling.

## Key Changes

### Duration-Based Task System
- Tasks now support duration-based timing in addition to traditional due dates
- Duration can be specified in years, months, days, hours, and minutes
- Recurring tasks require duration for proper instance creation
- Backward compatibility maintained for existing due date-based tasks

### Enhanced Recurrence System
- Improved recurrence pattern structure with better validation
- Recurrence change tracking and versioning
- Support for timezone-aware scheduling
- Dynamic instance creation based on duration

## Task Model Schema

### Core Fields

```javascript
{
  _id: ObjectId,
  title: String (required, max 200 chars),
  description: String (max 1000 chars),
  status: Enum ['todo', 'in_progress', 'done'],
  priority: Enum ['low', 'medium', 'high', 'urgent'],
  category: ObjectId (ref: 'Category'),
  owner: ObjectId (ref: 'User', required),
  assignees: [ObjectId] (ref: 'User'),
  
  // Timing Fields
  startDate: Date,
  dueDate: Date, // Backward compatibility
  duration: {   // New duration-based timing
    years: Number,
    months: Number,
    days: Number,
    hours: Number,
    minutes: Number
  },
  
  // Recurrence Fields
  isRecurring: Boolean,
  recurringPattern: {
    frequency: Enum ['daily', 'weekly', 'monthly', 'yearly'],
    interval: Number,
    daysOfWeek: [Number], // 0-6 (Sunday-Saturday)
    dayOfMonth: Number, // 1-31
    endDate: Date,
    endOccurrences: Number,
    timezone: String
  },
  
  // Tracking Fields
  recurrenceVersion: Number,
  lastRecurrenceUpdate: Date,
  parentTask: ObjectId, // For recurring instances
  
  // Standard fields
  createdAt: Date,
  updatedAt: Date
}
```

## API Endpoints

### GET /api/tasks

Get all tasks for the authenticated user with enhanced filtering.

**Query Parameters:**
- `status`: Filter by status (todo, in_progress, done)
- `priority`: Filter by priority (low, medium, high, urgent)
- `category`: Filter by category ID
- `assignees`: Filter by assignee ID
- `search`: Search in title and description
- `dueDateFrom`: Filter tasks due after this date
- `dueDateTo`: Filter tasks due before this date
- `sortBy`: Sort field (createdAt, updatedAt, dueDate, priority)
- `sortOrder`: Sort order (asc, desc)
- `page`: Page number (default: 1)
- `limit`: Items per page (default: 20, max: 100)

**Response:**
```javascript
{
  tasks: [
    {
      _id: "task_id",
      title: "Task title",
      description: "Task description",
      status: "todo",
      priority: "medium",
      category: { _id: "cat_id", name: "Work", color: "#3B82F6" },
      owner: { _id: "user_id", fullName: "John Doe", email: "john@example.com" },
      assignees: [
        { _id: "user_id", fullName: "Jane Doe", email: "jane@example.com" }
      ],
      startDate: "2024-01-01T09:00:00.000Z",
      dueDate: "2024-01-01T10:00:00.000Z", // Backward compatibility
      duration: { years: 0, months: 0, days: 0, hours: 1, minutes: 0 },
      isRecurring: true,
      recurringPattern: {
        frequency: "daily",
        interval: 1,
        endDate: "2024-12-31T23:59:59.999Z",
        timezone: "UTC"
      },
      recurrenceVersion: 1,
      userPermission: "owner",
      createdAt: "2024-01-01T00:00:00.000Z",
      updatedAt: "2024-01-01T00:00:00.000Z"
    }
  ],
  pagination: {
    currentPage: 1,
    totalPages: 5,
    totalTasks: 100,
    limit: 20,
    hasNextPage: true,
    hasPrevPage: false,
    nextPage: 2,
    prevPage: null
  }
}
```

### GET /api/tasks/:id

Get a specific task by ID.

**Response:** Same as individual task object in tasks array above.

### POST /api/tasks

Create a new task.

**Request Body:**
```javascript
{
  title: "New Task",
  description: "Task description",
  priority: "medium",
  status: "todo",
  category: "category_id", // optional
  assignees: ["user_id1", "user_id2"], // optional
  startDate: "2024-01-01T09:00:00.000Z", // optional
  // Either duration OR dueDate (not both)
  duration: { // Preferred for recurring tasks
    years: 0,
    months: 0,
    days: 0,
    hours: 2,
    minutes: 30
  },
  dueDate: "2024-01-01T11:30:00.000Z", // Backward compatibility
  isRecurring: true,
  recurringPattern: { // Required if isRecurring is true
    frequency: "daily",
    interval: 1,
    endDate: "2024-12-31T23:59:59.999Z", // optional
    endOccurrences: 100, // optional
    timezone: "UTC"
  }
}
```

**Response:** Created task object with all fields populated.

### PUT /api/tasks/:id

Update an existing task.

**Request Body:** Same as create, but all fields are optional.

**Additional Fields for Recurring Tasks:**
- `editScope`: Enum ['this_instance', 'this_and_future', 'all_instances']
  - `this_instance`: Only update this specific occurrence
  - `this_and_future`: Update this and all future instances
  - `all_instances`: Update all instances (past, present, future)

**Response:** Updated task object.

### PUT /api/tasks/:id/status

Update only the status of a task.

**Request Body:**
```javascript
{
  status: "in_progress"
}
```

**Response:** Updated task object.

### DELETE /api/tasks/:id

Delete a task.

**Query Parameters:**
- `deleteScope`: Enum ['this_instance', 'this_and_future', 'all_instances']
  - Required for recurring tasks
  - Default: 'this_instance'

**Response:**
```javascript
{
  message: "Task deleted successfully",
  deletedTasks: 1,
  deletedPatterns: 0 // For recurring tasks
}
```

### GET /api/tasks/:id/recurring

Get recurrence information for a task.

**Response:**
```javascript
{
  isInstance: false,
  parentTask: {
    _id: "parent_task_id",
    title: "Parent Task",
    isRecurring: true
  },
  pattern: {
    rrule: "FREQ=DAILY;INTERVAL=1",
    nextDue: "2024-01-02T09:00:00.000Z",
    lastGenerated: "2024-01-01T09:00:00.000Z",
    isActive: true
  },
  instances: [
    {
      _id: "instance_id",
      title: "Task Instance",
      status: "todo",
      dueDate: "2024-01-01T10:00:00.000Z"
    }
  ],
  editOptions: [
    {
      scope: "this_instance",
      label: "Only this instance",
      description: "Changes will only apply to this specific occurrence"
    },
    {
      scope: "this_and_future",
      label: "This and future instances",
      description: "Changes will apply to this occurrence and all future ones"
    },
    {
      scope: "all_instances",
      label: "All instances",
      description: "Changes will apply to all past, current, and future occurrences"
    }
  ]
}
```

### POST /api/tasks/:id/recurring/preview

Preview changes for recurring task edit.

**Request Body:**
```javascript
{
  editScope: "this_and_future",
  updateData: {
    title: "Updated Task Title",
    priority: "high",
    recurringPattern: {
      frequency: "weekly",
      interval: 2
    }
  }
}
```

**Response:**
```javascript
{
  editScope: "this_and_future",
  description: "This occurrence will be modified and the recurring pattern will be updated for future occurrences.",
  affectedTasksCount: 15,
  affectedTasks: ["task_id1", "task_id2", ...],
  currentTask: {
    _id: "current_task_id",
    title: "Current Task",
    isInstance: true
  },
  parentTask: {
    _id: "parent_task_id",
    title: "Parent Task"
  },
  instancesCount: 15
}
```

## Duration Utilities

### Frontend Duration Utils

```javascript
import { calculateDuration, formatDuration, addToDate } from '../lib/durationUtils';

// Calculate duration between two dates
const duration = calculateDuration(startDate, endDate);
// Returns: { years: 0, months: 0, days: 1, hours: 2, minutes: 30 }

// Format duration for display
const text = formatDuration(duration);
// Returns: "1 day, 2 hours, 30 minutes"

// Add duration to a date
const newDate = addToDate(baseDate, duration);
```

### Backend Duration Utils

```javascript
import { 
  calculateDuration, 
  addToDate, 
  durationToMinutes, 
  minutesToDuration 
} from '../../shared/utils/durationUtils';

// Convert duration to total minutes
const totalMinutes = durationToMinutes(duration);

// Convert minutes back to duration object
const duration = minutesToDuration(totalMinutes);
```

## Recurrence Pattern Validation

### Pattern Schema

```javascript
{
  frequency: "daily|weekly|monthly|yearly", // required
  interval: Number, // required, min: 1, max: 99
  daysOfWeek: [Number], // required for weekly, 0-6 (Sunday-Saturday)
  dayOfMonth: Number, // required for monthly, 1-31
  endDate: Date, // optional - when recurrence should stop
  endOccurrences: Number, // optional - max number of occurrences
  timezone: String // optional, default: "UTC"
}
```

### Validation Rules

1. **Frequency**: Must be one of the allowed values
2. **Interval**: Must be between 1 and 99
3. **Weekly patterns**: Must have at least one day selected
4. **Monthly patterns**: Must have a valid day of month (1-31)
5. **End conditions**: Cannot specify both endDate and endOccurrences
6. **End date**: Must be after start date if specified

## Error Handling

### Validation Errors

```javascript
{
  error: "Validation error",
  message: "Please check the form fields and try again",
  details: [
    {
      field: "recurringPattern.frequency",
      message: "Please select a valid frequency",
      received: "invalid",
      expected: "valid value"
    }
  ]
}
```

### Recurrence Errors

```javascript
{
  error: "Invalid recurring pattern configuration",
  message: "Duration is required for recurring tasks"
}
```

## Migration Guide

### Running the Migration

```bash
cd backend
node scripts/migrateTaskDuration.js
```

### What the Migration Does

1. **Adds duration field** to existing tasks based on start/due dates
2. **Converts RRule strings** to new pattern objects
3. **Adds recurrence versioning** for change tracking
4. **Updates recurring patterns** with instance duration and timezone

### Backward Compatibility

- Existing due date-based tasks continue to work
- Old RRule strings are automatically converted
- API responses include both duration and dueDate when available
- Frontend gracefully handles both formats

## Scheduler Integration

### Dynamic Instance Creation

The scheduler now creates task instances just-in-time based on:

1. **Duration**: Each instance gets a calculated due date based on start date + duration
2. **Pattern**: Recurrence pattern determines when new instances are created
3. **Timezone**: All scheduling respects the specified timezone

### Change Detection

When a recurring task is modified:

1. **Track changes**: Compare old and new patterns/durations
2. **Determine impact**: Estimate affected instances
3. **Update scheduler**: Restart jobs if pattern/duration changes
4. **Log changes**: Maintain audit trail of modifications

## Best Practices

### For Non-Recurring Tasks

- Use duration for more flexible timing
- Specify start date for better scheduling
- Due date is still supported for backward compatibility

### For Recurring Tasks

- Always specify duration (required)
- Use appropriate end conditions (date or occurrences)
- Consider timezone for distributed teams
- Use edit scope appropriately when modifying

### For API Integration

- Handle both duration and dueDate formats
- Validate recurrence patterns before submission
- Use preview endpoint for recurring task changes
- Implement proper error handling for validation failures

## Testing

### Test Cases

1. **Duration Calculation**: Verify duration is correctly calculated from start/due dates
2. **Recurrence Patterns**: Test all frequency types and end conditions
3. **Change Tracking**: Verify recurrence changes are properly tracked
4. **Migration**: Test data migration from old to new format
5. **Scheduler**: Verify instances are created correctly with duration

### Example Test Scenarios

```javascript
// Test duration-based task creation
const taskData = {
  title: "Duration Task",
  duration: { years: 0, months: 0, days: 1, hours: 2, minutes: 30 },
  startDate: "2024-01-01T09:00:00.000Z"
};
// Expected dueDate: "2024-01-02T11:30:00.000Z"

// Test recurring pattern validation
const pattern = {
  frequency: "weekly",
  interval: 2,
  daysOfWeek: [1, 3, 5], // Monday, Wednesday, Friday
  endDate: "2024-12-31T23:59:59.999Z"
};
// Should create instances every 2 weeks on Mon/Wed/Fri
```

## Support

For questions or issues related to the new duration-based task system:

1. Check the migration script output for data issues
2. Review the validation error messages for pattern problems
3. Use the preview endpoint to test recurring changes
4. Check the scheduler logs for instance creation issues