const express = require('express');
const { createSession, getSessionStatus } = require('../services/whatsappService');
const { authenticateApiKey } = require('../utils/auth');

const router = express.Router();

/**
 * @route POST /api/sessions
 * @desc Create a new WhatsApp session and generate QR code
 * @access Public
 */
router.post('/', async (req, res) => {
  try {
    // Optional name for the session
    const { name } = req.body;
    
    // Create a new session with QR code
    const session = await createSession(name);
    
    res.status(201).json({
      success: true,
      message: 'Session created successfully',
      data: {
        sessionId: session.sessionId,
        apiKey: session.apiKey, // Return the API key only once
        qrCode: session.qrCode,
        name: session.name
      }
    });
  } catch (error) {
    console.error('Error creating session:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create session',
      error: error.message
    });
  }
});

/**
 * @route GET /api/sessions/status/:sessionId
 * @desc Get the status of a WhatsApp session
 * @access Private
 */
router.get('/status/:sessionId', authenticateApiKey, async (req, res) => {
  try {
    const { sessionId } = req.params;
    
    // Make sure the session belongs to the API key
    if (req.session.id !== sessionId) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to access this session'
      });
    }
    
    // Get the session status
    const status = await getSessionStatus(sessionId);
    
    res.json({
      success: true,
      data: status
    });
  } catch (error) {
    console.error('Error getting session status:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get session status',
      error: error.message
    });
  }
});

/**
 * @route GET /api/sessions/qr/:sessionId
 * @desc Regenerate the QR code for an existing session
 * @access Private
 */
router.get('/qr/:sessionId', authenticateApiKey, async (req, res) => {
  try {
    const { sessionId } = req.params;
    
    // Make sure the session belongs to the API key
    if (req.session.id !== sessionId) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to access this session'
      });
    }
    
    // Create a new session with the same ID (will regenerate QR code)
    const { prisma } = require('../index');
    
    // Get the current session
    const existingSession = await prisma.session.findUnique({
      where: { id: sessionId }
    });
    
    if (!existingSession) {
      return res.status(404).json({
        success: false,
        message: 'Session not found'
      });
    }
    
    // Create a new session with the same data
    const session = await createSession(existingSession.name);
    
    res.json({
      success: true,
      data: {
        sessionId: session.sessionId,
        qrCode: session.qrCode
      }
    });
  } catch (error) {
    console.error('Error regenerating QR code:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to regenerate QR code',
      error: error.message
    });
  }
});

/**
 * @route DELETE /api/sessions/:sessionId
 * @desc Delete a WhatsApp session
 * @access Private
 */
router.delete('/:sessionId', authenticateApiKey, async (req, res) => {
  try {
    const { sessionId } = req.params;
    
    // Make sure the session belongs to the API key
    if (req.session.id !== sessionId) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to access this session'
      });
    }
    
    const { prisma } = require('../index');
    
    // Deactivate the session in the database
    await prisma.session.update({
      where: { id: sessionId },
      data: { isActive: false }
    });
    
    res.json({
      success: true,
      message: 'Session deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting session:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete session',
      error: error.message
    });
  }
});

/**
 * @route GET /api/sessions
 * @desc Get all sessions for the authenticated user
 * @access Private
 */
router.get('/', authenticateApiKey, async (req, res) => {
  try {
    const { prisma } = require('../index');
    
    // Get all sessions for this API key
    const sessions = await prisma.session.findMany({
      where: { 
        apiKey: req.apiKey,
        isActive: true
      },
      select: {
        id: true,
        name: true,
        phoneNumber: true,
        isActive: true,
        webhookUrl: true,
        createdAt: true,
        updatedAt: true,
        // Explicitly exclude apiKey for security
      }
    });
    
    res.json({
      success: true,
      data: sessions
    });
  } catch (error) {
    console.error('Error getting sessions:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get sessions',
      error: error.message
    });
  }
});

module.exports = router;