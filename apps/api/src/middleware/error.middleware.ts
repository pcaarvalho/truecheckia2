import { Request, Response, NextFunction } from 'express'
import { ZodError } from 'zod'
import { config, ERROR_CODES } from '@truecheckia/config'
import type { ApiResponse } from '@truecheckia/types'

export class AppError extends Error {
  public readonly statusCode: number
  public readonly code: string
  public readonly details?: any

  constructor(message: string, statusCode: number, code: string, details?: any) {
    super(message)
    this.statusCode = statusCode
    this.code = code
    this.details = details
    Error.captureStackTrace(this, this.constructor)
  }
}

export const errorHandler = (
  err: Error | AppError | ZodError,
  req: Request,
  res: Response<ApiResponse>,
  next: NextFunction
) => {
  let statusCode = 500
  let code = ERROR_CODES.INTERNAL_ERROR
  let message = 'Internal server error'
  let details = undefined

  // Handle Zod validation errors
  if (err instanceof ZodError) {
    statusCode = 400
    code = ERROR_CODES.VALIDATION_ERROR
    message = 'Validation error'
    details = err.errors.map(e => ({
      field: e.path.join('.'),
      message: e.message,
    }))
  }
  // Handle custom app errors
  else if (err instanceof AppError) {
    statusCode = err.statusCode
    code = err.code
    message = err.message
    details = err.details
  }
  // Handle JWT errors
  else if (err.name === 'JsonWebTokenError') {
    statusCode = 401
    code = ERROR_CODES.UNAUTHORIZED
    message = 'Invalid token'
  }
  else if (err.name === 'TokenExpiredError') {
    statusCode = 401
    code = ERROR_CODES.TOKEN_EXPIRED
    message = 'Token expired'
  }
  // Handle Prisma errors
  else if (err.message.includes('P2002')) {
    statusCode = 409
    code = ERROR_CODES.EMAIL_EXISTS
    message = 'This email is already registered. Please try logging in instead.'
  }
  // Handle other database errors
  else if (err.message.includes('P2025')) {
    statusCode = 404
    code = ERROR_CODES.NOT_FOUND
    message = 'Resource not found'
  }
  // Handle network/connection errors
  else if (err.message.includes('ECONNREFUSED') || err.message.includes('ENOTFOUND')) {
    statusCode = 503
    code = ERROR_CODES.SERVICE_UNAVAILABLE
    message = 'Service temporarily unavailable. Please try again later.'
  }

  // Log error in development
  if (config.isDev) {
    console.error('Error:', err)
  }

  // Send error response
  res.status(statusCode).json({
    success: false,
    error: {
      code,
      message,
      details,
    },
  })
}