#!/usr/bin/env node

/**
 * WhatsApp Client Debug Script
 * 
 * This script helps diagnose WhatsApp Web initialization issues
 * Run with: node debug-whatsapp.js
 */

const fs = require('fs');
const path = require('path');
require('dotenv').config();

class WhatsAppDebugger {
  constructor() {
    this.debugLog = [];
  }

  log(step, status, message, error = null, details = null) {
    const entry = {
      step,
      timestamp: new Date().toISOString(),
      status,
      message,
      error: error ? { message: error.message, stack: error.stack } : null,
      details,
    };
    
    this.debugLog.push(entry);
    
    const symbols = {
      start: '🚀',
      progress: '⏳',
      success: '✅',
      error: '❌',
    };
    
    const symbol = symbols[status] || 'ℹ️';
    console.log(`${symbol} [${step}] ${message || ''}`);
    
    if (error) {
      console.error(`   Error: ${error.message}`);
    }
    
    if (details) {
      console.log(`   Details:`, details);
    }
  }

  async checkSystemRequirements() {
    this.log('system', 'start', 'Checking system requirements');

    // Node.js version
    const nodeVersion = process.version;
    this.log('node', 'progress', `Node.js version: ${nodeVersion}`);
    
    const majorVersion = parseInt(nodeVersion.match(/v(\d+)/)[1]);
    if (majorVersion < 18) {
      this.log('node', 'error', `Node.js ${nodeVersion} is too old. Minimum required: 18.x`);
      return false;
    }

    // Platform info
    this.log('platform', 'progress', `Platform: ${process.platform} ${process.arch}`);

    // Check required modules
    const requiredModules = ['whatsapp-web.js', 'puppeteer', 'qrcode-terminal'];
    
    for (const module of requiredModules) {
      try {
        require.resolve(module);
        this.log('module', 'progress', `Module ${module} is available`);
      } catch (error) {
        this.log('module', 'error', `Module ${module} is missing`, error);
        return false;
      }
    }

    this.log('system', 'success', 'System requirements check passed');
    return true;
  }

  async checkEnvironment() {
    this.log('env', 'start', 'Checking environment configuration');

    const sessionPath = process.env.WA_SESSION_PATH || './wa-session';
    const chromeArgs = process.env.WA_CHROME_ARGS || '--no-sandbox,--disable-setuid-sandbox';

    this.log('env', 'progress', 'Environment variables', null, {
      sessionPath,
      chromeArgs,
      nodeEnv: process.env.NODE_ENV,
    });

    // Check session directory
    try {
      if (!fs.existsSync(sessionPath)) {
        fs.mkdirSync(sessionPath, { recursive: true });
        this.log('session', 'progress', `Created session directory: ${sessionPath}`);
      }

      // Test write permissions
      const testFile = path.join(sessionPath, 'test-write.txt');
      fs.writeFileSync(testFile, 'test');
      fs.unlinkSync(testFile);
      
      this.log('session', 'success', 'Session directory is writable');
    } catch (error) {
      this.log('session', 'error', 'Session directory issue', error);
      return false;
    }

    return true;
  }

  async testPuppeteer() {
    this.log('puppeteer', 'start', 'Testing Puppeteer/Chrome');

    try {
      const puppeteer = require('puppeteer');
      const chromeArgs = (process.env.WA_CHROME_ARGS || '--no-sandbox,--disable-setuid-sandbox').split(',');

      this.log('puppeteer', 'progress', 'Launching Chrome browser');
      
      const browser = await puppeteer.launch({
        headless: true,
        args: chromeArgs,
        timeout: 30000,
      });

      const version = await browser.version();
      this.log('puppeteer', 'progress', `Chrome version: ${version}`);

      const pages = await browser.pages();
      this.log('puppeteer', 'progress', `Browser pages: ${pages.length}`);

      await browser.close();
      this.log('puppeteer', 'success', 'Puppeteer test passed');
      return true;
    } catch (error) {
      this.log('puppeteer', 'error', 'Puppeteer test failed', error);
      return false;
    }
  }

  async testNetwork() {
    this.log('network', 'start', 'Testing network connectivity');

    try {
      const fetch = require('node-fetch');
      
      const response = await fetch('https://web.whatsapp.com', {
        method: 'HEAD',
        timeout: 10000,
      });

      this.log('network', 'success', `WhatsApp Web accessible (Status: ${response.status})`);
      return true;
    } catch (error) {
      this.log('network', 'error', 'Network connectivity failed', error);
      return false;
    }
  }

  async testWhatsAppClient() {
    this.log('whatsapp', 'start', 'Testing WhatsApp Web client initialization');

    try {
      const { Client, LocalAuth } = require('whatsapp-web.js');
      const qrcode = require('qrcode-terminal');

      const sessionPath = process.env.WA_SESSION_PATH || './wa-session';
      const chromeArgs = (process.env.WA_CHROME_ARGS || '--no-sandbox,--disable-setuid-sandbox').split(',');

      // Enhanced Chrome args for better compatibility
      const enhancedArgs = [
        ...chromeArgs,
        '--disable-web-security',
        '--disable-features=VizDisplayCompositor',
        '--disable-extensions',
        '--disable-plugins',
        '--disable-dev-shm-usage',
        '--disable-gpu',
        '--no-first-run',
        '--disable-default-apps',
      ].filter(arg => arg.trim());

      this.log('whatsapp', 'progress', `Using ${enhancedArgs.length} Chrome arguments`);

      const client = new Client({
        authStrategy: new LocalAuth({
          dataPath: sessionPath,
        }),
        puppeteer: {
          args: enhancedArgs,
          headless: true,
          timeout: 60000,
        },
        webVersionCache: {
          type: 'remote',
          remotePath: 'https://raw.githubusercontent.com/wppconnect-team/wa-version/main/html/2.2412.54.html',
        },
      });

      // Set up event handlers
      client.on('qr', (qr) => {
        this.log('whatsapp', 'progress', 'QR Code received');
        qrcode.generate(qr, { small: true });
        console.log('\n📱 Scan this QR code with WhatsApp on your phone\n');
      });

      client.on('loading_screen', (percent, message) => {
        this.log('whatsapp', 'progress', `Loading: ${percent}% - ${message}`);
      });

      client.on('authenticated', () => {
        this.log('whatsapp', 'success', 'Authentication successful');
      });

      client.on('auth_failure', (msg) => {
        this.log('whatsapp', 'error', 'Authentication failed', new Error(msg));
      });

      client.on('ready', () => {
        this.log('whatsapp', 'success', 'WhatsApp client is ready!');
      });

      client.on('disconnected', (reason) => {
        this.log('whatsapp', 'error', `Client disconnected: ${reason}`);
      });

      this.log('whatsapp', 'progress', 'Initializing WhatsApp client...');
      
      // Initialize with timeout
      const initPromise = client.initialize();
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Initialization timeout (5 minutes)')), 300000);
      });

      await Promise.race([initPromise, timeoutPromise]);
      
      this.log('whatsapp', 'success', 'WhatsApp client initialized successfully!');
      
      // Clean up
      await client.destroy();
      return true;
    } catch (error) {
      this.log('whatsapp', 'error', 'WhatsApp client test failed', error);
      return false;
    }
  }

  async saveReport() {
    const reportPath = path.join(process.cwd(), 'whatsapp-debug-report.json');
    const report = {
      timestamp: new Date().toISOString(),
      nodeVersion: process.version,
      platform: process.platform,
      architecture: process.arch,
      environment: process.env.NODE_ENV,
      debugLog: this.debugLog,
    };

    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    this.log('report', 'success', `Debug report saved to: ${reportPath}`);
    return reportPath;
  }

  async runFullDiagnostics() {
    console.log('🔍 WhatsApp Web Client Diagnostic Tool\n');

    const checks = [
      { name: 'System Requirements', fn: () => this.checkSystemRequirements() },
      { name: 'Environment', fn: () => this.checkEnvironment() },
      { name: 'Puppeteer/Chrome', fn: () => this.testPuppeteer() },
      { name: 'Network Connectivity', fn: () => this.testNetwork() },
      { name: 'WhatsApp Client', fn: () => this.testWhatsAppClient() },
    ];

    let allPassed = true;

    for (const check of checks) {
      console.log(`\n--- ${check.name} ---`);
      try {
        const result = await check.fn();
        if (!result) {
          allPassed = false;
        }
      } catch (error) {
        this.log(check.name.toLowerCase(), 'error', 'Check failed', error);
        allPassed = false;
      }
    }

    console.log('\n--- Summary ---');
    if (allPassed) {
      this.log('summary', 'success', 'All diagnostic checks passed! 🎉');
    } else {
      this.log('summary', 'error', 'Some diagnostic checks failed. Check the report for details.');
    }

    await this.saveReport();
    
    return allPassed;
  }
}

// Run diagnostics if script is executed directly
if (require.main === module) {
  const diagnosticTool = new WhatsAppDebugger();
  
  diagnosticTool.runFullDiagnostics()
    .then((success) => {
      process.exit(success ? 0 : 1);
    })
    .catch((error) => {
      console.error('Diagnostic tool failed:', error);
      process.exit(1);
    });
}

module.exports = WhatsAppDebugger; 