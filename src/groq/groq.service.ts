import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Groq from 'groq-sdk';

export interface GroqCompletionRequest {
  messages: Array<{
    role: 'system' | 'user' | 'assistant';
    content: string;
  }>;
  model?: string;
  temperature?: number;
  maxTokens?: number;
}

export interface GroqCompletionResponse {
  content: string;
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

@Injectable()
export class GroqService {
  private readonly logger = new Logger(GroqService.name);
  private readonly groqClient: Groq;

  constructor(private readonly configService: ConfigService) {
    const apiKey = this.configService.get<string>('GROQ_API_KEY');
    if (!apiKey) {
      throw new Error('GROQ_API_KEY is required');
    }
    
    this.groqClient = new Groq({
      apiKey: apiKey,
    });
  }

  async generateCompletion(request: GroqCompletionRequest): Promise<GroqCompletionResponse> {
    try {
      this.logger.debug(`Generating completion with ${request.messages.length} messages`);
      
      const completion = await this.groqClient.chat.completions.create({
        model: request.model || 'llama3-8b-8192',
        messages: request.messages,
        temperature: request.temperature || 0.7,
        max_tokens: request.maxTokens || 1024,
      });

      const content = completion.choices[0]?.message?.content || '';
      
      return {
        content,
        usage: {
          promptTokens: completion.usage?.prompt_tokens || 0,
          completionTokens: completion.usage?.completion_tokens || 0,
          totalTokens: completion.usage?.total_tokens || 0,
        },
      };
    } catch (error) {
      this.logger.error('Error generating completion', error);
      throw new Error(`Groq API error: ${error.message}`);
    }
  }

  async generateSystemPromptCompletion(systemPrompt: string, userMessage: string): Promise<string> {
    const response = await this.generateCompletion({
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userMessage },
      ],
    });
    
    return response.content;
  }
} 