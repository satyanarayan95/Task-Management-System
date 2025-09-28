import React from 'react'
import { toast } from './toast'

export const ErrorTypes = {
  VALIDATION: 'validation',
  NETWORK: 'network',
  AUTH: 'auth',
  SERVER: 'server',
  UNKNOWN: 'unknown'
}

export const ErrorSeverity = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
  CRITICAL: 'critical'
}

export class ErrorHandler {
  static handle(error, context = {}) {
    const errorInfo = this.parseError(error)
    
    console.error('Error occurred:', {
      ...errorInfo,
      context,
      timestamp: new Date().toISOString()
    })

    this.showUserMessage(errorInfo, context)



    return errorInfo
  }

  static parseError(error) {
    if (error.response) {
      return {
        type: this.getErrorType(error.response.status),
        severity: this.getErrorSeverity(error.response.status),
        message: error.response.data?.message || 'Server error occurred',
        status: error.response.status,
        details: error.response.data?.errors || [],
        originalError: error
      }
    }

    if (error.request) {
      return {
        type: ErrorTypes.NETWORK,
        severity: ErrorSeverity.HIGH,
        message: 'Network error. Please check your connection.',
        status: 0,
        details: [],
        originalError: error
      }
    }

    if (error.name === 'ZodError' || error.errors) {
      return {
        type: ErrorTypes.VALIDATION,
        severity: ErrorSeverity.MEDIUM,
        message: 'Validation failed',
        status: 400,
        details: error.errors || [],
        originalError: error
      }
    }

    return {
      type: ErrorTypes.UNKNOWN,
      severity: ErrorSeverity.MEDIUM,
      message: error.message || 'An unexpected error occurred',
      status: 0,
      details: [],
      originalError: error
    }
  }

  static getErrorType(status) {
    if (status === 401 || status === 403) return ErrorTypes.AUTH
    if (status >= 400 && status < 500) return ErrorTypes.VALIDATION
    if (status >= 500) return ErrorTypes.SERVER
    return ErrorTypes.UNKNOWN
  }

  static getErrorSeverity(status) {
    if (status >= 500) return ErrorSeverity.CRITICAL
    if (status === 401 || status === 403) return ErrorSeverity.HIGH
    if (status >= 400) return ErrorSeverity.MEDIUM
    return ErrorSeverity.LOW
  }

  static showUserMessage(errorInfo, context) {
    const { type, severity, message, details } = errorInfo

    if (type === ErrorTypes.VALIDATION && context.silent) {
      return
    }

    switch (severity) {
      case ErrorSeverity.CRITICAL:
        toast.error(`Critical Error: ${message}`, { duration: 8000 })
        break
      case ErrorSeverity.HIGH:
        toast.error(message, { duration: 6000 })
        break
      case ErrorSeverity.MEDIUM:
        toast.warning(message, { duration: 4000 })
        break
      case ErrorSeverity.LOW:
        toast.info(message, { duration: 3000 })
        break
      default:
        toast.error(message)
    }

    if (details.length > 0 && type === ErrorTypes.VALIDATION) {
      details.slice(0, 3).forEach(detail => {
        const fieldName = detail.field.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())
        toast.error(`${fieldName}: ${detail.message}`, { duration: 4000 })
      })
    }
  }



  static handleApiError(error, context = {}) {
    return this.handle(error, { ...context, source: 'api' })
  }

  static handleValidationError(error, context = {}) {
    return this.handle(error, { ...context, source: 'validation' })
  }

  static handleFormError(error, setFieldErrors, context = {}) {
    const errorInfo = this.handle(error, { ...context, source: 'form', silent: true })
    
    if (errorInfo.type === ErrorTypes.VALIDATION && errorInfo.details.length > 0) {
      const fieldErrors = {}
      errorInfo.details.forEach(detail => {
        fieldErrors[detail.field] = detail.message
      })
      setFieldErrors(fieldErrors)
    }

    return errorInfo
  }
}

export const handleError = (error, context) => ErrorHandler.handle(error, context)
export const handleApiError = (error, context) => ErrorHandler.handleApiError(error, context)
export const handleValidationError = (error, context) => ErrorHandler.handleValidationError(error, context)
export const handleFormError = (error, setFieldErrors, context) => 
  ErrorHandler.handleFormError(error, setFieldErrors, context)

export const withErrorBoundary = (Component, fallback) => {
  return class ErrorBoundary extends React.Component {
    constructor(props) {
      super(props)
      this.state = { hasError: false, error: null }
    }

    static getDerivedStateFromError(error) {
      return { hasError: true, error }
    }

    componentDidCatch(error, errorInfo) {
      ErrorHandler.handle(error, { 
        source: 'component',
        componentStack: errorInfo.componentStack
      })
    }

    render() {
      if (this.state.hasError) {
        return fallback ? fallback(this.state.error) : (
          <div className="p-4 text-center">
            <h2 className="text-lg font-semibold text-destructive mb-2">
              Something went wrong
            </h2>
            <p className="text-muted-foreground">
              Please refresh the page or try again later.
            </p>
          </div>
        )
      }

      return <Component {...this.props} />
    }
  }
}

export default ErrorHandler