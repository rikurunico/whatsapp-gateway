require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const swaggerUi = require('swagger-ui-express');
const YAML = require('yamljs');
const { PrismaClient } = require('@prisma/client');
const { initializeWhatsAppSessions } = require('./services/whatsappService');

// Initialize services
const prisma = new PrismaClient();
const app = express();
const PORT = process.env.PORT || 3000;

// Create sessions directory if it doesn't exist
const sessionFolder = process.env.SESSION_FOLDER || './sessions';
if (!fs.existsSync(sessionFolder)){
    fs.mkdirSync(sessionFolder, { recursive: true });
}

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, '../public')));

// API Documentation setup
try {
    const swaggerDocument = YAML.load(path.join(__dirname, '../api-docs.yaml'));
    app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));
} catch (error) {
    console.error('Error loading Swagger documentation:', error);
}

// Import route handlers
const authRoutes = require('./routes/auth');
const messageRoutes = require('./routes/messages');
const sessionRoutes = require('./routes/sessions');
const webhookRoutes = require('./routes/webhooks');

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/sessions', sessionRoutes);
app.use('/api/webhooks', webhookRoutes);

// Root route
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../public/index.html'));
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(err.statusCode || 500).json({
        status: 'error',
        message: err.message || 'Internal Server Error',
    });
});

// Start server
const server = app.listen(PORT, async () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`📚 API Documentation: http://localhost:${PORT}/api-docs`);
    
    try {
        // Connect to database
        await prisma.$connect();
        console.log('🗃️ Connected to database');
        
        // Initialize WhatsApp sessions
        await initializeWhatsAppSessions(prisma);
        console.log('📱 WhatsApp sessions initialized');
    } catch (error) {
        console.error('❌ Error during startup:', error);
    }
});

// Handle graceful shutdown
process.on('SIGTERM', async () => {
    console.log('SIGTERM received, shutting down gracefully');
    await prisma.$disconnect();
    server.close(() => {
        console.log('Process terminated');
    });
});

module.exports = { app, prisma };