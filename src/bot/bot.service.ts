import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import makeWASocket, { 
  DisconnectReason, 
  useMultiFileAuthState, 
  WAMessageStubType,
  WAMessageUpdate,
  proto,
  isJidBroadcast,
  isJidStatusBroadcast,
  Browsers,
  delay
} from '@whiskeysockets/baileys';
import { Boom } from '@hapi/boom';
import * as QRCode from 'qrcode';
import P from 'pino';
import { AgentService } from '../agent/agent.service';

@Injectable()
export class BotService implements OnModuleInit {
  private readonly logger = new Logger(BotService.name);
  private sock: any;
  private isReady = false;
  private qrCodeData: string | null = null;

  constructor(
    private readonly configService: ConfigService,
    private readonly agentService: AgentService,
  ) {}

  async onModuleInit(): Promise<void> {
    // Initialize Baileys WhatsApp client asynchronously to not block application startup
    this.initializeBaileysClient().catch(error => {
      this.logger.error('Baileys WhatsApp client initialization failed, but app will continue running', error);
    });
  }

  private async initializeBaileysClient(): Promise<void> {
    try {
      this.logger.log('🟢 Initializing Baileys WhatsApp client...');

      const sessionPath = this.configService.get<string>('WA_SESSION_PATH', './wa-session');
      
      // Detect platform for logging
      const isFlyIo = !!(process.env.FLY_APP_NAME || process.env.FLY_ALLOC_ID);
      const isRailway = !!(process.env.RAILWAY_ENVIRONMENT || process.env.RAILWAY_PROJECT_ID);
      
      if (isFlyIo) this.logger.log('🪂 Detected Fly.io deployment - using optimized Baileys configuration');
      if (isRailway) this.logger.log('🚂 Detected Railway deployment');

      // Set up authentication state
      const { state, saveCreds } = await useMultiFileAuthState(sessionPath);

      // Create logger for Baileys (suppress verbose logs in production)
      const baileysLogger = P({ 
        level: process.env.NODE_ENV === 'production' ? 'silent' : 'info'
      });

      // Create socket with optimized configuration
      this.sock = makeWASocket({
        auth: state,
        logger: baileysLogger,
        printQRInTerminal: false, // We'll handle QR code ourselves
        browser: Browsers.macOS('Desktop'), // Appears as desktop WhatsApp
        connectTimeoutMs: 60000,
        defaultQueryTimeoutMs: 60000,
        keepAliveIntervalMs: 10000,
        // Optimize for server deployment
        emitOwnEvents: false,
        markOnlineOnConnect: true,
        syncFullHistory: false,
        shouldIgnoreJid: jid => isJidBroadcast(jid) || isJidStatusBroadcast(jid),
        shouldSyncHistoryMessage: () => false,
        getMessage: async (key) => {
          return {
            conversation: 'Hello from dukAnI!'
          }
        }
      });

      // Set up event handlers
      this.setupBaileysEventHandlers(saveCreds);

      this.logger.log('✅ Baileys client initialized - waiting for connection...');
    } catch (error) {
      this.logger.error('Failed to initialize Baileys client', error);
      this.isReady = false;
    }
  }

  private setupBaileysEventHandlers(saveCreds: () => Promise<void>): void {
    // Connection updates (QR code, connection status, etc.)
    this.sock.ev.on('connection.update', async (update) => {
      const { connection, lastDisconnect, qr } = update;

      if (qr) {
        this.logger.log('�� QR Code received - generating QR code...');
        this.qrCodeData = qr;
        
        try {
          // Generate QR code as text for console
          const qrCodeText = await QRCode.toString(qr, { type: 'terminal', small: true });
          console.log('\n📱 Scan this QR code with your WhatsApp mobile app:\n');
          console.log(qrCodeText);
          console.log('\n🔍 You can also access the QR code via API: GET /api/bot/qr\n');
        } catch (error) {
          this.logger.error('Error generating QR code:', error);
        }
      }

      if (connection === 'close') {
        const shouldReconnect = (lastDisconnect?.error as Boom)?.output?.statusCode !== DisconnectReason.loggedOut;
        this.logger.warn(`Connection closed due to ${lastDisconnect?.error}, reconnecting: ${shouldReconnect}`);
        
        this.isReady = false;
        
        if (shouldReconnect) {
          // Wait a bit before reconnecting
          await delay(5000);
          this.logger.log('🔄 Attempting to reconnect...');
          await this.initializeBaileysClient();
        }
      } else if (connection === 'open') {
        this.logger.log('🎉 WhatsApp connection opened successfully!');
        this.isReady = true;
        this.qrCodeData = null; // Clear QR code once connected
      }
    });

    // Credentials update (save auth state)
    this.sock.ev.on('creds.update', saveCreds);

    // Message handling
    this.sock.ev.on('messages.upsert', async (m) => {
      const message = m.messages[0];
      
      if (!message.message) return; // Ignore empty messages
      if (message.key.fromMe) return; // Ignore messages from ourselves
      if (m.type !== 'notify') return; // Only process new messages

      await this.handleIncomingMessage(message);
    });

    // Message updates (read receipts, etc.)
    this.sock.ev.on('messages.update', (updates: WAMessageUpdate[]) => {
      for (const { key, update } of updates) {
        if (update.pollUpdates && key.fromMe) {
          // Handle poll updates if needed
        }
      }
    });

    // Presence updates
    this.sock.ev.on('presence.update', ({ id, presences }) => {
      // Handle presence updates if needed
      this.logger.debug(`Presence update for ${id}:`, Object.keys(presences));
    });
  }

  private async handleIncomingMessage(message: any): Promise<void> {
    try {
      // Extract message content
      const messageContent = this.extractMessageContent(message);
      const fromJid = message.key.remoteJid;
      const contactId = this.extractContactId(fromJid);
      
      if (!messageContent || !fromJid) {
        return; // Skip invalid messages
      }

      // Skip group messages for now
      if (fromJid.endsWith('@g.us')) {
        this.logger.debug(`Skipping group message from ${fromJid}`);
        return;
      }

      this.logger.log(`📱 Received message from ${contactId}: ${messageContent}`);

      // Send typing indicator
      await this.sock.sendPresenceUpdate('composing', fromJid);

      // Process message with agent
      const agentResponse = await this.agentService.runAgentPrompt(messageContent, contactId);

      // Send response
      await this.sendMessage(fromJid, agentResponse.message);

      // Clear typing indicator
      await this.sock.sendPresenceUpdate('paused', fromJid);

      this.logger.log(`🤖 Sent response to ${contactId}: ${agentResponse.message}`);
    } catch (error) {
      this.logger.error('Error handling incoming message', error);
      
      // Send error message to user
      try {
        const fromJid = message.key.remoteJid;
        if (fromJid) {
          await this.sendMessage(fromJid, "I'm sorry, I'm having trouble right now. Please try again in a moment. 🤖");
        }
      } catch (sendError) {
        this.logger.error('Failed to send error message', sendError);
      }
    }
  }

  private extractMessageContent(message: any): string | null {
    const content = message.message;
    
    if (content.conversation) {
      return content.conversation;
    }
    
    if (content.extendedTextMessage?.text) {
      return content.extendedTextMessage.text;
    }
    
    if (content.imageMessage?.caption) {
      return content.imageMessage.caption;
    }
    
    if (content.videoMessage?.caption) {
      return content.videoMessage.caption;
    }
    
    // Add more message types as needed
    return null;
  }

  private extractContactId(jid: string): string {
    // Extract phone number from JID (e.g., "1234567890@s.whatsapp.net" -> "1234567890")
    return jid.split('@')[0];
  }

  async sendMessage(jid: string, message: string): Promise<void> {
    if (!this.isReady) {
      this.logger.warn('Baileys client is not ready');
      throw new Error('WhatsApp client is not ready');
    }

    try {
      await this.sock.sendMessage(jid, { text: message });
      this.logger.debug(`Message sent to ${jid}`);
    } catch (error) {
      this.logger.error(`Failed to send message to ${jid}`, error);
      throw error;
    }
  }

  async sendMessageToContact(phoneNumber: string, message: string): Promise<void> {
    const jid = `${phoneNumber}@s.whatsapp.net`;
    await this.sendMessage(jid, message);
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
    if (!this.isReady || !this.sock?.user) {
      return null;
    }

    try {
      return {
        phoneNumber: this.sock.user.id.split(':')[0],
        name: this.sock.user.name,
        platform: 'baileys',
        isReady: this.isReady,
      };
    } catch (error) {
      this.logger.error('Error getting client info', error);
      return null;
    }
  }

  async getQRCode(): Promise<string | null> {
    return this.qrCodeData;
  }

  async getQRCodeImage(): Promise<string | null> {
    if (!this.qrCodeData) {
      return null;
    }

    try {
      // Generate QR code as base64 data URL
      const qrCodeDataURL = await QRCode.toDataURL(this.qrCodeData, {
        width: 256,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        }
      });
      return qrCodeDataURL;
    } catch (error) {
      this.logger.error('Error generating QR code image:', error);
      return null;
    }
  }

  async restartClient(): Promise<void> {
    try {
      this.logger.log('🔄 Restarting Baileys client...');
      
      if (this.sock) {
        this.sock.end();
      }
      
      this.isReady = false;
      this.qrCodeData = null;
      
      // Wait a moment before reinitializing
      await delay(2000);
      await this.initializeBaileysClient();
    } catch (error) {
      this.logger.error('Error restarting client', error);
      throw error;
    }
  }

  async testConnection(): Promise<{ status: string; info?: any; qrAvailable?: boolean }> {
    try {
      if (!this.isReady) {
        return { 
          status: this.qrCodeData ? 'waiting_for_qr_scan' : 'not_ready',
          qrAvailable: !!this.qrCodeData
        };
      }

      const info = await this.getClientInfo();
      return { 
        status: 'ready', 
        info: {
          connected: true,
          phoneNumber: info?.phoneNumber,
          name: info?.name,
          platform: 'baileys'
        }
      };
    } catch (error) {
      return { status: 'error', info: { error: error.message } };
    }
  }
} 