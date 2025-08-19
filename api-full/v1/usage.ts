import type { VercelRequest, VercelResponse } from '@vercel/node'
import { createVercelHandler } from '../_utils/vercel-adapter'
import { apiController } from '../../apps/api/src/controllers/api.controller'

const handler = createVercelHandler(
  apiController.getUsage
)

export default handler