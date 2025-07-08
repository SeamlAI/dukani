import { Injectable, Logger } from '@nestjs/common';
import { GroqService } from '../groq/groq.service';
import { TavilyService, TavilySearchResponse } from '../tavily/tavily.service';
import { ProfileService, UserProfile } from '../profile/profile.service';

export interface AgentContext {
  userId: string;
  userMessage: string;
  conversationHistory?: string;
  userProfile?: UserProfile;
}

export interface AgentResponse {
  message: string;
  toolsUsed: string[];
  confidence: number;
}

export interface AgentTool {
  name: string;
  description: string;
  parameters: any;
  execute: (params: any, context: AgentContext) => Promise<any>;
}

@Injectable()
export class AgentService {
  private readonly logger = new Logger(AgentService.name);
  private tools: Map<string, AgentTool> = new Map();

  constructor(
    private readonly groqService: GroqService,
    private readonly tavilyService: TavilyService,
    private readonly profileService: ProfileService,
  ) {
    this.initializeTools();
  }

  private initializeTools(): void {
    // Search tool
    this.tools.set('search', {
      name: 'search',
      description: 'Search for information about hotels, flights, restaurants, or products',
      parameters: {
        type: 'object',
        properties: {
          query: { type: 'string', description: 'Search query' },
          category: { 
            type: 'string', 
            enum: ['hotels', 'flights', 'restaurants', 'products', 'general'],
            description: 'Category of search'
          },
          location: { type: 'string', description: 'Location for hotels/restaurants' },
          origin: { type: 'string', description: 'Origin for flights' },
          destination: { type: 'string', description: 'Destination for flights/hotels' },
          date: { type: 'string', description: 'Date for bookings' },
          budget: { type: 'string', description: 'Budget constraint' }
        },
        required: ['query']
      },
      execute: this.executeSearchTool.bind(this),
    });

    // Profile management tool
    this.tools.set('profile', {
      name: 'profile',
      description: 'Get or update user profile information',
      parameters: {
        type: 'object',
        properties: {
          action: { 
            type: 'string', 
            enum: ['get', 'update', 'add_favorite'],
            description: 'Action to perform'
          },
          updates: { type: 'object', description: 'Profile updates' },
          favoriteType: { 
            type: 'string', 
            enum: ['restaurants', 'hotels', 'destinations'],
            description: 'Type of favorite to add'
          },
          favoriteItem: { type: 'string', description: 'Favorite item to add' }
        },
        required: ['action']
      },
      execute: this.executeProfileTool.bind(this),
    });
  }

  private async executeSearchTool(params: any, context: AgentContext): Promise<TavilySearchResponse> {
    const { query, category, location, origin, destination, date, budget } = params;
    
    // Validate query before proceeding
    if (!query || typeof query !== 'string' || query.trim().length === 0) {
      this.logger.error('Invalid query provided to search tool', { query, params });
      throw new Error('Search query is required and cannot be empty');
    }
    
    this.logger.debug(`Executing search tool: ${category} - ${query}`);

    switch (category) {
      case 'hotels':
        return this.tavilyService.searchHotels(location || destination, date);
      case 'flights':
        return this.tavilyService.searchFlights(origin, destination, date);
      case 'restaurants':
        return this.tavilyService.searchRestaurants(location, params.cuisine);
      case 'products':
        return this.tavilyService.searchProducts(query, budget);
      default:
        return this.tavilyService.search({ query, maxResults: 5 });
    }
  }

  private async executeProfileTool(params: any, context: AgentContext): Promise<any> {
    const { action, updates, favoriteType, favoriteItem } = params;
    
    this.logger.debug(`Executing profile tool: ${action} for user ${context.userId}`);

    switch (action) {
      case 'get':
        return this.profileService.getUserSummary(context.userId);
      case 'update':
        return this.profileService.updateProfile(context.userId, updates);
      case 'add_favorite':
        await this.profileService.addFavorite(context.userId, favoriteType, favoriteItem);
        return { success: true, message: `Added ${favoriteItem} to ${favoriteType}` };
      default:
        throw new Error(`Unknown profile action: ${action}`);
    }
  }

  private async determineRequiredTools(userMessage: string): Promise<string[]> {
    const systemPrompt = `
You are a tool selection assistant. Based on the user's message, determine which tools should be used.

Available tools:
- search: Use for finding hotels, flights, restaurants, products, or general information
- profile: Use for getting/updating user preferences, adding favorites, or personalizing responses

Rules:
- Always use 'profile' first to understand the user
- Use 'search' for any request involving finding/booking/recommendations
- Return tools as a JSON array of strings
- Be concise

User message: "${userMessage}"

Respond ONLY with a JSON array like: ["profile", "search"] or ["profile"]
`;

    try {
      const response = await this.groqService.generateSystemPromptCompletion(systemPrompt, userMessage);
      const tools = JSON.parse(response.trim());
      return Array.isArray(tools) ? tools : [];
    } catch (error) {
      this.logger.warn('Error determining tools, using defaults', error);
      return ['profile', 'search']; // Default fallback
    }
  }

  private async executeToolsInSequence(tools: string[], context: AgentContext): Promise<Map<string, any>> {
    const results = new Map<string, any>();

    for (const toolName of tools) {
      const tool = this.tools.get(toolName);
      if (!tool) {
        this.logger.warn(`Tool ${toolName} not found`);
        continue;
      }

      try {
        let params: any = {};

        // Generate tool-specific parameters
        if (toolName === 'search') {
          params = await this.generateSearchParams(context.userMessage);
        } else if (toolName === 'profile') {
          params = { action: 'get' };
        }

        const result = await tool.execute(params, context);
        results.set(toolName, result);
        
        this.logger.debug(`Tool ${toolName} executed successfully`);
      } catch (error) {
        this.logger.error(`Error executing tool ${toolName}`, error);
        
        // Provide more specific error handling based on tool type
        if (toolName === 'search') {
          results.set(toolName, { 
            error: error.message,
            fallbackMessage: "I'm having trouble searching right now. Please try rephrasing your request or try again later."
          });
        } else {
          results.set(toolName, { error: error.message });
        }
      }
    }

    return results;
  }

  private async generateSearchParams(userMessage: string): Promise<any> {
    // Validate input
    if (!userMessage || typeof userMessage !== 'string' || userMessage.trim().length === 0) {
      this.logger.warn('Invalid or empty user message for search params');
      return {
        query: 'general search',
        category: 'general'
      };
    }

    const systemPrompt = `
Extract search parameters from the user message. Return ONLY a valid JSON object with relevant fields.

Possible fields:
- query: main search term
- category: hotels, flights, restaurants, products, or general
- location: city/place for hotels/restaurants
- origin: departure city for flights
- destination: arrival city for flights or hotel location
- date: specific date mentioned
- budget: budget constraints mentioned
- cuisine: cuisine type for restaurants

Message: "${userMessage}"

Return only valid JSON without any explanation or additional text:
`;

    try {
      const response = await this.groqService.generateSystemPromptCompletion(systemPrompt, userMessage);
      const cleanResponse = response.trim();
      
      // Try to extract JSON if the response contains extra text
      let jsonStr = cleanResponse;
      const jsonStart = cleanResponse.indexOf('{');
      const jsonEnd = cleanResponse.lastIndexOf('}');
      
      if (jsonStart !== -1 && jsonEnd !== -1 && jsonStart < jsonEnd) {
        jsonStr = cleanResponse.substring(jsonStart, jsonEnd + 1);
      }
      
      const parsedParams = JSON.parse(jsonStr);
      
      // Validate that we have a query
      if (!parsedParams.query || typeof parsedParams.query !== 'string' || parsedParams.query.trim().length === 0) {
        throw new Error('No valid query in parsed parameters');
      }
      
      return parsedParams;
    } catch (error) {
      this.logger.warn('Error parsing search params, using basic query', error.message);
      
      // Fallback: Create basic parameters based on message content
      const trimmedMessage = userMessage.trim();
      const fallbackParams: any = { 
        query: trimmedMessage, 
        category: 'general' 
      };
      
      // Simple keyword detection for better fallback
      const lowerMessage = trimmedMessage.toLowerCase();
      if (lowerMessage.includes('hotel') || lowerMessage.includes('stay')) {
        fallbackParams.category = 'hotels';
      } else if (lowerMessage.includes('flight') || lowerMessage.includes('fly')) {
        fallbackParams.category = 'flights';
      } else if (lowerMessage.includes('restaurant') || lowerMessage.includes('food') || lowerMessage.includes('pizza') || lowerMessage.includes('eat')) {
        fallbackParams.category = 'restaurants';
      } else if (lowerMessage.includes('buy') || lowerMessage.includes('shop') || lowerMessage.includes('product')) {
        fallbackParams.category = 'products';
      }
      
      return fallbackParams;
    }
  }

  async runAgentPrompt(userMessage: string, userId: string): Promise<AgentResponse> {
    try {
      this.logger.log(`Processing message for user ${userId}: ${userMessage}`);

      // Get user context
      const conversationHistory = await this.profileService.getConversationContext(userId, 3);
      const userProfile = await this.profileService.getProfile(userId);

      const context: AgentContext = {
        userId,
        userMessage,
        conversationHistory,
        userProfile,
      };

      // Determine required tools
      const requiredTools = await this.determineRequiredTools(userMessage);
      this.logger.debug(`Required tools: ${requiredTools.join(', ')}`);

      // Execute tools
      const toolResults = await this.executeToolsInSequence(requiredTools, context);

      // Generate final response
      const finalResponse = await this.generateFinalResponse(context, toolResults);

      // Save conversation
      await this.profileService.addConversationEntry(userId, userMessage, finalResponse.message);

      return {
        message: finalResponse.message,
        toolsUsed: requiredTools,
        confidence: finalResponse.confidence || 0.8,
      };
    } catch (error) {
      this.logger.error('Error in runAgentPrompt', error);
      throw new Error(`Agent processing failed: ${error.message}`);
    }
  }

  private async generateFinalResponse(context: AgentContext, toolResults: Map<string, any>): Promise<AgentResponse> {
    // Check if search tool failed and provide fallback response
    const searchResult = toolResults.get('search');
    if (searchResult && searchResult.error) {
      const fallbackMessage = searchResult.fallbackMessage || "I'm having trouble with my search capabilities right now.";
      
      this.logger.warn('Search tool failed, providing fallback response');
      return {
        message: `${fallbackMessage} 

I can still help you with general information or recommendations based on common preferences. What specific type of assistance are you looking for? 

🏨 Hotels
🍽️ Restaurants  
✈️ Flights
🛍️ Products

Please try asking your question in a different way, and I'll do my best to help!`,
        toolsUsed: Array.from(toolResults.keys()),
        confidence: 0.3,
      };
    }

    const systemPrompt = `
You are DukAnI, a helpful AI concierge assistant for WhatsApp. You help users with travel, dining, and shopping recommendations.

User Profile: ${context.userProfile ? await this.profileService.getUserSummary(context.userId) : 'New user'}

Conversation History:
${context.conversationHistory}

Tool Results:
${Array.from(toolResults.entries()).map(([tool, result]) => 
  `${tool}: ${typeof result === 'object' ? JSON.stringify(result, null, 2) : result}`
).join('\n\n')}

Instructions:
- Be helpful, friendly, and conversational
- Use the tool results to provide specific recommendations
- Personalize based on user profile if available
- If search results are available, summarize the top 2-3 options
- Keep responses concise but informative
- Use emojis appropriately
- If booking is requested, provide clear next steps
- If there are any errors in the tool results, acknowledge them gracefully

User Message: "${context.userMessage}"

Provide a helpful response:
`;

    try {
      const response = await this.groqService.generateSystemPromptCompletion(systemPrompt, context.userMessage);
      
      return {
        message: response,
        toolsUsed: Array.from(toolResults.keys()),
        confidence: 0.85,
      };
    } catch (error) {
      this.logger.error('Error generating final response', error);
      return {
        message: "I'm sorry, I'm having trouble processing your request right now. Please try again in a moment. 🤖",
        toolsUsed: [],
        confidence: 0.1,
      };
    }
  }

  // Placeholder methods for future enhancements
  async processComplexQuery(query: string, userId: string): Promise<AgentResponse> {
    // Future: Handle multi-step queries, planning, etc.
    return this.runAgentPrompt(query, userId);
  }

  async handleFollowUpQuestion(question: string, userId: string, previousContext?: any): Promise<AgentResponse> {
    // Future: Handle context-aware follow-up questions
    return this.runAgentPrompt(question, userId);
  }
} 