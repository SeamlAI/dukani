import { Injectable, Logger } from '@nestjs/common';
import { promises as fs } from 'fs';
import { join } from 'path';

export interface UserProfile {
  userId: string;
  name?: string;
  city?: string;
  budget?: string;
  preferences: {
    cuisine?: string[];
    hotelType?: string;
    travelClass?: string;
    dietary?: string[];
  };
  favorites: {
    restaurants?: string[];
    hotels?: string[];
    destinations?: string[];
  };
  conversationHistory: Array<{
    timestamp: Date;
    userMessage: string;
    botResponse: string;
  }>;
  createdAt: Date;
  updatedAt: Date;
}

@Injectable()
export class ProfileService {
  private readonly logger = new Logger(ProfileService.name);
  private readonly profilesDir = join(process.cwd(), 'data', 'profiles');

  constructor() {
    this.ensureProfilesDirectory();
  }

  private async ensureProfilesDirectory(): Promise<void> {
    try {
      await fs.mkdir(this.profilesDir, { recursive: true });
    } catch (error) {
      this.logger.error('Error creating profiles directory', error);
    }
  }

  private getProfilePath(userId: string): string {
    return join(this.profilesDir, `${userId}.json`);
  }

  async getProfile(userId: string): Promise<UserProfile> {
    try {
      const profilePath = this.getProfilePath(userId);
      const profileData = await fs.readFile(profilePath, 'utf8');
      const profile = JSON.parse(profileData);
      
      // Convert string dates back to Date objects
      profile.createdAt = new Date(profile.createdAt);
      profile.updatedAt = new Date(profile.updatedAt);
      profile.conversationHistory = profile.conversationHistory.map((entry: any) => ({
        ...entry,
        timestamp: new Date(entry.timestamp),
      }));
      
      return profile;
    } catch (error) {
      if (error.code === 'ENOENT') {
        // Profile doesn't exist, create a new one
        return this.createProfile(userId);
      }
      this.logger.error(`Error reading profile for user ${userId}`, error);
      throw new Error(`Failed to read user profile: ${error.message}`);
    }
  }

  async createProfile(userId: string): Promise<UserProfile> {
    const newProfile: UserProfile = {
      userId,
      preferences: {},
      favorites: {},
      conversationHistory: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await this.saveProfile(newProfile);
    this.logger.log(`Created new profile for user ${userId}`);
    return newProfile;
  }

  async saveProfile(profile: UserProfile): Promise<void> {
    try {
      profile.updatedAt = new Date();
      const profilePath = this.getProfilePath(profile.userId);
      await fs.writeFile(profilePath, JSON.stringify(profile, null, 2), 'utf8');
      this.logger.debug(`Saved profile for user ${profile.userId}`);
    } catch (error) {
      this.logger.error(`Error saving profile for user ${profile.userId}`, error);
      throw new Error(`Failed to save user profile: ${error.message}`);
    }
  }

  async updateProfile(userId: string, updates: Partial<UserProfile>): Promise<UserProfile> {
    const profile = await this.getProfile(userId);
    const updatedProfile = {
      ...profile,
      ...updates,
      userId, // Ensure userId doesn't get overwritten
      updatedAt: new Date(),
    };
    
    await this.saveProfile(updatedProfile);
    return updatedProfile;
  }

  async addConversationEntry(userId: string, userMessage: string, botResponse: string): Promise<void> {
    const profile = await this.getProfile(userId);
    
    profile.conversationHistory.push({
      timestamp: new Date(),
      userMessage,
      botResponse,
    });

    // Keep only the last 50 conversation entries to prevent file from growing too large
    if (profile.conversationHistory.length > 50) {
      profile.conversationHistory = profile.conversationHistory.slice(-50);
    }

    await this.saveProfile(profile);
  }

  async addFavorite(userId: string, type: 'restaurants' | 'hotels' | 'destinations', item: string): Promise<void> {
    const profile = await this.getProfile(userId);
    
    if (!profile.favorites[type]) {
      profile.favorites[type] = [];
    }
    
    if (!profile.favorites[type].includes(item)) {
      profile.favorites[type].push(item);
    }

    await this.saveProfile(profile);
  }

  async updatePreferences(userId: string, preferences: Partial<UserProfile['preferences']>): Promise<void> {
    const profile = await this.getProfile(userId);
    profile.preferences = {
      ...profile.preferences,
      ...preferences,
    };
    
    await this.saveProfile(profile);
  }

  async getConversationContext(userId: string, maxEntries: number = 5): Promise<string> {
    const profile = await this.getProfile(userId);
    const recentConversations = profile.conversationHistory.slice(-maxEntries);
    
    if (recentConversations.length === 0) {
      return 'No previous conversation history.';
    }

    const context = recentConversations
      .map(entry => `User: ${entry.userMessage}\nBot: ${entry.botResponse}`)
      .join('\n\n');
      
    return `Recent conversation history:\n${context}`;
  }

  async getUserSummary(userId: string): Promise<string> {
    const profile = await this.getProfile(userId);
    
    const parts: string[] = [];
    
    if (profile.name) {
      parts.push(`Name: ${profile.name}`);
    }
    
    if (profile.city) {
      parts.push(`Location: ${profile.city}`);
    }
    
    if (profile.budget) {
      parts.push(`Budget: ${profile.budget}`);
    }
    
    if (Object.keys(profile.preferences).length > 0) {
      const prefs = Object.entries(profile.preferences)
        .filter(([, value]) => value && (Array.isArray(value) ? value.length > 0 : true))
        .map(([key, value]) => `${key}: ${Array.isArray(value) ? value.join(', ') : value}`)
        .join(', ');
      
      if (prefs) {
        parts.push(`Preferences: ${prefs}`);
      }
    }
    
    if (Object.keys(profile.favorites).length > 0) {
      const favs = Object.entries(profile.favorites)
        .filter(([, value]) => value && value.length > 0)
        .map(([key, value]) => `${key}: ${value.join(', ')}`)
        .join(', ');
        
      if (favs) {
        parts.push(`Favorites: ${favs}`);
      }
    }
    
    return parts.length > 0 ? parts.join(' | ') : 'No user information available.';
  }
} 