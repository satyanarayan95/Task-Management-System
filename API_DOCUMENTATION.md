# Task Management System - API Documentation

## Base URL
```
http://localhost:5500/api
```

## Authentication

All protected endpoints require a JWT token in the Authorization header:
```
Authorization: Bearer <jwt_token>
```

## Response Format

### Success Response
```json
{
  "data": { ... },
  "message": "Success message"
}
```

### Error Response
```json
{
  "error": "Error message",
  "details": ["Validation error 1", "Validation error 2"]
}
```

## Endpoints

### Health Check

#### GET /health
Check API health status

**Response:**
```json
{
  "status": "OK",
  "service": "Task Management Backend",
  "timestamp": "2024-01-15T10:00:00.000Z",
  "mongodb": "connected",
  "redis": "connected"
}
```

---

## Authentication

### POST /auth/register
Register a new user

**Request Body:**
```json
{
  "fullName": "John Doe",
  "email": "john@example.com",
  "password": "password123"
}
```

**Response:**
```json
{
  "token": "jwt_token_here",
  "user": {
    "_id": "user_id",
    "fullName": "John Doe",
    "email": "john@example.com"
  }
}
```

### POST /auth/login
Authenticate user

**Request Body:**
```json
{
  "email": "john@example.com",
  "password": "password123"
}
```

**Response:**
```json
{
  "token": "jwt_token_here",
  "user": {
    "_id": "user_id",
    "fullName": "John Doe",
    "email": "john@example.com"
  }
}
```

### GET /auth/profile
Get current user profile (Protected)

**Response:**
```json
{
  "_id": "user_id",
  "fullName": "John Doe",
  "email": "john@example.com",
  "createdAt": "2024-01-01T00:00:00.000Z"
}
```

### PUT /auth/profile
Update user profile (Protected)

**Request Body:**
```json
{
  "fullName": "John Smith",
  "password": "newpassword123" // optional
}
```

---

## Tasks

### GET /tasks
Get user's tasks with optional filtering (Protected)

**Query Parameters:**
- `search` - Search in title and description
- `status` - Filter by status (todo, in_progress, done)
- `priority` - Filter by priority (low, medium, high, urgent)
- `assignee` - Filter by assignee user ID
- `category` - Filter by category ID
- `dueDate` - Filter by due date (YYYY-MM-DD)
- `page` - Page number (default: 1)
- `limit` - Items per page (default: 20)

**Example:**
```
GET /tasks?search=meeting&status=todo&assignee=user123&page=1&limit=10
```

**Response:**
```json
{
  "tasks": [
    {
      "_id": "task_id",
      "title": "Team Meeting",
      "description": "Weekly team sync",
      "status": "todo",
      "priority": "medium",
      "dueDate": "2024-01-15T10:00:00.000Z",
      "creator": {
        "_id": "creator_id",
        "fullName": "Alice Johnson"
      },
      "assignee": {
        "_id": "assignee_id",
        "fullName": "Bob Smith"
      },
      "category": {
        "_id": "category_id",
        "name": "Work"
      },
      "isRecurring": false,
      "createdAt": "2024-01-01T00:00:00.000Z",
      "updatedAt": "2024-01-01T00:00:00.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 25,
    "pages": 3
  }
}
```

### POST /tasks
Create a new task (Protected)

**Request Body:**
```json
{
  "title": "Team Meeting",
  "description": "Weekly team sync",
  "priority": "medium",
  "status": "todo",
  "dueDate": "2024-01-15T10:00:00.000Z",
  "assignee": "user_id", // optional
  "category": "category_id", // optional
  "isRecurring": true, // optional
  "recurringPattern": "FREQ=WEEKLY;BYDAY=MO" // required if isRecurring=true
}
```

**Response:**
```json
{
  "task": {
    "_id": "task_id",
    "title": "Team Meeting",
    "description": "Weekly team sync",
    "status": "todo",
    "priority": "medium",
    "dueDate": "2024-01-15T10:00:00.000Z",
    "creator": "creator_id",
    "assignee": "assignee_id",
    "category": "category_id",
    "isRecurring": true,
    "recurringPattern": "FREQ=WEEKLY;BYDAY=MO",
    "createdAt": "2024-01-01T00:00:00.000Z"
  }
}
```

### GET /tasks/:id
Get task details with activity log (Protected)

**Response:**
```json
{
  "task": {
    "_id": "task_id",
    "title": "Team Meeting",
    "description": "Weekly team sync",
    "status": "todo",
    "priority": "medium",
    "dueDate": "2024-01-15T10:00:00.000Z",
    "creator": {
      "_id": "creator_id",
      "fullName": "Alice Johnson"
    },
    "assignee": {
      "_id": "assignee_id",
      "fullName": "Bob Smith"
    },
    "category": {
      "_id": "category_id",
      "name": "Work"
    },
    "isRecurring": false,
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z"
  },
  "activity": [
    {
      "_id": "activity_id",
      "action": "created",
      "user": {
        "_id": "user_id",
        "fullName": "Alice Johnson"
      },
      "timestamp": "2024-01-01T00:00:00.000Z"
    },
    {
      "_id": "activity_id",
      "action": "status_changed",
      "user": {
        "_id": "user_id",
        "fullName": "Bob Smith"
      },
      "oldValue": "todo",
      "newValue": "in_progress",
      "timestamp": "2024-01-02T00:00:00.000Z"
    }
  ]
}
```

### PUT /tasks/:id
Update a task (Protected)

**Request Body:**
```json
{
  "title": "Updated Team Meeting",
  "description": "Updated description",
  "status": "in_progress",
  "priority": "high",
  "dueDate": "2024-01-16T10:00:00.000Z",
  "assignee": "new_assignee_id",
  "category": "new_category_id"
}
```

### PUT /tasks/:id/status
Update task status only (Protected)

**Request Body:**
```json
{
  "status": "done"
}
```

### DELETE /tasks/:id
Delete a task (Protected)

**Response:**
```json
{
  "message": "Task deleted successfully"
}
```

### GET /tasks/:id/activity
Get task activity history (Protected)

**Response:**
```json
{
  "activity": [
    {
      "_id": "activity_id",
      "action": "created",
      "user": {
        "_id": "user_id",
        "fullName": "Alice Johnson"
      },
      "timestamp": "2024-01-01T00:00:00.000Z"
    }
  ]
}
```

---

## Categories

### GET /categories
Get user's categories (Protected)

**Response:**
```json
{
  "categories": [
    {
      "_id": "category_id",
      "name": "Work",
      "color": "#3b82f6",
      "owner": "user_id",
      "taskCount": 5,
      "createdAt": "2024-01-01T00:00:00.000Z"
    }
  ]
}
```

### POST /categories
Create a new category (Protected)

**Request Body:**
```json
{
  "name": "Personal",
  "color": "#ef4444"
}
```

### PUT /categories/:id
Update a category (Protected)

**Request Body:**
```json
{
  "name": "Updated Category Name",
  "color": "#10b981"
}
```

### DELETE /categories/:id
Delete a category (Protected)

**Note:** Will fail if category has associated tasks

**Response:**
```json
{
  "message": "Category deleted successfully"
}
```

---

## Notifications

### GET /notifications
Get user's notifications (Protected)

**Query Parameters:**
- `unread` - Filter unread notifications (true/false)
- `limit` - Number of notifications to return (default: 20)

**Response:**
```json
{
  "notifications": [
    {
      "_id": "notification_id",
      "type": "task_assigned",
      "title": "New Task Assigned",
      "message": "You have been assigned to 'Team Meeting'",
      "relatedTask": {
        "_id": "task_id",
        "title": "Team Meeting"
      },
      "isRead": false,
      "createdAt": "2024-01-01T00:00:00.000Z"
    }
  ],
  "unreadCount": 3
}
```

### PUT /notifications/:id/read
Mark notification as read (Protected)

**Response:**
```json
{
  "message": "Notification marked as read"
}
```

### PUT /notifications/mark-all-read
Mark all notifications as read (Protected)

**Response:**
```json
{
  "message": "All notifications marked as read",
  "count": 5
}
```

### DELETE /notifications/:id
Delete a notification (Protected)

**Response:**
```json
{
  "message": "Notification deleted successfully"
}
```

---

## Users

### GET /users
Get all users (for assignment dropdowns) (Protected)

**Response:**
```json
{
  "users": [
    {
      "_id": "user_id",
      "fullName": "Alice Johnson",
      "email": "alice@demo.com"
    },
    {
      "_id": "user_id",
      "fullName": "Bob Smith",
      "email": "bob@demo.com"
    }
  ]
}
```

---

## Error Codes

| Status Code | Description |
|-------------|-------------|
| 200 | Success |
| 201 | Created |
| 400 | Bad Request (validation error) |
| 401 | Unauthorized (invalid/missing token) |
| 403 | Forbidden (insufficient permissions) |
| 404 | Not Found |
| 409 | Conflict (duplicate resource) |
| 429 | Too Many Requests (rate limited) |
| 500 | Internal Server Error |

## Rate Limiting

- **General API**: 100 requests per 15 minutes per IP
- **Authentication**: 5 requests per 15 minutes per IP

## Recurring Task Patterns (rrule)

The system uses RFC 5545 rrule format for recurring tasks:

### Common Patterns

```javascript
// Daily
"FREQ=DAILY"

// Weekly on Monday
"FREQ=WEEKLY;BYDAY=MO"

// Monthly on the 15th
"FREQ=MONTHLY;BYMONTHDAY=15"

// Every weekday
"FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR"

// Every 2 weeks
"FREQ=WEEKLY;INTERVAL=2"

// Until a specific date
"FREQ=DAILY;UNTIL=20241231T235959Z"

// Limited occurrences
"FREQ=WEEKLY;COUNT=10"
```

### Editing Recurring Tasks

When updating a recurring task, include the `editScope` parameter:

```json
{
  "title": "Updated Meeting Title",
  "editScope": "this_instance" | "this_and_future" | "all_instances"
}
```

- `this_instance`: Only modify this occurrence
- `this_and_future`: Modify this and all future occurrences
- `all_instances`: Modify all past, current, and future occurrences