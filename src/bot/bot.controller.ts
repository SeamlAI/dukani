import { Controller, Get, Post, Body, Logger } from '@nestjs/common';
import { BotService } from './bot.service';

@Controller('bot')
export class BotController {
  private readonly logger = new Logger(BotController.name);

  constructor(private readonly botService: BotService) {}

  @Get('status')
  async getStatus(): Promise<any> {
    return this.botService.testConnection();
  }

  @Get('info')
  async getInfo(): Promise<any> {
    return this.botService.getClientInfo();
  }

  @Post('restart')
  async restart(): Promise<{ message: string }> {
    try {
      await this.botService.restartClient();
      return { message: 'WhatsApp client restarted successfully' };
    } catch (error) {
      this.logger.error('Error restarting client', error);
      throw error;
    }
  }

  @Post('send')
  async sendMessage(@Body() body: { phoneNumber: string; message: string }): Promise<{ message: string }> {
    try {
      await this.botService.sendMessageToContact(body.phoneNumber, body.message);
      return { message: 'Message sent successfully' };
    } catch (error) {
      this.logger.error('Error sending message', error);
      throw error;
    }
  }

  @Get('test')
  async test(): Promise<{ status: string; timestamp: string }> {
    // Admin/test method as per NestJS guidelines
    return {
      status: 'Bot module is working',
      timestamp: new Date().toISOString(),
    };
  }
} 