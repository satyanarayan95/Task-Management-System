# Shared Validation Schemas

This package contains Zod validation schemas that are shared between the frontend and backend services of the Task Management System.

## Installation

The shared schemas are automatically available to both frontend and backend services through Docker volume mounts.

## Usage

### Import all schemas
```javascript
import {
  userRegistrationSchema,
  taskCreateSchema,
  categoryCreateSchema,
  // ... other schemas
} from './shared/index.js';
```

### Import specific schema modules
```javascript
import { userRegistrationSchema } from './shared/schemas/user.js';
import { taskCreateSchema } from './shared/schemas/task.js';
```

## Available Schemas

### User Schemas (`schemas/user.js`)
- `userRegistrationSchema` - Validates user registration data
- `userLoginSchema` - Validates user login credentials
- `userProfileUpdateSchema` - Validates user profile updates

### Task Schemas (`schemas/task.js`)
- `taskCreateSchema` - Validates task creation data
- `taskUpdateSchema` - Validates task updates
- `taskStatusUpdateSchema` - Validates task status changes
- `taskAssignmentSchema` - Validates task assignments
- `taskSharingSchema` - Validates task sharing permissions
- `taskStatusSchema` - Task status enum
- `taskPrioritySchema` - Task priority enum
- `recurringPatternSchema` - Validates recurring task patterns

### Category Schemas (`schemas/category.js`)
- `categoryCreateSchema` - Validates category creation
- `categoryUpdateSchema` - Validates category updates

### Notification Schemas (`schemas/notification.js`)
- `notificationCreateSchema` - Validates notification creation
- `notificationTypeSchema` - Notification type enum

## Example Usage

### Frontend Form Validation
```javascript
import { taskCreateSchema } from './shared/schemas/task.js';

const handleSubmit = (formData) => {
  try {
    const validatedData = taskCreateSchema.parse(formData);
    // Submit to API
  } catch (error) {
    // Handle validation errors
    console.error(error.errors);
  }
};
```

### Backend API Validation
```javascript
import { taskCreateSchema } from './shared/schemas/task.js';

app.post('/api/tasks', (req, res) => {
  try {
    const validatedData = taskCreateSchema.parse(req.body);
    // Process validated data
  } catch (error) {
    res.status(400).json({ errors: error.errors });
  }
});
```

## Testing

Run the schema validation tests:
```bash
cd shared
node test-schemas.js
```

## Schema Features

- **Consistent Validation**: Same validation rules across frontend and backend
- **Type Safety**: Zod provides runtime type checking
- **Error Messages**: User-friendly validation error messages
- **Flexible**: Support for optional fields and complex validation rules
- **Extensible**: Easy to add new schemas or modify existing ones