import { Controller, Get, Post, Logger } from '@nestjs/common';
import { BotDebugService } from './bot-debug.service';

@Controller('bot/debug')
export class BotDebugController {
  private readonly logger = new Logger(BotDebugController.name);

  constructor(private readonly botDebugService: BotDebugService) {}

  @Get('diagnostics')
  async runDiagnostics(): Promise<any> {
    this.logger.log('Running WhatsApp diagnostics...');
    return this.botDebugService.runDiagnostics();
  }

  @Post('initialize')
  async initializeWithDebug(): Promise<any> {
    this.logger.log('Initializing WhatsApp client with debugging...');
    return this.botDebugService.initializeWithDebug();
  }

  @Get('log')
  async getDebugLog(): Promise<any> {
    return {
      debugLog: this.botDebugService.getDebugLog(),
      timestamp: new Date(),
    };
  }

  @Post('save-log')
  async saveDebugLog(): Promise<{ logPath: string }> {
    const logPath = await this.botDebugService.saveDebugLog();
    return { logPath };
  }

  @Post('cleanup')
  async cleanupSession(): Promise<{ message: string }> {
    await this.botDebugService.cleanupSession();
    return { message: 'Session files cleaned up successfully' };
  }

  @Get('status')
  async getDebugStatus(): Promise<any> {
    return {
      isReady: this.botDebugService.isClientReady(),
      debugLogEntries: this.botDebugService.getDebugLog().length,
      timestamp: new Date(),
    };
  }
} 