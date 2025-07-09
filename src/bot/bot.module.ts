import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AgentModule } from '../agent/agent.module';
import { BotService } from './bot.service';
import { BotController } from './bot.controller';

@Module({
  imports: [ConfigModule, AgentModule],
  controllers: [BotController],
  providers: [BotService],
  exports: [BotService],
})
export class BotModule {} 