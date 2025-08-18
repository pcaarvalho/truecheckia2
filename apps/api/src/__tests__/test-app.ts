import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import compression from 'compression'
import 'express-async-errors'

import { authRoutes } from '../routes/auth.routes'
import { errorHandler } from '../middleware/error.middleware'
import { notFoundHandler } from '../middleware/notFound.middleware'

const app = express()

// Basic middleware
app.use(helmet())
app.use(cors())
app.use(compression())
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true }))

// Routes
app.use('/api/auth', authRoutes)

// Error handling
app.use(notFoundHandler)
app.use(errorHandler)

export { app }