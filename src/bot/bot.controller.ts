import { Controller, Get, Post, Body, Logger, Res } from '@nestjs/common';
import { Response } from 'express';
import { BotService } from './bot.service';

@Controller('bot')
export class BotController {
  private readonly logger = new Logger(BotController.name);

  constructor(private readonly botService: BotService) {}

  @Get('status')
  async getStatus(): Promise<any> {
    return this.botService.testConnection();
  }

  @Get('qr')
  async getQRCode(): Promise<{ qr: string | null; message: string }> {
    const qr = await this.botService.getQRCode();
    return {
      qr,
      message: qr 
        ? 'QR code available. Scan with your WhatsApp mobile app.' 
        : 'No QR code available. Client may already be connected.'
    };
  }

  @Get('qr/image')
  async getQRCodeImage(@Res() res: Response): Promise<void> {
    try {
      const qrDataURL = await this.botService.getQRCodeImage();
      
      if (!qrDataURL) {
        res.status(404).json({ 
          error: 'No QR code available',
          message: 'Client may already be connected or not initialized'
        });
        return;
      }

      // Extract base64 data and send as image
      const base64Data = qrDataURL.replace(/^data:image\/png;base64,/, '');
      const buffer = Buffer.from(base64Data, 'base64');
      
      res.setHeader('Content-Type', 'image/png');
      res.setHeader('Content-Length', buffer.length);
      res.send(buffer);
    } catch (error) {
      this.logger.error('Error serving QR code image', error);
      res.status(500).json({ error: 'Failed to generate QR code image' });
    }
  }

  @Get('info')
  async getInfo(): Promise<any> {
    return this.botService.getClientInfo();
  }

  @Post('restart')
  async restart(): Promise<{ message: string }> {
    try {
      await this.botService.restartClient();
      return { message: 'Baileys WhatsApp client restarted successfully' };
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
      status: 'Bot module is working with Baileys',
      timestamp: new Date().toISOString(),
    };
  }
} 