import { NestFactory } from '@nestjs/core';
import { Logger } from '@nestjs/common';
import { AppModule } from './app.module';
import 'dotenv/config';

async function bootstrap(): Promise<void> {
  const logger = new Logger('Bootstrap');
  
  // Set NODE_ENV to production if not set and we're likely in production
  if (!process.env.NODE_ENV && (process.env.RAILWAY_ENVIRONMENT || process.env.PORT || process.env.FLY_APP_NAME)) {
    process.env.NODE_ENV = 'production';
  }
  
  logger.log('🚀 Starting dukAnI application...');
  logger.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  logger.log(`Port: ${process.env.PORT || 3000}`);
  
  // Detect deployment platform
  const isRailway = !!(process.env.RAILWAY_ENVIRONMENT || process.env.RAILWAY_PROJECT_ID);
  const isFlyIo = !!(process.env.FLY_APP_NAME || process.env.FLY_ALLOC_ID);
  const isProduction = process.env.NODE_ENV === 'production';
  
  if (isRailway) logger.log('🚂 Detected Railway deployment');
  if (isFlyIo) logger.log('🪂 Detected Fly.io deployment');
  
  try {
    const app = await NestFactory.create(AppModule, {
      logger: ['log', 'error', 'warn', 'debug', 'verbose'],
    });

    // Enable CORS for API endpoints
    app.enableCors();

    // Set global prefix for API routes
    app.setGlobalPrefix('api');

    const port = process.env.PORT || 3000;
    
    // Always bind to 0.0.0.0 in production or containerized environments
    const host = (isProduction || isRailway || isFlyIo) ? '0.0.0.0' : 'localhost';
    
    logger.log(`🌐 Binding to host: ${host}:${port}`);
    
    await app.listen(port, host);

    logger.log(`🚀 DukAnI WhatsApp Bot is running on: http://${host}:${port}`);
    logger.log(`📱 WhatsApp client will initialize automatically`);
    logger.log(`🔍 API endpoints available at: http://${host}:${port}/api`);
    logger.log(`📊 Bot status: http://${host}:${port}/api/bot/status`);
  } catch (error) {
    logger.error('Failed to start application', error);
    process.exit(1);
  }
}

bootstrap();
