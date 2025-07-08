import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Client, LocalAuth, Message } from 'whatsapp-web.js';
import * as qrcode from 'qrcode-terminal';
import { AgentService } from '../agent/agent.service';

@Injectable()
export class BotServiceOptimized implements OnModuleInit {
  private readonly logger = new Logger(BotServiceOptimized.name);
  private whatsappClient: Client;
  private isReady = false;

  constructor(
    private readonly configService: ConfigService,
    private readonly agentService: AgentService,
  ) {}

  async onModuleInit(): Promise<void> {
    // Initialize WhatsApp client asynchronously to not block application startup
    this.initializeWhatsAppClient().catch(error => {
      this.logger.error('WhatsApp client initialization failed, but app will continue running', error);
    });
  }

  private async initializeWhatsAppClient(): Promise<void> {
    try {
      this.logger.log('Initializing WhatsApp Web client with optimized configuration...');

      const sessionPath = this.configService.get<string>('WA_SESSION_PATH', './wa-session');
      
      // Enhanced Chrome arguments specifically for macOS/production
      const optimizedChromeArgs = [
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

      // Allow custom Chrome args from environment but use optimized as default
      const customChromeArgs = this.configService.get<string>('WA_CHROME_ARGS');
      const chromeArgs = customChromeArgs ? customChromeArgs.split(',') : optimizedChromeArgs;

      this.logger.log(`Using ${chromeArgs.length} Chrome arguments for optimal compatibility`);

      this.whatsappClient = new Client({
        authStrategy: new LocalAuth({
          dataPath: sessionPath,
        }),
        puppeteer: {
          args: chromeArgs,
          headless: true,
          timeout: 90000, // 90 second timeout for browser launch
          devtools: false,
          // Use system Chrome if available (better for macOS)
          executablePath: process.env.CHROME_PATH || undefined,
        },
        // Use remote web version cache for better compatibility
        webVersionCache: {
          type: 'remote',
          remotePath: 'https://raw.githubusercontent.com/wppconnect-team/wa-version/main/html/2.2412.54.html',
        },
      });

      this.setupEventHandlers();
      
      // Initialize with optimized timeout handling
      this.logger.log('Starting WhatsApp client initialization...');
      
      const initPromise = this.whatsappClient.initialize();
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => {
          this.logger.error('WhatsApp initialization timeout after 3 minutes');
          reject(new Error('WhatsApp initialization timeout'));
        }, 180000); // 3 minute timeout (reduced from 5 minutes)
      });
      
      await Promise.race([initPromise, timeoutPromise]);
      this.logger.log('✅ WhatsApp client initialization completed successfully');
    } catch (error) {
      this.logger.error('Failed to initialize WhatsApp client', error);
      
      // Provide specific troubleshooting guidance
      if (error.message.includes('timeout')) {
        this.logger.error('🔧 Troubleshooting tips:');
        this.logger.error('1. Try setting CHROME_PATH to your system Chrome');
        this.logger.error('2. Update whatsapp-web.js: npm update whatsapp-web.js');
        this.logger.error('3. Clean session files: npm run debug:clean');
      }
      
      this.isReady = false;
    }
  }

  private setupEventHandlers(): void {
    this.whatsappClient.on('loading_screen', (percent, message) => {
      this.logger.debug(`Loading WhatsApp Web: ${percent}% - ${message}`);
    });

    this.whatsappClient.on('qr', (qr: string) => {
      this.logger.log('🔍 QR Code received. Please scan with your WhatsApp mobile app:');
      qrcode.generate(qr, { small: true });
      console.log('\n📱 You can also scan this QR code with your phone to connect WhatsApp Web.\n');
    });

    this.whatsappClient.on('ready', () => {
      this.logger.log('🎉 WhatsApp Web client is ready!');
      this.isReady = true;
    });

    this.whatsappClient.on('authenticated', () => {
      this.logger.log('✅ WhatsApp client authenticated successfully');
    });

    this.whatsappClient.on('auth_failure', (message) => {
      this.logger.error('❌ WhatsApp authentication failed:', message);
    });

    this.whatsappClient.on('disconnected', (reason) => {
      this.logger.warn(`⚠️ WhatsApp client disconnected: ${reason}`);
      this.isReady = false;
    });

    this.whatsappClient.on('change_state', (state) => {
      this.logger.debug(`State changed to: ${state}`);
    });

    // Handle incoming messages
    this.whatsappClient.on('message', async (message: Message) => {
      if (message.fromMe) {
        return;
      }

      await this.handleIncomingMessage(message);
    });
  }

  private async handleIncomingMessage(message: Message): Promise<void> {
    try {
      const messageBody = message.body?.trim();
      const chatId = message.from;
      const contactId = this.extractContactId(chatId);

      // Skip empty messages or media messages for now
      if (!messageBody || message.hasMedia) {
        return;
      }

      // Skip group messages for now (optional)
      const chat = await message.getChat();
      if (chat.isGroup) {
        this.logger.debug(`Skipping group message from ${chatId}`);
        return;
      }

      this.logger.log(`📱 Received message from ${contactId}: ${messageBody}`);

      // Show typing indicator
      await chat.sendStateTyping();

      // Process message with agent
      const agentResponse = await this.agentService.runAgentPrompt(messageBody, contactId);

      // Send response back
      await this.sendMessage(chatId, agentResponse.message);

      this.logger.log(`🤖 Sent response to ${contactId}: ${agentResponse.message}`);
    } catch (error) {
      this.logger.error('Error handling incoming message', error);
      
      // Send error message to user
      try {
        await this.sendMessage(message.from, "I'm sorry, I'm having trouble right now. Please try again in a moment. 🤖");
      } catch (sendError) {
        this.logger.error('Failed to send error message', sendError);
      }
    }
  }

  private extractContactId(chatId: string): string {
    return chatId.split('@')[0];
  }

  async sendMessage(chatId: string, message: string): Promise<void> {
    if (!this.isReady) {
      this.logger.warn('WhatsApp client is not ready');
      throw new Error('WhatsApp client is not ready');
    }

    try {
      await this.whatsappClient.sendMessage(chatId, message);
      this.logger.debug(`Message sent to ${chatId}`);
    } catch (error) {
      this.logger.error(`Failed to send message to ${chatId}`, error);
      throw error;
    }
  }

  async sendMessageToContact(phoneNumber: string, message: string): Promise<void> {
    const chatId = `${phoneNumber}@c.us`;
    await this.sendMessage(chatId, message);
  }

  isClientReady(): boolean {
    return this.isReady;
  }

  async getClientInfo(): Promise<any> {
    if (!this.isReady) {
      return null;
    }

    try {
      const info = this.whatsappClient.info;
      return {
        phoneNumber: info?.wid?.user,
        name: info?.pushname,
        platform: info?.platform,
        isReady: this.isReady,
      };
    } catch (error) {
      this.logger.error('Error getting client info', error);
      return null;
    }
  }

  async restartClient(): Promise<void> {
    try {
      this.logger.log('Restarting WhatsApp client...');
      
      if (this.whatsappClient) {
        await this.whatsappClient.destroy();
      }
      
      this.isReady = false;
      await this.initializeWhatsAppClient();
    } catch (error) {
      this.logger.error('Error restarting client', error);
      throw error;
    }
  }

  async testConnection(): Promise<{ status: string; info?: any }> {
    try {
      if (!this.isReady) {
        return { status: 'not_ready' };
      }

      const info = await this.getClientInfo();
      return { 
        status: 'ready', 
        info: {
          connected: true,
          phoneNumber: info?.phoneNumber,
          name: info?.name,
        }
      };
    } catch (error) {
      return { status: 'error', info: { error: error.message } };
    }
  }
} 