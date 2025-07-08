import { Module } from '@nestjs/common';
import { GroqModule } from '../groq/groq.module';
import { TavilyModule } from '../tavily/tavily.module';
import { ProfileModule } from '../profile/profile.module';
import { AgentService } from './agent.service';

@Module({
  imports: [GroqModule, TavilyModule, ProfileModule],
  providers: [AgentService],
  exports: [AgentService],
})
export class AgentModule {} 