import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import fetch from 'node-fetch';

export interface TavilySearchRequest {
  query: string;
  searchDepth?: 'basic' | 'advanced';
  includeImages?: boolean;
  includeAnswer?: boolean;
  maxResults?: number;
  includeDomains?: string[];
  excludeDomains?: string[];
}

export interface TavilySearchResult {
  title: string;
  url: string;
  content: string;
  score: number;
  publishedDate?: string;
}

export interface TavilySearchResponse {
  answer?: string;
  query: string;
  responseTime: number;
  results: TavilySearchResult[];
  images?: string[];
}

@Injectable()
export class TavilyService {
  private readonly logger = new Logger(TavilyService.name);
  private readonly apiKey: string;
  private readonly baseUrl = 'https://api.tavily.com';

  constructor(private readonly configService: ConfigService) {
    const apiKey = this.configService.get<string>('TAVILY_API_KEY');
    if (!apiKey) {
      throw new Error('TAVILY_API_KEY is required');
    }
    this.apiKey = apiKey;
  }

  async search(request: TavilySearchRequest): Promise<TavilySearchResponse> {
    try {
      // Validate query
      if (!request.query || typeof request.query !== 'string' || request.query.trim().length === 0) {
        this.logger.error('Invalid or empty query provided to Tavily search', { query: request.query });
        throw new Error('Search query is required and cannot be empty');
      }

      this.logger.debug(`Searching for: ${request.query}`);
      
      const payload = {
        api_key: this.apiKey,
        query: request.query.trim(),
        search_depth: request.searchDepth || 'basic',
        include_images: request.includeImages || false,
        include_answer: request.includeAnswer || true,
        max_results: request.maxResults || 5,
        include_domains: request.includeDomains || [],
        exclude_domains: request.excludeDomains || [],
      };

      const response = await fetch(`${this.baseUrl}/search`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error(`Tavily API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json() as any;
      
      return {
        answer: data.answer,
        query: data.query,
        responseTime: data.response_time,
        results: data.results || [],
        images: data.images || [],
      };
    } catch (error) {
      this.logger.error('Error performing search', error);
      throw new Error(`Tavily search error: ${error.message}`);
    }
  }

  async searchHotels(location: string, checkIn?: string, checkOut?: string): Promise<TavilySearchResponse> {
    if (!location || typeof location !== 'string' || location.trim().length === 0) {
      throw new Error('Location is required for hotel search');
    }
    
    const query = `hotels in ${location.trim()}${checkIn ? ` check-in ${checkIn}` : ''}${checkOut ? ` check-out ${checkOut}` : ''}`;
    return this.search({
      query,
      searchDepth: 'advanced',
      maxResults: 10,
      includeDomains: ['booking.com', 'hotels.com', 'expedia.com', 'airbnb.com'],
    });
  }

  async searchFlights(origin: string, destination: string, departureDate?: string): Promise<TavilySearchResponse> {
    if (!origin || typeof origin !== 'string' || origin.trim().length === 0) {
      throw new Error('Origin is required for flight search');
    }
    if (!destination || typeof destination !== 'string' || destination.trim().length === 0) {
      throw new Error('Destination is required for flight search');
    }
    
    const query = `flights from ${origin.trim()} to ${destination.trim()}${departureDate ? ` on ${departureDate}` : ''}`;
    return this.search({
      query,
      searchDepth: 'advanced',
      maxResults: 10,
      includeDomains: ['kayak.com', 'expedia.com', 'skyscanner.com', 'google.com'],
    });
  }

  async searchRestaurants(location: string, cuisine?: string): Promise<TavilySearchResponse> {
    if (!location || typeof location !== 'string' || location.trim().length === 0) {
      throw new Error('Location is required for restaurant search');
    }
    
    const query = `${cuisine && cuisine.trim() ? cuisine.trim() + ' ' : ''}restaurants in ${location.trim()}`;
    return this.search({
      query,
      searchDepth: 'basic',
      maxResults: 8,
      includeDomains: ['yelp.com', 'tripadvisor.com', 'zomato.com', 'opentable.com'],
    });
  }

  async searchProducts(productName: string, budget?: string): Promise<TavilySearchResponse> {
    if (!productName || typeof productName !== 'string' || productName.trim().length === 0) {
      throw new Error('Product name is required for product search');
    }
    
    const query = `${productName.trim()}${budget && budget.trim() ? ` under ${budget.trim()}` : ''}`;
    return this.search({
      query,
      searchDepth: 'basic',
      maxResults: 10,
      includeDomains: ['amazon.com', 'ebay.com', 'walmart.com', 'target.com'],
    });
  }
} 