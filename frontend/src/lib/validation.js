import {
  userRegistrationSchema,
  userLoginSchema,
  userProfileUpdateSchema,
  passwordChangeSchema
} from 'shared/schemas/user.js'

import {
  taskStatusSchema,
  taskPrioritySchema,
  taskPermissionSchema,
  recurringTypeSchema,
  recurringPatternSchema,
  taskCreateSchema,
  taskUpdateSchema,
  taskStatusUpdateSchema,
  taskAssignmentSchema,
  taskSharingSchema
} from 'shared/schemas/task.js'

import {
  categoryCreateSchema,
  categoryUpdateSchema
} from 'shared/schemas/category.js'

import {
  notificationTypeSchema,
  notificationCreateSchema
} from 'shared/schemas/notification.js'

export const validateData = (schema, data) => {
  try {
    const validatedData = schema.parse(data)
    return { success: true, data: validatedData, errors: [] }
  } catch (error) {
    if (error.errors) {
      const formattedErrors = error.errors.map(err => ({
        field: err.path.join('.'),
        message: err.message,
        code: err.code
      }))
      return { success: false, data: null, errors: formattedErrors }
    }
    return { 
      success: false, 
      data: null, 
      errors: [{ field: 'general', message: error.message }] 
    }
  }
}

export const validateForm = (schema, formData) => {
  const result = validateData(schema, formData)
  
  if (result.success) {
    return { isValid: true, data: result.data, fieldErrors: {} }
  }
  
  const fieldErrors = {}
  result.errors.forEach(error => {
    fieldErrors[error.field] = error.message
  })
  
  return { isValid: false, data: null, fieldErrors }
}

export const validateField = (schema, fieldName, value) => {
  try {
    const fieldSchema = schema.pick({ [fieldName]: true })
    fieldSchema.parse({ [fieldName]: value })
    return { isValid: true, error: null }
  } catch (error) {
    const fieldError = error.errors?.[0]
    return { 
      isValid: false, 
      error: fieldError?.message || 'Invalid value' 
    }
  }
}

export {
  userRegistrationSchema,
  userLoginSchema,
  userProfileUpdateSchema,
  passwordChangeSchema,
  
  taskStatusSchema,
  taskPrioritySchema,
  taskPermissionSchema,
  recurringTypeSchema,
  recurringPatternSchema,
  taskCreateSchema,
  taskUpdateSchema,
  taskStatusUpdateSchema,
  taskAssignmentSchema,
  taskSharingSchema,
  
  categoryCreateSchema,
  categoryUpdateSchema,
  
  notificationTypeSchema,
  notificationCreateSchema
}

export const taskValidation = {
  validateCreate: (data) => validateForm(taskCreateSchema, data),
  validateUpdate: (data) => validateForm(taskUpdateSchema, data),
  validateStatus: (status) => validateData(taskStatusSchema, status),
  validatePriority: (priority) => validateData(taskPrioritySchema, priority),
  validateAssignment: (data) => validateForm(taskAssignmentSchema, data),
  validateSharing: (data) => validateForm(taskSharingSchema, data)
}

export const userValidation = {
  validateRegistration: (data) => validateForm(userRegistrationSchema, data),
  validateLogin: (data) => validateForm(userLoginSchema, data),
  validateProfileUpdate: (data) => validateForm(userProfileUpdateSchema, data),
  validatePasswordChange: (data) => validateForm(passwordChangeSchema, data)
}

export const categoryValidation = {
  validateCreate: (data) => validateForm(categoryCreateSchema, data),
  validateUpdate: (data) => validateForm(categoryUpdateSchema, data)
}

export const notificationValidation = {
  validateCreate: (data) => validateForm(notificationCreateSchema, data),
  validateType: (type) => validateData(notificationTypeSchema, type)
}