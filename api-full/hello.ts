import type { VercelRequest, VercelResponse } from '@vercel/node';

export default function handler(req: VercelRequest, res: VercelResponse) {
  try {
    // Extract name from query parameters, default to "World"
    const name = req.query.name as string || 'World';
    
    // Determine environment
    const environment = process.env.NODE_ENV === 'production' ? 'production' : 'development';
    
    // Create response data
    const responseData = {
      success: true,
      data: {
        message: `Hello, ${name}!`,
        timestamp: new Date().toISOString(),
        environment,
        endpoint: '/api/hello'
      }
    };
    
    // Set CORS headers for browser compatibility
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    // Handle preflight OPTIONS request
    if (req.method === 'OPTIONS') {
      res.status(200).end();
      return;
    }
    
    // Return success response
    res.status(200).json(responseData);
    
  } catch (error) {
    console.error('Error in hello endpoint:', error);
    
    // Return error response
    res.status(500).json({
      success: false,
      error: {
        message: 'Internal server error',
        timestamp: new Date().toISOString(),
        endpoint: '/api/hello'
      }
    });
  }
}