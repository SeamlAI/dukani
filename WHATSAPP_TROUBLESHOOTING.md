# WhatsApp Client Troubleshooting Guide

This guide helps you diagnose and fix WhatsApp Web client initialization issues in the dukAnI bot.

## Quick Diagnosis

### 1. Run the Diagnostic Tool

```bash
# Run the standalone diagnostic script
npm run debug:whatsapp

# Or run directly
node debug-whatsapp.js
```

### 2. Check via API Endpoints

```bash
# Check system diagnostics
curl http://localhost:3000/api/bot/debug/diagnostics

# Get debug status
curl http://localhost:3000/api/bot/debug/status

# Run initialization with debugging
curl -X POST http://localhost:3000/api/bot/debug/initialize
```

## Common Issues and Solutions

### Issue 1: WhatsApp client takes forever to initialize

**Symptoms:**
- Application starts but WhatsApp never connects
- No QR code appears
- Process hangs during initialization

**Possible Causes & Solutions:**

#### A. Outdated whatsapp-web.js version
```bash
# Update to latest version
npm update whatsapp-web.js

# Or install specific version
npm install whatsapp-web.js@latest
```

#### B. Chrome/Puppeteer issues
```bash
# Test Chrome separately
npm run debug:whatsapp

# Try with different Chrome arguments
export WA_CHROME_ARGS="--no-sandbox,--disable-setuid-sandbox,--disable-dev-shm-usage,--disable-gpu"
```

#### C. Session file corruption
```bash
# Clean session files
npm run debug:clean

# Or manually
rm -rf wa-session
```

### Issue 2: "ProtocolError: Protocol error (Target.setAutoAttach): Target closed"

**Symptoms:**
- Chrome process starts but crashes immediately  
- Error occurs during WhatsApp client initialization
- Common on Railway, Heroku, and other cloud platforms

**Root Cause:**
Chrome is being killed by the container orchestrator due to memory/resource constraints.

**Solutions:**

#### A. Use Railway-optimized Chrome arguments
```env
WA_CHROME_ARGS=--no-sandbox,--disable-setuid-sandbox,--disable-dev-shm-usage,--disable-gpu,--disable-software-rasterizer,--no-first-run,--no-zygote,--single-process,--disable-extensions,--disable-plugins,--disable-default-apps,--disable-background-timer-throttling,--disable-backgrounding-occluded-windows,--disable-renderer-backgrounding,--disable-features=TranslateUI,--disable-features=VizDisplayCompositor,--disable-ipc-flooding-protection,--memory-pressure-off,--max_old_space_size=256,--disable-web-security,--disable-sync,--disable-translate,--hide-scrollbars,--mute-audio,--disable-background-networking,--disable-background-sync,--disable-client-side-phishing-detection,--disable-sync-preferences,--disable-sync-app-settings
```

#### B. Monitor Railway resource usage
- Check Railway dashboard for memory spikes
- Consider upgrading from free tier if hitting limits
- Monitor CPU usage during Chrome startup

#### C. Add retry logic (already implemented)
The bot now automatically retries WhatsApp initialization up to 3 times on Railway.

### Issue 3: "Chrome/Puppeteer test failed"

**Solutions:**

#### A. Install Chrome dependencies (Linux)
```bash
# Ubuntu/Debian
sudo apt-get update
sudo apt-get install -y gconf-service libasound2 libatk1.0-0 libc6 libcairo2 libcups2 libdbus-1-3 libexpat1 libfontconfig1 libgcc1 libgconf-2-4 libgdk-pixbuf2.0-0 libglib2.0-0 libgtk-3-0 libnspr4 libpango-1.0-0 libpangocairo-1.0-0 libstdc++6 libx11-6 libx11-xcb1 libxcb1 libxcomposite1 libxcursor1 libxdamage1 libxext6 libxfixes3 libxi6 libxrandr2 libxrender1 libxss1 libxtst6 ca-certificates fonts-liberation libappindicator1 libnss3 lsb-release xdg-utils wget

# CentOS/RHEL
sudo yum install -y alsa-lib.x86_64 atk.x86_64 cups-libs.x86_64 gtk3.x86_64 ipa-gothic-fonts libXcomposite.x86_64 libXcursor.x86_64 libXdamage.x86_64 libXext.x86_64 libXi.x86_64 libXrandr.x86_64 libXScrnSaver.x86_64 libXtst.x86_64 pango.x86_64 xorg-x11-fonts-100dpi xorg-x11-fonts-75dpi xorg-x11-fonts-cyrillic xorg-x11-fonts-misc xorg-x11-fonts-Type1 xorg-x11-utils
```

#### B. Use system Chrome
```bash
# Find Chrome installation
which google-chrome || which chromium-browser

# Set Chrome path
export CHROME_PATH="/usr/bin/google-chrome"
```

#### C. Docker environment
```dockerfile
# Add to Dockerfile
RUN apt-get update && apt-get install -y \
    chromium \
    --no-install-recommends && \
    rm -rf /var/lib/apt/lists/*

ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium
```

### Issue 3: "Network connectivity failed"

**Solutions:**

#### A. Check proxy settings
```bash
# If behind corporate proxy
export HTTP_PROXY=http://proxy-server:port
export HTTPS_PROXY=http://proxy-server:port
```

#### B. Firewall issues
```bash
# Ensure these URLs are accessible:
curl -I https://web.whatsapp.com
curl -I https://raw.githubusercontent.com/wppconnect-team/wa-version/main/html/2.2412.54.html
```

### Issue 4: "Session directory issue"

**Solutions:**

#### A. Permission problems
```bash
# Fix permissions
chmod 755 wa-session
sudo chown -R $USER:$USER wa-session
```

#### B. Path issues
```bash
# Use absolute path
export WA_SESSION_PATH="/absolute/path/to/wa-session"
```

### Issue 5: QR Code appears but authentication fails

**Solutions:**

#### A. QR Code timeout
```bash
# Clean session and retry
npm run debug:clean
npm run start:dev
```

#### B. Multiple WhatsApp Web sessions
- Close other WhatsApp Web sessions in browsers
- Only one WhatsApp Web session allowed per phone number

#### C. Phone connectivity
- Ensure phone has stable internet connection
- WhatsApp app should be updated to latest version

## Environment Variables

Configure these in your `.env` file:

```env
# Session configuration
WA_SESSION_PATH=./wa-session

# Chrome arguments (adjust based on environment)
WA_CHROME_ARGS=--no-sandbox,--disable-setuid-sandbox,--disable-dev-shm-usage,--disable-gpu,--no-first-run

# For Docker/Railway deployments
WA_CHROME_ARGS=--no-sandbox,--disable-setuid-sandbox,--disable-dev-shm-usage,--disable-gpu,--no-first-run,--single-process

# Custom Chrome path (if needed)
CHROME_PATH=/usr/bin/google-chrome
```

## Debugging Commands

### Full Diagnostic Report
```bash
npm run debug:whatsapp
```

### Clean Start
```bash
npm run debug:clean
npm run start:dev
```

### Detailed Logging
```bash
# Enable debug logging
export DEBUG=*
npm run start:dev
```

### API-based Debugging
```bash
# Run diagnostics via API
curl -X GET http://localhost:3000/api/bot/debug/diagnostics | jq

# Initialize with debugging
curl -X POST http://localhost:3000/api/bot/debug/initialize | jq

# Get debug log
curl -X GET http://localhost:3000/api/bot/debug/log | jq

# Save debug report
curl -X POST http://localhost:3000/api/bot/debug/save-log
```

## Platform-Specific Solutions

### macOS
```bash
# Install Xcode command line tools
xcode-select --install

# Chrome sandbox issues
export WA_CHROME_ARGS="--no-sandbox,--disable-setuid-sandbox"
```

### Windows (WSL)
```bash
# Install Chrome in WSL
wget -q -O - https://dl.google.com/linux/linux_signing_key.pub | sudo apt-key add -
sudo sh -c 'echo "deb [arch=amd64] http://dl.google.com/linux/chrome/deb/ stable main" >> /etc/apt/sources.list.d/google-chrome.list'
sudo apt update
sudo apt install google-chrome-stable

# Use Windows Chrome (alternative)
export CHROME_PATH="/mnt/c/Program Files/Google/Chrome/Application/chrome.exe"
```

### Railway/Cloud Deployment
```env
# Enhanced Chrome args for cloud environments
WA_CHROME_ARGS=--no-sandbox,--disable-setuid-sandbox,--disable-dev-shm-usage,--disable-gpu,--no-first-run,--disable-extensions,--disable-plugins,--disable-default-apps,--single-process,--disable-background-timer-throttling,--disable-backgrounding-occluded-windows,--disable-renderer-backgrounding

# Memory optimization
NODE_OPTIONS=--max-old-space-size=512
```

## Version Compatibility

### Known Working Configurations

| Node.js | whatsapp-web.js | Status |
|---------|-----------------|--------|
| 18.x    | ^1.31.0        | ✅ Working |
| 20.x    | ^1.31.0        | ✅ Working |
| 16.x    | ^1.31.0        | ⚠️ Deprecated |

### Update Strategy
```bash
# Check current versions
node --version
npm list whatsapp-web.js

# Update whatsapp-web.js
npm update whatsapp-web.js

# Force clean install
rm -rf node_modules package-lock.json
npm install
```

## Getting Help

### Debug Information to Collect

When reporting issues, include:

1. **System Information:**
   ```bash
   node --version
   npm --version
   uname -a  # Linux/macOS
   ```

2. **Debug Report:**
   ```bash
   npm run debug:whatsapp
   # Include the generated whatsapp-debug-report.json
   ```

3. **Environment:**
   ```bash
   env | grep -E "(WA_|NODE_|CHROME_)"
   ```

4. **Application Logs:**
   ```bash
   npm run start:dev > app.log 2>&1
   # Include relevant portions of app.log
   ```

### Contact Information

- Check application logs for detailed error messages
- Review the generated debug report (`whatsapp-debug-report.json`)
- Test with the standalone diagnostic tool first
- Try cleaning session files before reporting issues

## Advanced Troubleshooting

### Manual WhatsApp Client Test

Create a minimal test script:

```javascript
// test-whatsapp.js
const { Client, LocalAuth } = require('whatsapp-web.js');

const client = new Client({
  authStrategy: new LocalAuth(),
  puppeteer: {
    headless: false, // Set to true for production
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  }
});

client.on('qr', qr => {
  console.log('QR RECEIVED', qr);
});

client.on('ready', () => {
  console.log('Client is ready!');
  process.exit(0);
});

client.initialize();
```

Run with:
```bash
node test-whatsapp.js
```

### Memory and Resource Monitoring

```bash
# Monitor memory usage
htop

# Monitor Node.js memory
node --inspect debug-whatsapp.js
# Open chrome://inspect in browser
```

This troubleshooting guide should help you identify and resolve most WhatsApp client initialization issues. Start with the diagnostic tool and work through the solutions systematically. 