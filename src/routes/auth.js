const express = require('express');
const { authenticateApiKey } = require('../utils/auth');

const router = express.Router();

/**
 * @route GET /api/auth/verify
 * @desc Verify if API key is valid
 * @access Private
 */
router.get('/verify', authenticateApiKey, async (req, res) => {
  try {
    // If middleware passed, the API key is valid
    res.json({
      success: true,
      message: 'API key is valid',
      data: {
        sessionId: req.session.id,
        name: req.session.name,
        phoneNumber: req.session.phoneNumber
      }
    });
  } catch (error) {
    console.error('Error verifying API key:', error);
    res.status(500).json({
      success: false,
      message: 'Error verifying API key',
      error: error.message
    });
  }
});

module.exports = router;