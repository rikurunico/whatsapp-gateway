const express = require('express');
const { sendMessage } = require('../services/whatsappService');
const { authenticateApiKey } = require('../utils/auth');

const router = express.Router();

/**
 * @route POST /api/messages/send
 * @desc Send a WhatsApp message
 * @access Private
 */
router.post('/send', authenticateApiKey, async (req, res) => {
  try {
    const { to, type = 'text', text, url, caption } = req.body;
    const sessionId = req.session.id;
    
    // Validate recipient
    if (!to) {
      return res.status(400).json({
        success: false,
        message: 'Recipient phone number is required'
      });
    }
    
    // Format phone number (remove '+' if present)
    const recipient = to.startsWith('+') ? to.substring(1) : to;
    
    // Prepare content based on message type
    let content = {};
    switch (type) {
      case 'text':
        if (!text) {
          return res.status(400).json({
            success: false,
            message: 'Message text is required for text messages'
          });
        }
        content = { text };
        break;
        
      case 'image':
      case 'video':
      case 'document':
      case 'audio':
        if (!url) {
          return res.status(400).json({
            success: false,
            message: 'URL is required for media messages'
          });
        }
        content = { url, caption };
        break;
        
      default:
        return res.status(400).json({
          success: false,
          message: `Unsupported message type: ${type}`
        });
    }
    
    // Send the message
    const result = await sendMessage(sessionId, recipient, type, content);
    
    if (!result.success) {
      return res.status(400).json({
        success: false,
        message: 'Failed to send message',
        error: result.error
      });
    }
    
    res.json({
      success: true,
      message: 'Message sent successfully',
      data: {
        messageId: result.messageId
      }
    });
  } catch (error) {
    console.error('Error sending message:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to send message',
      error: error.message
    });
  }
});

/**
 * @route GET /api/messages
 * @desc Get message history
 * @access Private
 */
router.get('/', authenticateApiKey, async (req, res) => {
  try {
    const { prisma } = require('../index');
    const sessionId = req.session.id;
    const { 
      limit = 20, 
      offset = 0, 
      direction,
      status,
      recipient,
      sender
    } = req.query;
    
    // Build where clause
    const where = { sessionId };
    
    if (direction) where.direction = direction;
    if (status) where.status = status;
    if (recipient) where.recipient = recipient;
    if (sender) where.sender = sender;
    
    // Get messages
    const messages = await prisma.message.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: parseInt(limit),
      skip: parseInt(offset)
    });
    
    // Get total count
    const count = await prisma.message.count({ where });
    
    res.json({
      success: true,
      data: {
        messages,
        pagination: {
          total: count,
          limit: parseInt(limit),
          offset: parseInt(offset)
        }
      }
    });
  } catch (error) {
    console.error('Error getting messages:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get messages',
      error: error.message
    });
  }
});

/**
 * @route GET /api/messages/:messageId
 * @desc Get a specific message
 * @access Private
 */
router.get('/:messageId', authenticateApiKey, async (req, res) => {
  try {
    const { messageId } = req.params;
    const sessionId = req.session.id;
    const { prisma } = require('../index');
    
    // Get the message
    const message = await prisma.message.findFirst({
      where: {
        id: messageId,
        sessionId
      }
    });
    
    if (!message) {
      return res.status(404).json({
        success: false,
        message: 'Message not found'
      });
    }
    
    res.json({
      success: true,
      data: message
    });
  } catch (error) {
    console.error('Error getting message:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get message',
      error: error.message
    });
  }
});

module.exports = router;