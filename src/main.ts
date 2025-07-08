import { NestFactory } from '@nestjs/core';
import { Logger } from '@nestjs/common';
import { AppModule } from './app.module';
import 'dotenv/config';

async function bootstrap(): Promise<void> {
  const logger = new Logger('Bootstrap');
  
  try {
    const app = await NestFactory.create(AppModule, {
      logger: ['log', 'error', 'warn', 'debug', 'verbose'],
    });

    // Enable CORS for API endpoints
    app.enableCors();

    // Set global prefix for API routes
    app.setGlobalPrefix('api');

    const port = process.env.PORT || 3000;
    await app.listen(port);

    logger.log(`🚀 DukAnI WhatsApp Bot is running on: http://localhost:${port}`);
    logger.log(`📱 WhatsApp client will initialize automatically`);
    logger.log(`🔍 API endpoints available at: http://localhost:${port}/api`);
    logger.log(`📊 Bot status: http://localhost:${port}/api/bot/status`);
  } catch (error) {
    logger.error('Failed to start application', error);
    process.exit(1);
  }
}

bootstrap();
