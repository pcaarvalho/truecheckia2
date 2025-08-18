import { Request, Response } from 'express'
import { ERROR_CODES } from '@truecheckia/config'
import type { ApiResponse } from '@truecheckia/types'

export const notFoundHandler = (req: Request, res: Response<ApiResponse>) => {
  res.status(404).json({
    success: false,
    error: {
      code: ERROR_CODES.NOT_FOUND,
      message: `Route ${req.method} ${req.path} not found`,
    },
  })
}