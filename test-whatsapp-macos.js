#!/usr/bin/env node

/**
 * WhatsApp Client Test for macOS
 * Optimized configuration for macOS environment
 */

const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');

console.log('🍎 Testing WhatsApp Web client with macOS-optimized configuration...\n');

// Enhanced Chrome arguments specifically for macOS
const macOSChromeArgs = [
  '--no-sandbox',
  '--disable-setuid-sandbox',
  '--disable-dev-shm-usage',
  '--disable-gpu',
  '--no-first-run',
  '--disable-extensions',
  '--disable-plugins',
  '--disable-default-apps',
  '--disable-translate',
  '--disable-features=TranslateUI',
  '--disable-features=VizDisplayCompositor',
  '--disable-ipc-flooding-protection',
  '--disable-backgrounding-occluded-windows',
  '--disable-renderer-backgrounding',
  '--disable-field-trial-config',
  '--disable-back-forward-cache',
  '--disable-hang-monitor',
  '--disable-popup-blocking',
  '--disable-prompt-on-repost',
  '--disable-sync',
  '--disable-web-security',
  '--media-cache-size=0',
  '--disk-cache-size=0',
  '--aggressive-cache-discard',
  '--memory-pressure-off',
];

console.log(`Using ${macOSChromeArgs.length} Chrome arguments optimized for macOS`);

const client = new Client({
  authStrategy: new LocalAuth({
    dataPath: './wa-session-test',
  }),
  puppeteer: {
    headless: true,
    args: macOSChromeArgs,
    timeout: 60000,
    devtools: false,
    // Use system Chrome on macOS if available
    executablePath: process.env.CHROME_PATH || undefined,
  },
  // Use a known working web version
  webVersionCache: {
    type: 'remote',
    remotePath: 'https://raw.githubusercontent.com/wppconnect-team/wa-version/main/html/2.2412.54.html',
  },
  // Add session restore timeout
  restoreSessionTimeout: 60000,
});

// Comprehensive event logging
client.on('loading_screen', (percent, message) => {
  console.log(`📱 Loading: ${percent}% - ${message}`);
});

client.on('qr', (qr) => {
  console.log('📱 QR Code received! Scan with your WhatsApp mobile app:\n');
  qrcode.generate(qr, { small: true });
  console.log('\nWaiting for scan...');
});

client.on('authenticated', () => {
  console.log('✅ Authentication successful!');
});

client.on('auth_failure', (msg) => {
  console.error('❌ Authentication failed:', msg);
  process.exit(1);
});

client.on('ready', async () => {
  console.log('🎉 WhatsApp Web client is ready!');
  
  try {
    const info = client.info;
    console.log(`📞 Connected as: ${info.pushname} (${info.wid.user})`);
    console.log('✅ Test completed successfully!');
  } catch (error) {
    console.log('ℹ️ Client info not available, but connection is ready');
  }
  
  await client.destroy();
  process.exit(0);
});

client.on('disconnected', (reason) => {
  console.error('❌ Client disconnected:', reason);
  process.exit(1);
});

client.on('change_state', (state) => {
  console.log(`🔄 State changed to: ${state}`);
});

// Add error handling
process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

console.log('🚀 Initializing WhatsApp Web client...');
console.log('⏰ This may take 2-3 minutes on first run');

// Set a 3-minute timeout
setTimeout(() => {
  console.error('❌ Initialization timeout after 3 minutes');
  console.log('\n🔧 Troubleshooting tips:');
  console.log('1. Try: export CHROME_PATH="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"');
  console.log('2. Check if Chrome is installed: ls "/Applications/Google Chrome.app"');
  console.log('3. Update whatsapp-web.js: npm update whatsapp-web.js');
  process.exit(1);
}, 180000);

client.initialize().catch(error => {
  console.error('❌ Initialization failed:', error.message);
  console.log('\n🔧 Possible solutions:');
  console.log('1. Update Chrome: brew install --cask google-chrome');
  console.log('2. Try different Chrome arguments');
  console.log('3. Check network connectivity');
  process.exit(1);
}); 