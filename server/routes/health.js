const express = require('express');
const mongoose = require('mongoose');
const router = express.Router();

/**
 * GET /api/health
 * Health check endpoint — useful for monitoring and deployment
 */
router.get('/', (req, res) => {
  const dbState = {
    0: 'disconnected',
    1: 'connected',
    2: 'connecting',
    3: 'disconnecting',
  };

  res.status(200).json({
    success: true,
    message: 'PharmaClinic API is running',
    environment: process.env.NODE_ENV,
    timestamp: new Date().toISOString(),
    uptime: `${Math.floor(process.uptime())}s`,
    database: {
      status: dbState[mongoose.connection.readyState] || 'unknown',
      name: mongoose.connection.name || 'N/A',
    },
    version: '1.0.0',
  });
});

module.exports = router;
