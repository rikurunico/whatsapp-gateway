const { default: makeWASocket, 
  DisconnectReason,
  useMultiFileAuthState,
  makeInMemoryStore,
  fetchLatestBaileysVersion,
  makeCacheableSignalKeyStore,
  isJidBroadcast
} = require('@whiskeysockets/baileys');
const pino = require('pino');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const { v4: uuidv4 } = require('uuid');

// Initialize logger
const logger = pino({ level: 'silent' });

// In-memory store for active sessions
const activeSessions = {};

// Generate a unique API key
const generateApiKey = () => {
  return crypto
    .createHmac('sha256', process.env.API_KEY_SECRET || 'whatsapp-gateway')
    .update(uuidv4())
    .digest('hex');
};

/**
 * Initialize WhatsApp client for a specific session
 * @param {string} sessionId - The session ID
 * @param {string} apiKey - API key for this session
 * @param {string} sessionFolder - Path to store session files
 * @param {function} messageHandler - Callback for handling incoming messages
 * @param {function} connectionHandler - Callback for handling connection events
 * @returns {Object} - WhatsApp client instance
 */
async function initWhatsAppClient(
  sessionId, 
  apiKey,
  sessionFolder = process.env.SESSION_FOLDER || './sessions',
  messageHandler,
  connectionHandler
) {
  // Create session directory if it doesn't exist
  const sessionPath = path.join(sessionFolder, sessionId);
  fs.mkdirSync(sessionPath, { recursive: true });

  // Use authenticated state
  const { state, saveCreds } = await useMultiFileAuthState(sessionPath);
  
  // Fetch latest version of WA Web
  const { version, isLatest } = await fetchLatestBaileysVersion();
  console.log(`Using WA v${version.join('.')} (latest: ${isLatest})`);

  // Store for messages
  const store = makeInMemoryStore({ logger });
  store.readFromFile(path.join(sessionPath, 'store.json'));
  
  // Save store every 10s
  setInterval(() => {
    store.writeToFile(path.join(sessionPath, 'store.json'));
  }, 10000);

  // Create socket connection
  const sock = makeWASocket({
    version,
    logger,
    printQRInTerminal: false, // We'll handle QR elsewhere
    auth: {
      creds: state.creds,
      keys: makeCacheableSignalKeyStore(state.keys, logger),
    },
    browser: ['WhatsApp Gateway', 'Chrome', '103.0.5060.114'],
    getMessage: async (key) => {
      if (store) {
        const msg = await store.loadMessage(key.remoteJid, key.id);
        return msg?.message || undefined;
      }
      return { conversation: 'Failed to load message' };
    }
  });

  // Bind events to store
  store.bind(sock.ev);

  // Handle connection events
  sock.ev.on('connection.update', async (update) => {
    const { connection, lastDisconnect, qr } = update;
    
    if (connection === 'close') {
      const shouldReconnect = 
        lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;
      
      console.log(`Connection closed due to ${lastDisconnect?.error}, reconnect: ${shouldReconnect}`);
      
      if (shouldReconnect) {
        activeSessions[sessionId] = await initWhatsAppClient(
          sessionId, 
          apiKey, 
          sessionFolder,
          messageHandler,
          connectionHandler
        );
      } else {
        // Remove session if logged out
        delete activeSessions[sessionId];
        connectionHandler({
          sessionId,
          apiKey,
          status: 'logged_out',
          qr: null,
          phoneNumber: null
        });
      }
    } else if (connection === 'open') {
      console.log(`Connection opened for session ${sessionId}`);
      
      // Get connected phone number
      const phoneNumber = sock.user?.id.split(':')[0];
      
      // Handle successful connection
      connectionHandler({
        sessionId,
        apiKey,
        status: 'connected',
        qr: null,
        phoneNumber
      });
    }
    
    // Handle QR code updates
    if (qr) {
      connectionHandler({
        sessionId,
        apiKey,
        status: 'require_qr_scan',
        qr,
        phoneNumber: null
      });
    }
  });

  // Handle credential updates
  sock.ev.on('creds.update', saveCreds);

  // Handle incoming messages
  sock.ev.on('messages.upsert', async ({ messages }) => {
    for (const message of messages) {
      // Skip messages from broadcast lists
      if (isJidBroadcast(message.key.remoteJid)) continue;
      
      // Skip status messages
      if (message.key.remoteJid === 'status@broadcast') continue;
      
      // Skip messages sent by us
      if (message.key.fromMe) continue;
      
      // Handle the message with the provided callback
      if (messageHandler) {
        messageHandler({
          sessionId,
          apiKey,
          message
        });
      }
    }
  });

  // Return the socket and some utility methods
  return {
    sock,
    sessionId,
    apiKey,
    async sendTextMessage(to, text) {
      try {
        const recipient = to.includes('@') ? to : `${to}@s.whatsapp.net`;
        const result = await sock.sendMessage(recipient, { text });
        return { success: true, messageId: result.key.id, result };
      } catch (error) {
        console.error(`Error sending text message: ${error}`);
        return { success: false, error: error.message };
      }
    },
    async sendMediaMessage(to, url, type, caption) {
      try {
        const recipient = to.includes('@') ? to : `${to}@s.whatsapp.net`;
        
        const messageContent = {};
        
        switch (type) {
          case 'image':
            messageContent.image = { url };
            if (caption) messageContent.caption = caption;
            break;
          case 'video':
            messageContent.video = { url };
            if (caption) messageContent.caption = caption;
            break;
          case 'audio':
            messageContent.audio = { url };
            // Audio doesn't support caption
            break;
          case 'document':
            messageContent.document = { url };
            if (caption) messageContent.caption = caption;
            break;
          default:
            return { success: false, error: 'Invalid media type' };
        }

        const result = await sock.sendMessage(recipient, messageContent);
        return { success: true, messageId: result.key.id, result };
      } catch (error) {
        console.error(`Error sending media message: ${error}`);
        return { success: false, error: error.message };
      }
    },
    async sendTemplateMessage(to, template, components) {
      try {
        const recipient = to.includes('@') ? to : `${to}@s.whatsapp.net`;
        const result = await sock.sendMessage(recipient, {
          templateMessage: {
            hydratedTemplate: {
              hydratedContentText: template,
              hydratedButtons: components
            }
          }
        });
        return { success: true, messageId: result.key.id, result };
      } catch (error) {
        console.error(`Error sending template message: ${error}`);
        return { success: false, error: error.message };
      }
    },
    async getStatus() {
      return {
        connected: sock?.user ? true : false,
        phoneNumber: sock?.user?.id ? sock.user.id.split(':')[0] : null,
      };
    }
  };
}

/**
 * Initialize all saved sessions from database
 * @param {PrismaClient} prisma - Prisma client
 */
async function initializeWhatsAppSessions(prisma) {
  try {
    // Get all active sessions from database
    const sessions = await prisma.session.findMany({
      where: { isActive: true }
    });

    console.log(`Initializing ${sessions.length} saved WhatsApp sessions`);

    // Initialize each session
    for (const session of sessions) {
      try {
        // Skip if already active
        if (activeSessions[session.id]) continue;
        
        // Initialize client
        activeSessions[session.id] = await initWhatsAppClient(
          session.id,
          session.apiKey,
          process.env.SESSION_FOLDER || './sessions',
          handleIncomingMessage,
          handleConnectionUpdate
        );
        
        console.log(`Initialized session: ${session.id}`);
      } catch (error) {
        console.error(`Failed to initialize session ${session.id}:`, error);
      }
    }
  } catch (error) {
    console.error('Error initializing WhatsApp sessions:', error);
  }
}

/**
 * Handle incoming messages
 * @param {Object} params - Message parameters
 */
async function handleIncomingMessage({ sessionId, apiKey, message }) {
  try {
    // Get Prisma client
    const { prisma } = require('../index');
    
    // Extract message content
    const remoteJid = message.key.remoteJid;
    const sender = remoteJid.split('@')[0];
    let messageType = 'text';
    let content = '';
    let mediaUrl = null;
    let caption = null;
    
    // Process different message types
    if (message.message?.conversation) {
      content = message.message.conversation;
    } else if (message.message?.imageMessage) {
      messageType = 'image';
      content = 'Image received';
      caption = message.message.imageMessage.caption;
    } else if (message.message?.videoMessage) {
      messageType = 'video';
      content = 'Video received';
      caption = message.message.videoMessage.caption;
    } else if (message.message?.documentMessage) {
      messageType = 'document';
      content = 'Document received';
      caption = message.message.documentMessage.caption;
    } else if (message.message?.audioMessage) {
      messageType = 'audio';
      content = 'Audio received';
    } else {
      // Handle other message types
      content = JSON.stringify(message.message);
    }
    
    // Save message to database
    await prisma.message.create({
      data: {
        sessionId,
        direction: 'incoming',
        messageType,
        recipient: '', // N/A for incoming messages
        sender,
        content,
        mediaUrl,
        caption,
        status: 'received',
        whatsappId: message.key.id
      }
    });
    
    // Get session to check for webhook
    const session = await prisma.session.findUnique({
      where: { id: sessionId }
    });
    
    // Forward to webhook if configured
    if (session.webhookUrl) {
      try {
        await fetch(session.webhookUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-API-Key': apiKey
          },
          body: JSON.stringify({
            sender,
            messageType,
            content,
            caption,
            messageId: message.key.id,
            timestamp: new Date().toISOString()
          })
        });
      } catch (webhookError) {
        console.error(`Webhook delivery failed for session ${sessionId}:`, webhookError);
      }
    }
  } catch (error) {
    console.error('Error handling incoming message:', error);
  }
}

/**
 * Handle connection status updates
 * @param {Object} update - Connection update data
 */
async function handleConnectionUpdate({ sessionId, apiKey, status, qr, phoneNumber }) {
  try {
    // Get Prisma client
    const { prisma } = require('../index');
    
    console.log(`Connection update for session ${sessionId}: ${status}`);
    
    // Update session in database
    await prisma.session.update({
      where: { id: sessionId },
      data: {
        isActive: status !== 'logged_out',
        phoneNumber: phoneNumber || undefined,
      }
    });
    
  } catch (error) {
    console.error('Error handling connection update:', error);
  }
}

/**
 * Create a new WhatsApp session
 * @param {string} name - Optional name for the session 
 * @returns {Object} - Session info including QR code
 */
async function createSession(name = 'WhatsApp Session') {
  try {
    // Get Prisma client
    const { prisma } = require('../index');
    
    // Generate API key
    const apiKey = generateApiKey();
    
    // Create a session record in database
    const session = await prisma.session.create({
      data: {
        apiKey,
        name,
        isActive: true
      }
    });
    
    // Create QR connection
    let qrCode = null;
    const qrPromise = new Promise((resolve) => {
      // Set up a client to get the QR code
      initWhatsAppClient(
        session.id,
        apiKey,
        process.env.SESSION_FOLDER || './sessions',
        handleIncomingMessage,
        (update) => {
          if (update.qr) {
            qrCode = update.qr;
            resolve(update);
          }
          handleConnectionUpdate(update);
        }
      ).then((client) => {
        // Store the client
        activeSessions[session.id] = client;
      });
    });
    
    // Wait for QR code or timeout after 30 seconds
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('QR code generation timed out')), 30000);
    });
    
    await Promise.race([qrPromise, timeoutPromise]);
    
    return {
      sessionId: session.id,
      apiKey,
      qrCode,
      name: session.name
    };
  } catch (error) {
    console.error('Error creating session:', error);
    throw error;
  }
}

/**
 * Get session status
 * @param {string} sessionId - ID of the session
 * @returns {Object} - Session status
 */
async function getSessionStatus(sessionId) {
  try {
    const client = activeSessions[sessionId];
    if (!client) {
      return { connected: false, error: 'Session not active' };
    }
    
    return await client.getStatus();
  } catch (error) {
    console.error(`Error getting session status: ${error}`);
    return { connected: false, error: error.message };
  }
}

/**
 * Send a WhatsApp message
 * @param {string} sessionId - ID of the session
 * @param {string} to - Recipient phone number
 * @param {string} type - Message type (text, image, etc.)
 * @param {Object} content - Message content
 * @returns {Object} - Message result
 */
async function sendMessage(sessionId, to, type, content) {
  try {
    // Get Prisma client
    const { prisma } = require('../index');
    
    const client = activeSessions[sessionId];
    if (!client) {
      throw new Error('Session not active');
    }
    
    let result;
    
    // Handle different message types
    switch (type) {
      case 'text':
        result = await client.sendTextMessage(to, content.text);
        break;
      case 'image':
      case 'video':
      case 'document':
      case 'audio':
        result = await client.sendMediaMessage(
          to,
          content.url,
          type,
          content.caption
        );
        break;
      default:
        throw new Error(`Unsupported message type: ${type}`);
    }
    
    // Save the message to database
    await prisma.message.create({
      data: {
        sessionId,
        direction: 'outgoing',
        messageType: type,
        recipient: to,
        sender: null,
        content: type === 'text' ? content.text : content.url,
        mediaUrl: type !== 'text' ? content.url : null,
        caption: content.caption,
        status: result.success ? 'sent' : 'failed',
        whatsappId: result.messageId,
        failureReason: result.error
      }
    });
    
    return result;
  } catch (error) {
    console.error(`Error sending message: ${error}`);
    return { success: false, error: error.message };
  }
}

module.exports = {
  initializeWhatsAppSessions,
  createSession,
  getSessionStatus,
  sendMessage
};