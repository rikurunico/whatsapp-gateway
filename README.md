# 📬 WhatsApp Gateway API

A blazing-fast, self-hosted WhatsApp Gateway built with **Express.js**, **Prisma** and **Docker**.  
**No registration. No login. Just scan a QR code, get your API key, and start messaging instantly.**

## 🚀 Overview

This lightweight, developer-friendly solution automates WhatsApp messaging without complex setup.  
Users simply **scan a QR code once** to link their WhatsApp account and immediately receive an API key for sending messages and receiving webhooks.

**Ideal for:**
- 👨‍💻 Developers creating automation workflows
- 🏪 Businesses sending customer notifications
- 🏫 Institutions requiring simple WhatsApp integration
- 🤖 ChatBot and AI messaging implementations

## ✨ Key Features

- **Instant Setup** - Scan QR code → Get API key → Send messages
- **Rich Messaging** - Send text, images, documents, and more
- **Webhook Integration** - Receive and process incoming messages automatically
- **Comprehensive Logging** - Track all message activity via PostgreSQL
- **Docker-Ready** - Deploy anywhere with one-click containerization
- **Developer-Friendly API** - Simple, RESTful endpoints with Swagger documentation

## 🧰 Technology Stack

- **Backend Framework**: [Express.js](https://expressjs.com/)
- **Frontend**: Native JavaScript and HTML (minimal, developer-focused interface)
- **Database**: PostgreSQL with [Prisma](https://www.prisma.io/)
- **WhatsApp Client**: [Baileys](https://github.com/WhiskeySockets/Baileys)
- **Deployment**: Docker & Docker Compose
- **Documentation**: Swagger UI / OpenAPI

## 🔧 Quick Start

### 1. Clone and setup

```bash
git clone https://github.com/rikurunico/whatsapp-gateway.git
cd whatsapp-gateway
cp .env.example .env
# Edit .env with your configuration
```

### 2. Launch with Docker

```bash
docker-compose up -d
```

Access the API documentation at [http://localhost:3000/api-docs](http://localhost:3000/api-docs)

## 📡 API Reference

All API requests require your unique API key in the header:
```
X-API-KEY: your-api-key
```

| Endpoint | Method | Description | Example |
|----------|--------|-------------|---------|
| `/qr` | GET | Generate QR code for pairing | Returns QR code image |
| `/status` | GET | Check connection status | `{"connected": true, "phone": "123456789"}` |
| `/send` | POST | Send messages | See examples below |
| `/webhook` | POST | Configure webhook URL | `{"webhook_url": "https://example.com/hook"}` |

### Sending Messages

**Text Message:**
```json
{
  "to": "6281234567890",
  "type": "text",
  "message": "Hello from API!"
}
```

**Media Message:**
```json
{
  "to": "6281234567890",
  "type": "image",
  "url": "https://example.com/image.jpg",
  "caption": "Check this out!"
}
```

## 🗃️ Data Storage

The application stores all essential data in PostgreSQL:
- Device sessions and API keys
- Message history with status tracking
- Webhook configurations and delivery logs

## 📁 Project Structure

```
whatsapp-gateway/
├── src/
│   ├── index.js         # Express.js application entry point
│   ├── models/          # Prisma schema and models
│   ├── routes/          # API route definitions
│   ├── services/        # Business logic components
│   └── utils/           # Helper functions
├── public/
│   ├── index.html       # Simple dashboard for QR code scanning & API key management
│   ├── js/              # Native JavaScript for frontend functionality
│   └── css/             # Simple styling
├── prisma/
│   └── schema.prisma    # Prisma database schema
├── docker-compose.yml   # Container orchestration
├── Dockerfile           # Container build instructions
├── .env.example         # Environment variable template
└── README.md            # Project documentation
```

## 🔧 Features

- **Simple Web Interface** - Basic HTML/JavaScript dashboard to:
  - Scan WhatsApp QR codes
  - View and copy API keys
  - Test API endpoints
  - Configure webhooks
  - View basic message logs
- **RESTful API** - Comprehensive endpoints for developers to integrate with
- **Stateless Design** - Multiple instances can be deployed behind a load balancer

## 🧪 Development

```bash
# Install dependencies
npm install

# Set up Prisma
npx prisma migrate dev

# Run with hot-reload
npm run dev
```

## 📄 License

MIT License. Free for personal and commercial use.

## 🤝 Contributing

Contributions welcome! Please feel free to submit a Pull Request.