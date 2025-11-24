export enum ErrorType {
  VALIDATION = "VALIDATION",
  DATABASE = "DATABASE",
  AUTHENTICATION = "AUTHENTICATION",
  AUTHORIZATION = "AUTHORIZATION",
  SERVER = "SERVER",
  EXTERNAL_SERVICE = "EXTERNAL_SERVICE",
  UNKNOWN = "UNKNOWN",
}

interface ErrorDetails {
  [key: string]: any
}

export interface AppError extends Error {
  type: ErrorType
  details?: ErrorDetails
  timestamp: string
}

export function createError(message: string, type: ErrorType = ErrorType.UNKNOWN, details?: ErrorDetails): AppError {
  const error = new Error(message) as AppError
  error.type = type
  error.details = details
  error.timestamp = new Date().toISOString()
  return error
}

export function logError(error: unknown, context?: Record<string, any>) {
  const appError = error as AppError

  console.error({
    message: appError.message || "An unknown error occurred",
    type: appError.type || ErrorType.UNKNOWN,
    details: appError.details,
    timestamp: appError.timestamp || new Date().toISOString(),
    stack: appError.stack,
    context,
  })

  // In a production app, you might want to send this to a logging service
}

export function formatErrorForClient(error: unknown): { message: string; type: string } {
  const appError = error as AppError

  // Don't expose internal details to the client
  return {
    message: appError.message || "An unexpected error occurred",
    type: appError.type || ErrorType.UNKNOWN,
  }
}

