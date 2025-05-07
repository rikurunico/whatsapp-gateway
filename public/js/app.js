// WhatsApp Gateway Dashboard JavaScript

// DOM elements
const elements = {
  // Main sections
  welcomeSection: document.getElementById('welcome'),
  sessionsContainer: document.getElementById('sessions-container'),
  sessionsList: document.getElementById('sessions-list'),
  qrContainer: document.getElementById('qr-container'),
  sessionDetails: document.getElementById('session-details'),
  apiDocsLink: document.getElementById('api-docs-link'),
  
  // QR code section
  qrCode: document.getElementById('qr-code'),
  apiKeyContainer: document.getElementById('api-key-container'),
  apiKeyDisplay: document.getElementById('api-key-display'),
  copyApiKeyBtn: document.getElementById('copy-api-key'),
  cancelQrBtn: document.getElementById('cancel-qr-btn'),
  
  // Session details section
  sessionName: document.getElementById('session-name'),
  connectionStatus: document.getElementById('connection-status'),
  phoneNumber: document.getElementById('phone-number'),
  sessionId: document.getElementById('session-id'),
  createdAt: document.getElementById('created-at'),
  regenerateQrBtn: document.getElementById('regenerate-qr-btn'),
  deleteSessionBtn: document.getElementById('delete-session-btn'),
  backToSessionsBtn: document.getElementById('back-to-sessions'),
  
  // Messages tab
  directionFilter: document.getElementById('direction-filter'),
  phoneFilter: document.getElementById('phone-filter'),
  refreshMessagesBtn: document.getElementById('refresh-messages-btn'),
  messagesList: document.getElementById('messages-list'),
  prevPageBtn: document.getElementById('prev-page'),
  nextPageBtn: document.getElementById('next-page'),
  pageInfo: document.getElementById('page-info'),
  
  // Webhook tab
  webhookUrl: document.getElementById('webhook-url'),
  saveWebhookBtn: document.getElementById('save-webhook-btn'),
  testWebhookBtn: document.getElementById('test-webhook-btn'),
  webhookTestResult: document.getElementById('webhook-test-result'),
  
  // Test tab
  testRecipient: document.getElementById('test-recipient'),
  messageType: document.getElementById('message-type'),
  textMessageInput: document.getElementById('text-message-input'),
  mediaMessageInput: document.getElementById('media-message-input'),
  textMessage: document.getElementById('text-message'),
  mediaUrl: document.getElementById('media-url'),
  mediaCaption: document.getElementById('media-caption'),
  sendTestMessage: document.getElementById('send-test-message'),
  sendResult: document.getElementById('send-result'),
  
  // Tab buttons
  tabBtns: document.querySelectorAll('.tab-btn'),
  tabContents: document.querySelectorAll('.tab-content'),
  
  // Toast notifications
  toast: document.getElementById('toast'),
  
  // Buttons
  createSessionBtn: document.getElementById('create-session-btn')
};

// State management
const state = {
  sessions: [],
  currentSession: null,
  messages: {
    data: [],
    page: 1,
    limit: 20,
    total: 0
  }
};

// API functions
const api = {
  // Base headers
  headers() {
    const headers = {
      'Content-Type': 'application/json'
    };
    
    // Add API key if available
    if (state.currentSession && state.currentSession.apiKey) {
      headers['X-API-Key'] = state.currentSession.apiKey;
    }
    
    return headers;
  },
  
  // Create a new session
  async createSession(name = 'WhatsApp Session') {
    try {
      const response = await fetch('/api/sessions', {
        method: 'POST',
        headers: this.headers(),
        body: JSON.stringify({ name })
      });
      
      if (!response.ok) {
        throw new Error(`Failed to create session: ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('Error creating session:', error);
      showToast(`Error creating session: ${error.message}`, 'error');
      throw error;
    }
  },
  
  // Get all sessions
  async getSessions() {
    try {
      // Skip API call if we don't have an API key
      const hasApiKey = Object.values(state.sessions).some(s => s.apiKey) || 
                       (state.currentSession && state.currentSession.apiKey);
      
      if (!hasApiKey) {
        console.log('No API key available, skipping sessions fetch');
        return { success: false, data: [] };
      }
      
      const response = await fetch('/api/sessions', {
        headers: this.headers()
      });
      
      if (!response.ok) {
        // If unauthorized, the API key might be invalid or missing
        if (response.status === 401) {
          return { success: false, data: [] };
        }
        throw new Error(`Failed to get sessions: ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('Error getting sessions:', error);
      showToast(`Error getting sessions: ${error.message}`, 'error');
      return { success: false, data: [] };
    }
  },
  
  // Get session status
  async getSessionStatus(sessionId) {
    try {
      const response = await fetch(`/api/sessions/status/${sessionId}`, {
        headers: this.headers()
      });
      
      if (!response.ok) {
        throw new Error(`Failed to get session status: ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('Error getting session status:', error);
      return { success: false, data: { connected: false } };
    }
  },
  
  // Regenerate QR code
  async regenerateQrCode(sessionId) {
    try {
      const response = await fetch(`/api/sessions/qr/${sessionId}`, {
        headers: this.headers()
      });
      
      if (!response.ok) {
        throw new Error(`Failed to regenerate QR code: ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('Error regenerating QR code:', error);
      showToast(`Error regenerating QR code: ${error.message}`, 'error');
      throw error;
    }
  },
  
  // Delete session
  async deleteSession(sessionId) {
    try {
      const response = await fetch(`/api/sessions/${sessionId}`, {
        method: 'DELETE',
        headers: this.headers()
      });
      
      if (!response.ok) {
        throw new Error(`Failed to delete session: ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('Error deleting session:', error);
      showToast(`Error deleting session: ${error.message}`, 'error');
      throw error;
    }
  },
  
  // Get webhook configuration
  async getWebhookConfig() {
    try {
      const response = await fetch('/api/webhooks/config', {
        headers: this.headers()
      });
      
      if (!response.ok) {
        throw new Error(`Failed to get webhook config: ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('Error getting webhook config:', error);
      return { success: false, data: { webhookUrl: null } };
    }
  },
  
  // Save webhook configuration
  async saveWebhookConfig(webhookUrl) {
    try {
      const response = await fetch('/api/webhooks/config', {
        method: 'POST',
        headers: this.headers(),
        body: JSON.stringify({ webhookUrl })
      });
      
      if (!response.ok) {
        throw new Error(`Failed to save webhook config: ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('Error saving webhook config:', error);
      showToast(`Error saving webhook config: ${error.message}`, 'error');
      throw error;
    }
  },
  
  // Test webhook
  async testWebhook() {
    try {
      const response = await fetch('/api/webhooks/test', {
        method: 'POST',
        headers: this.headers()
      });
      
      if (!response.ok) {
        throw new Error(`Webhook test failed: ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('Error testing webhook:', error);
      showToast(`Error testing webhook: ${error.message}`, 'error');
      throw error;
    }
  },
  
  // Get messages
  async getMessages(params = {}) {
    try {
      const queryParams = new URLSearchParams();
      
      // Add pagination params
      queryParams.append('limit', params.limit || state.messages.limit);
      queryParams.append('offset', ((params.page || state.messages.page) - 1) * (params.limit || state.messages.limit));
      
      // Add filters
      if (params.direction) queryParams.append('direction', params.direction);
      if (params.recipient) queryParams.append('recipient', params.recipient);
      if (params.sender) queryParams.append('sender', params.sender);
      
      const response = await fetch(`/api/messages?${queryParams.toString()}`, {
        headers: this.headers()
      });
      
      if (!response.ok) {
        throw new Error(`Failed to get messages: ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('Error getting messages:', error);
      showToast(`Error getting messages: ${error.message}`, 'error');
      return { success: false, data: { messages: [], pagination: { total: 0 } } };
    }
  },
  
  // Send test message
  async sendMessage(to, type, content) {
    try {
      const payload = { to, type };
      
      // Add content based on message type
      if (type === 'text') {
        payload.text = content.text;
      } else {
        payload.url = content.url;
        if (content.caption) payload.caption = content.caption;
      }
      
      const response = await fetch('/api/messages/send', {
        method: 'POST',
        headers: this.headers(),
        body: JSON.stringify(payload)
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || `Failed to send message: ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('Error sending message:', error);
      showToast(`Error sending message: ${error.message}`, 'error');
      throw error;
    }
  }
};

// UI functions
const ui = {
  // Show/hide sections
  showSection(section) {
    elements.welcomeSection.classList.add('hidden');
    elements.sessionsContainer.classList.add('hidden');
    elements.qrContainer.classList.add('hidden');
    elements.sessionDetails.classList.add('hidden');
    elements.apiDocsLink.classList.remove('hidden');
    
    section.classList.remove('hidden');
  },
  
  // Display QR code
  displayQrCode(qrCode) {
    try {
      // Clear any previous content
      elements.qrCode.innerHTML = '';
      
      // Load qrcode.js library if not already loaded
      if (!window.QRCode) {
        const script = document.createElement('script');
        script.src = 'https://cdn.jsdelivr.net/npm/qrcode@1.5.1/build/qrcode.min.js';
        script.onload = () => {
          // Create QR code when library is loaded
          this._generateQRCode(qrCode);
        };
        document.head.appendChild(script);
      } else {
        // Library already loaded, generate QR code directly
        this._generateQRCode(qrCode);
      }
      
      elements.apiKeyContainer.classList.remove('hidden');
      this.showSection(elements.qrContainer);
    } catch (error) {
      console.error('Error displaying QR code:', error);
      elements.qrCode.innerHTML = '<div class="error-message">Error generating QR code. Please try again.</div>';
    }
  },
  
  // Helper method to generate QR code
  _generateQRCode(qrCode) {
    try {
      // Create canvas element for QR code
      const canvas = document.createElement('canvas');
      canvas.className = 'qr-code-canvas';
      elements.qrCode.appendChild(canvas);
      
      // Create QR code on the canvas
      QRCode.toCanvas(canvas, qrCode, {
        width: 300,
        margin: 4,
        errorCorrectionLevel: 'H',
        color: {
          dark: '#122e31',
          light: '#FFFFFF',
        }
      }, (error) => {
        if (error) {
          console.error('Error generating QR code:', error);
          elements.qrCode.innerHTML = '<div class="error-message">Failed to generate QR code. Please try again.</div>';
        } else {
          console.log('QR code generated successfully');
        }
      });
      
      // Add scanning instructions
      const instructions = document.createElement('p');
      instructions.className = 'qr-instructions';
      instructions.textContent = 'Open WhatsApp on your phone → Settings → Linked devices → Link a device';
      elements.qrCode.appendChild(instructions);
    } catch (error) {
      console.error('Error in _generateQRCode:', error);
      elements.qrCode.innerHTML = '<div class="error-message">Failed to generate QR code. Please try again.</div>';
    }
  },
  
  // Show API key
  showApiKey(apiKey) {
    elements.apiKeyDisplay.textContent = apiKey;
    elements.apiKeyContainer.classList.remove('hidden');
  },
  
  // Display sessions list
  displaySessions(sessions) {
    if (sessions.length === 0) {
      // Show welcome screen if no sessions
      this.showSection(elements.welcomeSection);
      return;
    }
    
    // Clear existing sessions
    elements.sessionsList.innerHTML = '';
    
    // Create session cards
    sessions.forEach(session => {
      const card = document.createElement('div');
      card.className = 'session-card';
      card.dataset.id = session.id;
      
      // Status class based on connection
      const statusClass = session.phoneNumber ? 'connected' : 'disconnected';
      
      card.innerHTML = `
        <h3>${session.name || 'WhatsApp Session'}</h3>
        <p>${session.phoneNumber || 'Not connected'}</p>
        <span class="status ${statusClass}">${session.phoneNumber ? 'Connected' : 'Disconnected'}</span>
        <p class="date">Created: ${new Date(session.createdAt).toLocaleDateString()}</p>
      `;
      
      // Add click handler
      card.addEventListener('click', () => {
        // Find session in state
        const sessionData = state.sessions.find(s => s.id === session.id);
        if (sessionData) {
          state.currentSession = sessionData;
          this.displaySessionDetails(sessionData);
        }
      });
      
      elements.sessionsList.appendChild(card);
    });
    
    // Show sessions container
    this.showSection(elements.sessionsContainer);
  },
  
  // Display session details
  displaySessionDetails(session) {
    // Set session details
    elements.sessionName.textContent = session.name || 'WhatsApp Session';
    elements.sessionId.textContent = session.id;
    elements.createdAt.textContent = new Date(session.createdAt).toLocaleString();
    
    // Set connection status and phone number
    if (session.phoneNumber) {
      elements.connectionStatus.textContent = 'Connected';
      elements.connectionStatus.className = 'status connected';
      elements.phoneNumber.textContent = session.phoneNumber;
    } else {
      elements.connectionStatus.textContent = 'Disconnected';
      elements.connectionStatus.className = 'status disconnected';
      elements.phoneNumber.textContent = 'Not connected';
    }
    
    // Show session details
    this.showSection(elements.sessionDetails);
    
    // Load webhook config
    this.loadWebhookConfig();
    
    // Load messages
    this.loadMessages();
  },
  
  // Load webhook configuration
  async loadWebhookConfig() {
    try {
      const response = await api.getWebhookConfig();
      if (response.success) {
        elements.webhookUrl.value = response.data.webhookUrl || '';
      }
    } catch (error) {
      console.error('Error loading webhook config:', error);
    }
  },
  
  // Load messages
  async loadMessages(page = 1) {
    // Show loading
    elements.messagesList.innerHTML = '<p>Loading messages...</p>';
    
    // Get filter values
    const direction = elements.directionFilter.value;
    const phone = elements.phoneFilter.value;
    
    // Prepare filter parameters
    const params = { page };
    if (direction) params.direction = direction;
    
    // Apply phone filter to either recipient or sender based on direction
    if (phone) {
      if (direction === 'outgoing') {
        params.recipient = phone;
      } else if (direction === 'incoming') {
        params.sender = phone;
      } else {
        // If direction not specified, search in both fields
        // The API will need to handle this logic
        params.recipient = phone;
        params.sender = phone;
      }
    }
    
    try {
      const response = await api.getMessages(params);
      
      if (response.success) {
        // Update state
        state.messages.data = response.data.messages;
        state.messages.page = page;
        state.messages.total = response.data.pagination.total;
        
        // Display messages
        this.renderMessages(response.data.messages);
        
        // Update pagination
        const totalPages = Math.ceil(response.data.pagination.total / state.messages.limit);
        elements.pageInfo.textContent = `Page ${page} of ${totalPages || 1}`;
        
        // Enable/disable pagination buttons
        elements.prevPageBtn.disabled = page <= 1;
        elements.nextPageBtn.disabled = page >= totalPages;
      } else {
        elements.messagesList.innerHTML = '<p>Failed to load messages. Please try again.</p>';
      }
    } catch (error) {
      elements.messagesList.innerHTML = '<p>Error loading messages. Please try again.</p>';
    }
  },
  
  // Render messages in the list
  renderMessages(messages) {
    if (messages.length === 0) {
      elements.messagesList.innerHTML = '<p>No messages found.</p>';
      return;
    }
    
    elements.messagesList.innerHTML = '';
    
    messages.forEach(message => {
      const messageItem = document.createElement('div');
      messageItem.className = `message-item message-${message.direction}`;
      
      // Format date
      const date = new Date(message.createdAt).toLocaleString();
      
      // Format address based on direction
      const address = message.direction === 'outgoing' 
        ? `To: ${message.recipient}`
        : `From: ${message.sender}`;
      
      // Format content based on type
      let content = message.content;
      if (message.messageType !== 'text' && message.mediaUrl) {
        content = `[${message.messageType}] ${message.caption || ''}`;
      }
      
      messageItem.innerHTML = `
        <div class="message-header">
          <span>${address}</span>
          <span>${date}</span>
        </div>
        <div class="message-content">${content}</div>
        <div class="message-status">Status: ${message.status}</div>
      `;
      
      elements.messagesList.appendChild(messageItem);
    });
  }
};

// Helper functions
function showToast(message, type = '') {
  elements.toast.textContent = message;
  elements.toast.className = `toast ${type}`;
  
  // Show the toast
  elements.toast.classList.remove('hidden');
  
  // Hide the toast after 3 seconds
  setTimeout(() => {
    elements.toast.classList.add('hidden');
  }, 3000);
}

// Event handlers
async function init() {
  // Create session button
  elements.createSessionBtn.addEventListener('click', async () => {
    try {
      const response = await api.createSession();
      
      if (response.success) {
        // Store session data including API key
        state.currentSession = {
          id: response.data.sessionId,
          apiKey: response.data.apiKey,
          name: response.data.name
        };
        
        // Display QR code
        ui.displayQrCode(response.data.qrCode);
        
        // Show API key
        ui.showApiKey(response.data.apiKey);
        
        showToast('Session created successfully. Scan the QR code with WhatsApp.', 'success');
      } else {
        showToast('Failed to create session', 'error');
      }
    } catch (error) {
      showToast(`Error: ${error.message}`, 'error');
    }
  });
  
  // Copy API key button
  elements.copyApiKeyBtn.addEventListener('click', () => {
    const apiKey = elements.apiKeyDisplay.textContent;
    navigator.clipboard.writeText(apiKey)
      .then(() => showToast('API key copied to clipboard', 'success'))
      .catch(err => showToast('Failed to copy API key', 'error'));
  });
  
  // Cancel QR scan button
  elements.cancelQrBtn.addEventListener('click', () => {
    // Go back to welcome/sessions screen
    loadSessions();
  });
  
  // Back to sessions button
  elements.backToSessionsBtn.addEventListener('click', () => {
    loadSessions();
  });
  
  // Tab switching
  elements.tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      // Remove active class from all tabs
      elements.tabBtns.forEach(b => b.classList.remove('active'));
      elements.tabContents.forEach(c => c.classList.remove('active'));
      
      // Add active class to selected tab
      btn.classList.add('active');
      
      // Show corresponding content
      const tabId = btn.dataset.tab;
      document.getElementById(`${tabId}-tab`).classList.add('active');
    });
  });
  
  // Regenerate QR code button
  elements.regenerateQrBtn.addEventListener('click', async () => {
    try {
      const sessionId = state.currentSession.id;
      const response = await api.regenerateQrCode(sessionId);
      
      if (response.success) {
        ui.displayQrCode(response.data.qrCode);
        showToast('QR code regenerated. Scan with WhatsApp to connect.', 'success');
      } else {
        showToast('Failed to regenerate QR code', 'error');
      }
    } catch (error) {
      showToast(`Error: ${error.message}`, 'error');
    }
  });
  
  // Delete session button
  elements.deleteSessionBtn.addEventListener('click', async () => {
    if (!confirm('Are you sure you want to delete this session?')) {
      return;
    }
    
    try {
      const sessionId = state.currentSession.id;
      const response = await api.deleteSession(sessionId);
      
      if (response.success) {
        showToast('Session deleted successfully', 'success');
        loadSessions();
      } else {
        showToast('Failed to delete session', 'error');
      }
    } catch (error) {
      showToast(`Error: ${error.message}`, 'error');
    }
  });
  
  // Save webhook button
  elements.saveWebhookBtn.addEventListener('click', async () => {
    const webhookUrl = elements.webhookUrl.value.trim();
    
    try {
      const response = await api.saveWebhookConfig(webhookUrl);
      
      if (response.success) {
        showToast('Webhook configuration saved', 'success');
      } else {
        showToast('Failed to save webhook configuration', 'error');
      }
    } catch (error) {
      showToast(`Error: ${error.message}`, 'error');
    }
  });
  
  // Test webhook button
  elements.testWebhookBtn.addEventListener('click', async () => {
    elements.webhookTestResult.innerHTML = 'Testing webhook...';
    elements.webhookTestResult.classList.remove('hidden');
    
    try {
      const response = await api.testWebhook();
      
      if (response.success) {
        elements.webhookTestResult.innerHTML = `
          <p class="success">Webhook test successful!</p>
          <p>Status code: ${response.data.statusCode}</p>
          <p>Response: ${response.data.response}</p>
        `;
      } else {
        elements.webhookTestResult.innerHTML = `
          <p class="error">Webhook test failed!</p>
          <p>${response.message}</p>
        `;
      }
    } catch (error) {
      elements.webhookTestResult.innerHTML = `
        <p class="error">Webhook test failed!</p>
        <p>${error.message}</p>
      `;
    }
  });
  
  // Message filters
  elements.directionFilter.addEventListener('change', () => ui.loadMessages(1));
  elements.refreshMessagesBtn.addEventListener('click', () => ui.loadMessages(1));
  
  // Phone filter with debounce
  let phoneFilterTimeout;
  elements.phoneFilter.addEventListener('input', () => {
    clearTimeout(phoneFilterTimeout);
    phoneFilterTimeout = setTimeout(() => ui.loadMessages(1), 500);
  });
  
  // Pagination buttons
  elements.prevPageBtn.addEventListener('click', () => {
    if (state.messages.page > 1) {
      ui.loadMessages(state.messages.page - 1);
    }
  });
  
  elements.nextPageBtn.addEventListener('click', () => {
    const totalPages = Math.ceil(state.messages.total / state.messages.limit);
    if (state.messages.page < totalPages) {
      ui.loadMessages(state.messages.page + 1);
    }
  });
  
  // Message type toggle
  elements.messageType.addEventListener('change', () => {
    const type = elements.messageType.value;
    
    if (type === 'text') {
      elements.textMessageInput.classList.remove('hidden');
      elements.mediaMessageInput.classList.add('hidden');
    } else {
      elements.textMessageInput.classList.add('hidden');
      elements.mediaMessageInput.classList.remove('hidden');
    }
  });
  
  // Send test message button
  elements.sendTestMessage.addEventListener('click', async () => {
    const recipient = elements.testRecipient.value.trim();
    const type = elements.messageType.value;
    
    // Validate recipient
    if (!recipient) {
      showToast('Please enter a recipient phone number', 'error');
      return;
    }
    
    // Prepare content based on message type
    let content = {};
    if (type === 'text') {
      const text = elements.textMessage.value.trim();
      if (!text) {
        showToast('Please enter a message', 'error');
        return;
      }
      content = { text };
    } else {
      const url = elements.mediaUrl.value.trim();
      if (!url) {
        showToast('Please enter a media URL', 'error');
        return;
      }
      content = { 
        url,
        caption: elements.mediaCaption.value.trim()
      };
    }
    
    // Disable button while sending
    elements.sendTestMessage.disabled = true;
    elements.sendTestMessage.textContent = 'Sending...';
    
    try {
      const response = await api.sendMessage(recipient, type, content);
      
      if (response.success) {
        elements.sendResult.innerHTML = `
          <p class="success">Message sent successfully!</p>
          <p>Message ID: ${response.data.messageId}</p>
        `;
        elements.sendResult.classList.remove('hidden');
        
        // Clear form if successful
        if (type === 'text') {
          elements.textMessage.value = '';
        } else {
          elements.mediaCaption.value = '';
        }
      } else {
        elements.sendResult.innerHTML = `
          <p class="error">Failed to send message!</p>
          <p>${response.message}</p>
        `;
        elements.sendResult.classList.remove('hidden');
      }
    } catch (error) {
      elements.sendResult.innerHTML = `
        <p class="error">Error sending message!</p>
        <p>${error.message}</p>
      `;
      elements.sendResult.classList.remove('hidden');
    } finally {
      // Re-enable button
      elements.sendTestMessage.disabled = false;
      elements.sendTestMessage.textContent = 'Send Message';
    }
  });
  
  // Load sessions on startup
  loadSessions();
}

// Load all sessions
async function loadSessions() {
  try {
    const response = await api.getSessions();
    
    if (response.success) {
      state.sessions = response.data;
      ui.displaySessions(response.data);
    } else {
      // If unauthorized or no sessions, show welcome screen
      ui.showSection(elements.welcomeSection);
    }
  } catch (error) {
    console.error('Error loading sessions:', error);
    ui.showSection(elements.welcomeSection);
  }
}

// Initialize the app when the DOM is fully loaded
document.addEventListener('DOMContentLoaded', init);