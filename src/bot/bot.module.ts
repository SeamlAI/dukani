import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AgentModule } from '../agent/agent.module';
import { BotService } from './bot.service';
import { BotController } from './bot.controller';
import { BotDebugService } from './bot-debug.service';
import { BotDebugController } from './bot-debug.controller';

@Module({
  imports: [ConfigModule, AgentModule],
  controllers: [BotController, BotDebugController],
  providers: [BotService, BotDebugService],
  exports: [BotService, BotDebugService],
})
export class BotModule {} 