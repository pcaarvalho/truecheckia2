import type { VercelRequest, VercelResponse } from '@vercel/node'
import { z, ZodSchema } from 'zod'
import { AppError, ExtendedVercelRequest } from '../_utils/vercel-adapter'
import { ERROR_CODES } from '@truecheckia/config'

export function validateRequestMiddleware(schema: ZodSchema) {
  return (req: ExtendedVercelRequest, res: VercelResponse, next: () => void) => {
    try {
      const result = schema.safeParse(req.body)
      
      if (!result.success) {
        throw new AppError('Validation error', 400, ERROR_CODES.VALIDATION_ERROR, result.error.errors)
      }
      
      // Replace req.body with validated data
      req.body = result.data
      
      next()
    } catch (error) {
      throw error
    }
  }
}

export function validateQueryMiddleware(schema: ZodSchema) {
  return (req: ExtendedVercelRequest, res: VercelResponse, next: () => void) => {
    try {
      const result = schema.safeParse(req.query)
      
      if (!result.success) {
        throw new AppError('Query validation error', 400, ERROR_CODES.VALIDATION_ERROR, result.error.errors)
      }
      
      // Replace req.query with validated data
      req.query = result.data
      
      next()
    } catch (error) {
      throw error
    }
  }
}

export function validateParamsMiddleware(schema: ZodSchema) {
  return (req: ExtendedVercelRequest, res: VercelResponse, next: () => void) => {
    try {
      const result = schema.safeParse(req.query) // Vercel uses query for path params
      
      if (!result.success) {
        throw new AppError('Parameter validation error', 400, ERROR_CODES.VALIDATION_ERROR, result.error.errors)
      }
      
      next()
    } catch (error) {
      throw error
    }
  }
}