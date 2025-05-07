/**
 * Authentication utilities for API key validation
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/**
 * Middleware to authenticate API key from request header
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
const authenticateApiKey = async (req, res, next) => {
  try {
    // Get API key from header
    const apiKey = req.header('X-API-Key');
    
    if (!apiKey) {
      return res.status(401).json({
        success: false,
        message: 'API Key is required',
      });
    }
    
    // Find session with this API key
    const session = await prisma.session.findUnique({
      where: {
        apiKey,
        isActive: true,
      },
    });
    
    if (!session) {
      return res.status(401).json({
        success: false,
        message: 'Invalid or inactive API key',
      });
    }
    
    // Attach session and API key to request object
    req.session = session;
    req.apiKey = apiKey;
    
    next();
  } catch (error) {
    console.error('Authentication error:', error);
    res.status(500).json({
      success: false,
      message: 'Authentication error',
    });
  }
};

module.exports = {
  authenticateApiKey,
};