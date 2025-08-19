// @ts-nocheck
import { Express } from 'express'
import swaggerJsdoc from 'swagger-jsdoc'
import swaggerUi from 'swagger-ui-express'
import { config } from '@truecheckia/config'

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'TrueCheckIA API',
      version: '1.0.0',
      description: 'API for AI content detection platform',
      contact: {
        name: 'TrueCheckIA Support',
        email: 'support@truecheckia.com',
      },
    },
    servers: [
      {
        url: config.api.url,
        description: 'Development server',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
        apiKey: {
          type: 'apiKey',
          in: 'header',
          name: 'x-api-key',
        },
      },
    },
    security: [
      {
        bearerAuth: [],
      },
    ],
  },
  apis: ['./src/routes/**/*.ts'],
}

export const setupSwagger = (app: Express) => {
  const specs = swaggerJsdoc(options)
  
  app.use(
    '/api-docs',
    swaggerUi.serve,
    swaggerUi.setup(specs, {
      customCss: '.swagger-ui .topbar { display: none }',
      customSiteTitle: 'TrueCheckIA API Docs',
    })
  )
}