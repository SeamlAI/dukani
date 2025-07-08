import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Client, LocalAuth, Message } from 'whatsapp-web.js';
import * as qrcode from 'qrcode-terminal';
import * as fs from 'fs';
import * as path from 'path';

interface DebugInfo {
  step: string;
  timestamp: Date;
  status: 'start' | 'progress' | 'success' | 'error';
  message?: string;
  error?: any;
  details?: any;
}

@Injectable()
export class BotDebugService {
  private readonly logger = new Logger(BotDebugService.name);
  private whatsappClient: Client;
  private isReady = false;
  private debugLog: DebugInfo[] = [];

  constructor(private readonly configService: ConfigService) {}

  private addDebugLog(step: string, status: DebugInfo['status'], message?: string, error?: any, details?: any): void {
    const debugInfo: DebugInfo = {
      step,
      timestamp: new Date(),
      status,
      message,
      error: error ? { message: error.message, stack: error.stack } : undefined,
      details,
    };
    
    this.debugLog.push(debugInfo);
    
    const logMessage = `[${step}] ${status.toUpperCase()}: ${message || ''}`;
    
    switch (status) {
      case 'start':
        this.logger.log(logMessage);
        break;
      case 'progress':
        this.logger.debug(logMessage);
        break;
      case 'success':
        this.logger.log(`✅ ${logMessage}`);
        break;
      case 'error':
        this.logger.error(`❌ ${logMessage}`, error);
        break;
    }
  }

  async runDiagnostics(): Promise<{ success: boolean; issues: string[]; debugLog: DebugInfo[] }> {
    this.addDebugLog('diagnostics', 'start', 'Starting WhatsApp client diagnostics');
    const issues: string[] = [];

    try {
      // Check Node.js version
      this.addDebugLog('node-version', 'progress', `Node.js version: ${process.version}`);
      const nodeVersionMatch = process.version.match(/v(\d+)\.(\d+)/);
      if (nodeVersionMatch) {
        const majorVersion = parseInt(nodeVersionMatch[1]);
        if (majorVersion < 18) {
          issues.push(`Node.js version ${process.version} is too old. Minimum required: 18.x`);
        }
      }

      // Check environment variables
      this.addDebugLog('env-check', 'start', 'Checking environment variables');
      const sessionPath = this.configService.get<string>('WA_SESSION_PATH', './wa-session');
      const chromeArgs = this.configService.get<string>('WA_CHROME_ARGS', '--no-sandbox,--disable-setuid-sandbox');
      
      this.addDebugLog('env-check', 'progress', 'Environment variables found', null, {
        sessionPath,
        chromeArgs,
        nodeEnv: process.env.NODE_ENV,
      });

      // Check session directory
      this.addDebugLog('session-dir', 'start', 'Checking session directory');
      try {
        if (!fs.existsSync(sessionPath)) {
          this.addDebugLog('session-dir', 'progress', 'Creating session directory');
          fs.mkdirSync(sessionPath, { recursive: true });
        }
        
        // Check permissions
        const stats = fs.statSync(sessionPath);
        if (!stats.isDirectory()) {
          issues.push(`Session path ${sessionPath} is not a directory`);
        }
        
        // Try to write a test file
        const testFile = path.join(sessionPath, 'test-write-permissions.txt');
        fs.writeFileSync(testFile, 'test');
        fs.unlinkSync(testFile);
        
        this.addDebugLog('session-dir', 'success', 'Session directory is accessible and writable');
      } catch (error) {
        issues.push(`Session directory issue: ${error.message}`);
        this.addDebugLog('session-dir', 'error', 'Session directory check failed', error);
      }

      // Check Chrome/Puppeteer availability
      this.addDebugLog('chrome-check', 'start', 'Testing Chrome/Puppeteer availability');
      try {
        const puppeteer = require('puppeteer');
        this.addDebugLog('chrome-check', 'progress', 'Puppeteer module loaded');
        
        // Test launching a browser instance
        const browser = await puppeteer.launch({
          headless: true,
          args: chromeArgs.split(','),
          timeout: 30000,
        });
        
        const pages = await browser.pages();
        this.addDebugLog('chrome-check', 'success', `Chrome launched successfully. Pages: ${pages.length}`);
        await browser.close();
      } catch (error) {
        issues.push(`Chrome/Puppeteer issue: ${error.message}`);
        this.addDebugLog('chrome-check', 'error', 'Chrome/Puppeteer test failed', error);
      }

      // Test network connectivity
      this.addDebugLog('network-check', 'start', 'Testing network connectivity');
      try {
        const fetch = require('node-fetch');
        const response = await fetch('https://web.whatsapp.com', { 
          timeout: 10000,
          method: 'HEAD',
        });
        
        this.addDebugLog('network-check', 'success', `WhatsApp Web accessible. Status: ${response.status}`);
      } catch (error) {
        issues.push(`Network connectivity issue: ${error.message}`);
        this.addDebugLog('network-check', 'error', 'Network connectivity test failed', error);
      }

      // Check for existing session files
      this.addDebugLog('session-files', 'start', 'Checking existing session files');
      try {
        const sessionFiles = fs.readdirSync(sessionPath);
        this.addDebugLog('session-files', 'progress', `Found ${sessionFiles.length} files in session directory`, null, {
          files: sessionFiles,
        });
        
        if (sessionFiles.length > 0) {
          this.addDebugLog('session-files', 'progress', 'Existing session found - will attempt to reuse');
        } else {
          this.addDebugLog('session-files', 'progress', 'No existing session - will need QR code scan');
        }
      } catch (error) {
        this.addDebugLog('session-files', 'error', 'Failed to read session directory', error);
      }

      const success = issues.length === 0;
      this.addDebugLog('diagnostics', success ? 'success' : 'error', 
        `Diagnostics completed. Issues found: ${issues.length}`);

      return { success, issues, debugLog: this.debugLog };
    } catch (error) {
      this.addDebugLog('diagnostics', 'error', 'Diagnostics failed', error);
      return { success: false, issues: [`Diagnostics failed: ${error.message}`], debugLog: this.debugLog };
    }
  }

  async initializeWithDebug(): Promise<{ success: boolean; debugLog: DebugInfo[] }> {
    this.debugLog = []; // Reset debug log
    this.addDebugLog('init', 'start', 'Starting WhatsApp client initialization with debugging');

    try {
      // Run diagnostics first
      const diagnostics = await this.runDiagnostics();
      if (!diagnostics.success) {
        this.addDebugLog('init', 'error', 'Diagnostics failed, aborting initialization');
        return { success: false, debugLog: this.debugLog };
      }

      // Get configuration
      const sessionPath = this.configService.get<string>('WA_SESSION_PATH', './wa-session');
      const chromeArgs = this.configService.get<string>('WA_CHROME_ARGS', '--no-sandbox,--disable-setuid-sandbox');
      
      // Enhanced Chrome arguments for better compatibility
      const enhancedChromeArgs = [
        ...chromeArgs.split(','),
        '--disable-web-security',
        '--disable-features=VizDisplayCompositor',
        '--disable-extensions',
        '--disable-plugins',
        '--disable-dev-shm-usage',
        '--disable-gpu',
        '--no-first-run',
        '--disable-default-apps',
        '--disable-backgrounding-occluded-windows',
        '--disable-renderer-backgrounding',
        '--disable-background-timer-throttling',
        '--disable-ipc-flooding-protection',
        '--single-process', // Try single process mode
      ].filter(arg => arg.trim()); // Remove empty args

      this.addDebugLog('config', 'progress', 'Configuration loaded', null, {
        sessionPath,
        chromeArgsCount: enhancedChromeArgs.length,
        chromeArgs: enhancedChromeArgs,
      });

      // Create WhatsApp client with enhanced configuration
      this.addDebugLog('client-create', 'start', 'Creating WhatsApp client instance');
      
      this.whatsappClient = new Client({
        authStrategy: new LocalAuth({
          dataPath: sessionPath,
        }),
        puppeteer: {
          args: enhancedChromeArgs,
          headless: true,
          timeout: 90000, // 90 second timeout
          devtools: false,
          ignoreDefaultArgs: ['--disable-extensions'],
          executablePath: process.env.CHROME_PATH || undefined, // Allow custom Chrome path
        },
        webVersionCache: {
          type: 'remote',
          remotePath: 'https://raw.githubusercontent.com/wppconnect-team/wa-version/main/html/2.2412.54.html',
        },
      });

      this.addDebugLog('client-create', 'success', 'WhatsApp client instance created');

      // Setup enhanced event handlers
      this.setupDebugEventHandlers();

      // Initialize with detailed timeout tracking
      this.addDebugLog('client-init', 'start', 'Starting client initialization');
      
      const initPromise = this.whatsappClient.initialize();
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => {
          this.addDebugLog('client-init', 'error', 'Initialization timeout after 5 minutes');
          reject(new Error('WhatsApp initialization timeout'));
        }, 300000); // 5 minute timeout
      });

      await Promise.race([initPromise, timeoutPromise]);
      
      this.addDebugLog('init', 'success', 'WhatsApp client initialized successfully');
      return { success: true, debugLog: this.debugLog };

    } catch (error) {
      this.addDebugLog('init', 'error', 'Initialization failed', error);
      return { success: false, debugLog: this.debugLog };
    }
  }

  private setupDebugEventHandlers(): void {
    this.addDebugLog('events', 'start', 'Setting up event handlers');

    this.whatsappClient.on('loading_screen', (percent, message) => {
      this.addDebugLog('loading', 'progress', `Loading: ${percent}% - ${message}`);
    });

    this.whatsappClient.on('qr', (qr: string) => {
      this.addDebugLog('qr', 'progress', 'QR Code received');
      this.logger.log('QR Code received. Please scan with your WhatsApp mobile app:');
      qrcode.generate(qr, { small: true });
      console.log('\nYou can also scan this QR code with your phone to connect WhatsApp Web.');
    });

    this.whatsappClient.on('authenticated', () => {
      this.addDebugLog('auth', 'success', 'Authentication successful');
    });

    this.whatsappClient.on('auth_failure', (message) => {
      this.addDebugLog('auth', 'error', 'Authentication failed', null, { reason: message });
    });

    this.whatsappClient.on('ready', () => {
      this.addDebugLog('ready', 'success', 'Client is ready');
      this.isReady = true;
    });

    this.whatsappClient.on('disconnected', (reason) => {
      this.addDebugLog('disconnect', 'error', `Client disconnected: ${reason}`);
      this.isReady = false;
    });

    this.whatsappClient.on('change_state', (state) => {
      this.addDebugLog('state', 'progress', `State changed to: ${state}`);
    });

    // Catch any other events for debugging
    const originalEmit = this.whatsappClient.emit;
    this.whatsappClient.emit = function(eventName, ...args) {
      const eventNameStr = String(eventName);
      if (!['message', 'message_create', 'message_ack'].includes(eventNameStr)) {
        console.log(`[DEBUG] Event: ${eventNameStr}`, args.length > 0 ? args[0] : '');
      }
      return originalEmit.apply(this, [eventName, ...args]);
    };
  }

  getDebugLog(): DebugInfo[] {
    return this.debugLog;
  }

  async saveDebugLog(): Promise<string> {
    const logPath = path.join(process.cwd(), 'whatsapp-debug.json');
    const debugData = {
      timestamp: new Date(),
      nodeVersion: process.version,
      platform: process.platform,
      architecture: process.arch,
      environment: process.env.NODE_ENV,
      debugLog: this.debugLog,
    };
    
    fs.writeFileSync(logPath, JSON.stringify(debugData, null, 2));
    this.addDebugLog('debug-save', 'success', `Debug log saved to ${logPath}`);
    return logPath;
  }

  async cleanupSession(): Promise<void> {
    this.addDebugLog('cleanup', 'start', 'Cleaning up session files');
    
    try {
      const sessionPath = this.configService.get<string>('WA_SESSION_PATH', './wa-session');
      if (fs.existsSync(sessionPath)) {
        fs.rmSync(sessionPath, { recursive: true, force: true });
        this.addDebugLog('cleanup', 'success', 'Session files cleaned up');
      }
    } catch (error) {
      this.addDebugLog('cleanup', 'error', 'Failed to cleanup session files', error);
    }
  }

  isClientReady(): boolean {
    return this.isReady;
  }
} 