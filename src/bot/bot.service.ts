import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Client, LocalAuth, Message } from 'whatsapp-web.js';
import * as qrcode from 'qrcode-terminal';
import { AgentService } from '../agent/agent.service';

@Injectable()
export class BotService implements OnModuleInit {
  private readonly logger = new Logger(BotService.name);
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
      this.logger.log('Initializing WhatsApp Web client...');

      const sessionPath = this.configService.get<string>('WA_SESSION_PATH', './wa-session');
      const chromeArgs = this.configService.get<string>('WA_CHROME_ARGS', '--no-sandbox,--disable-setuid-sandbox');

      this.whatsappClient = new Client({
        authStrategy: new LocalAuth({
          dataPath: sessionPath,
        }),
        puppeteer: {
          args: chromeArgs.split(','),
          headless: true,
          timeout: 60000, // 60 second timeout
        },
      });

      this.setupEventHandlers();
      
      // Add timeout for initialization
      const initPromise = this.whatsappClient.initialize();
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('WhatsApp initialization timeout')), 120000); // 2 minute timeout
      });
      
      await Promise.race([initPromise, timeoutPromise]);
      this.logger.log('WhatsApp client initialization completed');
    } catch (error) {
      this.logger.error('Failed to initialize WhatsApp client', error);
      // Don't throw error to prevent app crash - just log it
      this.isReady = false;
    }
  }

  private setupEventHandlers(): void {
    this.whatsappClient.on('qr', (qr: string) => {
      this.logger.log('QR Code received. Please scan with your WhatsApp mobile app:');
      qrcode.generate(qr, { small: true });
      console.log('\nYou can also scan this QR code with your phone to connect WhatsApp Web.');
    });

    this.whatsappClient.on('ready', () => {
      this.logger.log('✅ WhatsApp Web client is ready!');
      this.isReady = true;
    });

    this.whatsappClient.on('authenticated', () => {
      this.logger.log('WhatsApp client authenticated successfully');
    });

    this.whatsappClient.on('auth_failure', (message) => {
      this.logger.error('WhatsApp authentication failed:', message);
    });

    this.whatsappClient.on('disconnected', (reason) => {
      this.logger.warn('WhatsApp client disconnected:', reason);
      this.isReady = false;
    });

    // Only listen to 'message' event to avoid duplicate processing
    this.whatsappClient.on('message', async (message: Message) => {
      // Handle messages sent to the bot (not from the bot)
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
    // Extract phone number from chat ID (e.g., "1234567890@c.us" -> "1234567890")
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

  async broadcastMessage(phoneNumbers: string[], message: string): Promise<void> {
    if (!this.isReady) {
      throw new Error('WhatsApp client is not ready');
    }

    const results = await Promise.allSettled(
      phoneNumbers.map(phone => this.sendMessageToContact(phone, message))
    );

    const successful = results.filter(r => r.status === 'fulfilled').length;
    const failed = results.filter(r => r.status === 'rejected').length;

    this.logger.log(`Broadcast complete: ${successful} successful, ${failed} failed`);
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

  // Admin/test method as per NestJS guidelines
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