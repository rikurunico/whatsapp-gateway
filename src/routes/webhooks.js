const express = require('express');
const { authenticateApiKey } = require('../utils/auth');

const router = express.Router();

/**
 * @route POST /api/webhooks/config
 * @desc Configure webhook URL for a session
 * @access Private
 */
router.post('/config', authenticateApiKey, async (req, res) => {
  try {
    const { webhookUrl } = req.body;
    const sessionId = req.session.id;
    
    if (!webhookUrl) {
      return res.status(400).json({
        success: false,
        message: 'Webhook URL is required'
      });
    }
    
    // Validate URL format
    try {
      new URL(webhookUrl);
    } catch (error) {
      return res.status(400).json({
        success: false,
        message: 'Invalid webhook URL format'
      });
    }
    
    // Update session with webhook URL
    const { prisma } = require('../index');
    await prisma.session.update({
      where: { id: sessionId },
      data: { webhookUrl }
    });
    
    res.json({
      success: true,
      message: 'Webhook configured successfully'
    });
  } catch (error) {
    console.error('Error configuring webhook:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to configure webhook',
      error: error.message
    });
  }
});

/**
 * @route GET /api/webhooks/config
 * @desc Get webhook configuration for a session
 * @access Private
 */
router.get('/config', authenticateApiKey, async (req, res) => {
  try {
    const sessionId = req.session.id;
    
    // Get session with webhook URL
    const { prisma } = require('../index');
    const session = await prisma.session.findUnique({
      where: { id: sessionId },
      select: { webhookUrl: true }
    });
    
    res.json({
      success: true,
      data: {
        webhookUrl: session.webhookUrl || null
      }
    });
  } catch (error) {
    console.error('Error getting webhook config:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get webhook config',
      error: error.message
    });
  }
});

/**
 * @route DELETE /api/webhooks/config
 * @desc Remove webhook configuration for a session
 * @access Private
 */
router.delete('/config', authenticateApiKey, async (req, res) => {
  try {
    const sessionId = req.session.id;
    
    // Remove webhook URL from session
    const { prisma } = require('../index');
    await prisma.session.update({
      where: { id: sessionId },
      data: { webhookUrl: null }
    });
    
    res.json({
      success: true,
      message: 'Webhook removed successfully'
    });
  } catch (error) {
    console.error('Error removing webhook:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to remove webhook',
      error: error.message
    });
  }
});

/**
 * @route POST /api/webhooks/test
 * @desc Test webhook configuration by sending a test payload
 * @access Private
 */
router.post('/test', authenticateApiKey, async (req, res) => {
  try {
    const sessionId = req.session.id;
    
    // Get session with webhook URL
    const { prisma } = require('../index');
    const session = await prisma.session.findUnique({
      where: { id: sessionId }
    });
    
    if (!session.webhookUrl) {
      return res.status(400).json({
        success: false,
        message: 'No webhook URL configured for this session'
      });
    }
    
    // Prepare test payload
    const testPayload = {
      event: 'test',
      sessionId,
      timestamp: new Date().toISOString(),
      message: 'This is a test webhook message'
    };
    
    // Send test payload to webhook URL
    const response = await fetch(session.webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': req.apiKey,
        'X-Webhook-Test': 'true'
      },
      body: JSON.stringify(testPayload)
    });
    
    if (!response.ok) {
      return res.status(400).json({
        success: false,
        message: `Webhook test failed: ${response.status} ${response.statusText}`
      });
    }
    
    res.json({
      success: true,
      message: 'Webhook test successful',
      data: {
        statusCode: response.status,
        response: await response.text()
      }
    });
  } catch (error) {
    console.error('Error testing webhook:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to test webhook',
      error: error.message
    });
  }
});

module.exports = router;