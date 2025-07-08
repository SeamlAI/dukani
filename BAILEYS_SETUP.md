# Baileys WhatsApp Setup Guide

DukAnI now uses **Baileys** - a lightweight, native WhatsApp Web API implementation that doesn't require Chrome/Puppeteer.

## ✅ Benefits of Baileys

- **No Chrome dependency** - Much smaller Docker images
- **Lower memory usage** - Perfect for Fly.io and Railway deployments  
- **Native TypeScript** - Better performance and reliability
- **Direct connection** - Connects directly to WhatsApp servers
- **Multi-device support** - More stable authentication

## 🚀 Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. Set Environment Variables
```env
GROQ_API_KEY=your_groq_api_key_here
TAVILY_API_KEY=your_tavily_api_key_here
WA_SESSION_PATH=./wa-session
```

### 3. Start the Application
```bash
npm run start:dev
```

### 4. Connect WhatsApp

1. **Console QR Code**: QR code will be displayed in the terminal
2. **API QR Code**: Access via `GET /api/bot/qr` 
3. **Visual QR Code**: View at `GET /api/bot/qr/image`
4. **Scan with phone**: WhatsApp → Settings → Linked Devices → Link a Device

## 📱 API Endpoints

### QR Code Access
```bash
# Get QR code text
curl http://localhost:3000/api/bot/qr

# View QR code as image
curl http://localhost:3000/api/bot/qr/image -o qr.png
```

### Connection Status
```bash
# Check connection status
curl http://localhost:3000/api/bot/status

# Get account info
curl http://localhost:3000/api/bot/info
```

### Send Messages
```bash
# Send test message
curl -X POST http://localhost:3000/api/bot/send \
  -H "Content-Type: application/json" \
  -d '{"phoneNumber": "1234567890", "message": "Hello from dukAnI!"}'
```

## 🔧 Troubleshooting

### Connection Issues

**Problem**: No QR code appears
- **Solution**: Check logs for errors, restart with `npm run start:dev`

**Problem**: QR code expired
- **Solution**: Restart the application to generate a new QR code

**Problem**: Authentication failed
- **Solution**: Delete session files and restart:
  ```bash
  rm -rf wa-session
  npm run start:dev
  ```

### Session Management

**Session Location**: `./wa-session/` (configurable via `WA_SESSION_PATH`)

**Clean Session**:
```bash
rm -rf wa-session
```

**Backup Session**:
```bash
cp -r wa-session wa-session-backup
```

## 🐳 Docker Deployment

Baileys requires much simpler Docker configuration:

```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY dist ./dist
EXPOSE 3000
CMD ["npm", "run", "start:prod"]
```

## ☁️ Cloud Deployment

### Fly.io
```bash
flyctl deploy
```

### Railway
```bash
railway up
```

No Chrome-specific configuration needed!

## 🔒 Security Notes

- Session files contain authentication data - keep secure
- Use environment variables for API keys
- WhatsApp sessions are persistent across restarts
- Only one active session per phone number

## 📊 Memory Usage

Baileys uses significantly less memory than whatsapp-web.js:

- **Development**: ~50-100MB RAM
- **Production**: ~100-200MB RAM
- **No Chrome**: No additional browser memory overhead

## 🆘 Support

If you encounter issues:

1. Check application logs
2. Verify API endpoints are responding
3. Ensure WhatsApp mobile app is updated
4. Try clearing session files and reconnecting

For deployment-specific issues, check the respective platform documentation. 