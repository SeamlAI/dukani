<p align="center">
  <a href="http://nestjs.com/" target="blank"><img src="https://nestjs.com/img/logo-small.svg" width="120" alt="Nest Logo" /></a>
</p>

[circleci-image]: https://img.shields.io/circleci/build/github/nestjs/nest/master?token=abc123def456
[circleci-url]: https://circleci.com/gh/nestjs/nest

  <p align="center">A progressive <a href="http://nodejs.org" target="_blank">Node.js</a> framework for building efficient and scalable server-side applications.</p>
    <p align="center">
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/v/@nestjs/core.svg" alt="NPM Version" /></a>
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/l/@nestjs/core.svg" alt="Package License" /></a>
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/dm/@nestjs/common.svg" alt="NPM Downloads" /></a>
<a href="https://circleci.com/gh/nestjs/nest" target="_blank"><img src="https://img.shields.io/circleci/build/github/nestjs/nest/master" alt="CircleCI" /></a>
<a href="https://discord.gg/G7Qnnhy" target="_blank"><img src="https://img.shields.io/badge/discord-online-brightgreen.svg" alt="Discord"/></a>
<a href="https://opencollective.com/nest#backer" target="_blank"><img src="https://opencollective.com/nest/backers/badge.svg" alt="Backers on Open Collective" /></a>
<a href="https://opencollective.com/nest#sponsor" target="_blank"><img src="https://opencollective.com/nest/sponsors/badge.svg" alt="Sponsors on Open Collective" /></a>
  <a href="https://paypal.me/kamilmysliwiec" target="_blank"><img src="https://img.shields.io/badge/Donate-PayPal-ff3f59.svg" alt="Donate us"/></a>
    <a href="https://opencollective.com/nest#sponsor"  target="_blank"><img src="https://img.shields.io/badge/Support%20us-Open%20Collective-41B883.svg" alt="Support us"></a>
  <a href="https://twitter.com/nestframework" target="_blank"><img src="https://img.shields.io/twitter/follow/nestframework.svg?style=social&label=Follow" alt="Follow us on Twitter"></a>
</p>
  <!--[![Backers on Open Collective](https://opencollective.com/nest/backers/badge.svg)](https://opencollective.com/nest#backer)
  [![Sponsors on Open Collective](https://opencollective.com/nest/sponsors/badge.svg)](https://opencollective.com/nest#sponsor)-->

## Description

[Nest](https://github.com/nestjs/nest) framework TypeScript starter repository.

## Project setup

```bash
$ npm install
```

## Compile and run the project

```bash
# development
$ npm run start

# watch mode
$ npm run start:dev

# production mode
$ npm run start:prod
```

## Run tests

```bash
# unit tests
$ npm run test

# e2e tests
$ npm run test:e2e

# test coverage
$ npm run test:cov
```

## Deployment

When you're ready to deploy your NestJS application to production, there are some key steps you can take to ensure it runs as efficiently as possible. Check out the [deployment documentation](https://docs.nestjs.com/deployment) for more information.

If you are looking for a cloud-based platform to deploy your NestJS application, check out [Mau](https://mau.nestjs.com), our official platform for deploying NestJS applications on AWS. Mau makes deployment straightforward and fast, requiring just a few simple steps:

```bash
$ npm install -g @nestjs/mau
$ mau deploy
```

With Mau, you can deploy your application in just a few clicks, allowing you to focus on building features rather than managing infrastructure.

## Resources

Check out a few resources that may come in handy when working with NestJS:

- Visit the [NestJS Documentation](https://docs.nestjs.com) to learn more about the framework.
- For questions and support, please visit our [Discord channel](https://discord.gg/G7Qnnhy).
- To dive deeper and get more hands-on experience, check out our official video [courses](https://courses.nestjs.com/).
- Deploy your application to AWS with the help of [NestJS Mau](https://mau.nestjs.com) in just a few clicks.
- Visualize your application graph and interact with the NestJS application in real-time using [NestJS Devtools](https://devtools.nestjs.com).
- Need help with your project (part-time to full-time)? Check out our official [enterprise support](https://enterprise.nestjs.com).
- To stay in the loop and get updates, follow us on [X](https://x.com/nestframework) and [LinkedIn](https://linkedin.com/company/nestjs).
- Looking for a job, or have a job to offer? Check out our official [Jobs board](https://jobs.nestjs.com).

## Support

Nest is an MIT-licensed open source project. It can grow thanks to the sponsors and support by the amazing backers. If you'd like to join them, please [read more here](https://docs.nestjs.com/support).

## Stay in touch

- Author - [Kamil Myśliwiec](https://twitter.com/kammysliwiec)
- Website - [https://nestjs.com](https://nestjs.com/)
- Twitter - [@nestframework](https://twitter.com/nestframework)

## License

Nest is [MIT licensed](https://github.com/nestjs/nest/blob/master/LICENSE).

# DukAnI - AI-Powered WhatsApp Concierge Bot

DukAnI is an intelligent WhatsApp concierge bot that helps users with travel, dining, and shopping recommendations using AI-powered search and personalized user profiles.

## 🏗️ Architecture

The application follows a modular NestJS architecture with the following components:

- **Bot Module**: Handles WhatsApp messaging using `whatsapp-web.js`
- **Agent Module**: Processes messages using LangChain-style tool orchestration
- **Groq Module**: Integrates with Groq API for LLaMA 3 completions
- **Tavily Module**: Provides search capabilities for hotels, flights, restaurants, and products
- **Profile Module**: Manages user memory and preferences with JSON-based storage

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ 
- npm or yarn
- WhatsApp account for QR code scanning

### 1. Install Dependencies

```bash
npm install
```

### 2. Set Up Environment Variables

Create a `.env` file in the root directory:

```env
# API Keys
GROQ_API_KEY=your_groq_api_key_here
TAVILY_API_KEY=your_tavily_api_key_here

# App Configuration
PORT=3000
NODE_ENV=development

# WhatsApp Web Configuration
WA_SESSION_PATH=./wa-session
WA_CHROME_ARGS=--no-sandbox,--disable-setuid-sandbox
```

### 3. Get API Keys

- **Groq API Key**: Sign up at [https://console.groq.com](https://console.groq.com)
- **Tavily API Key**: Sign up at [https://tavily.com](https://tavily.com)

### 4. Run the Application

```bash
# Development mode
npm run start:dev

# Production mode
npm run build
npm run start:prod
```

### 5. Connect WhatsApp

1. When the app starts, a QR code will be displayed in the terminal
2. Open WhatsApp on your phone → Linked Devices → Link a Device
3. Scan the QR code with your phone
4. The bot will be ready to receive messages!

## 📱 Message Flow

```
WhatsApp Message → Bot Service → Agent Service → Tools (Tavily/Profile) → Groq LLM → Response
```

### Example Conversations

**Hotel Search:**
```
User: "Find me a hotel in Mombasa for next weekend"
Bot: 🏨 Here are some great hotels in Mombasa for your weekend trip:
     
     1. Serena Beach Resort & Spa - Luxury beachfront resort
     2. Voyager Beach Resort - Family-friendly with great amenities
     3. Bamburi Beach Hotel - Budget-friendly option
     
     Would you like me to help you with booking details?
```

**Restaurant Recommendations:**
```
User: "I want Italian food in Nairobi"
Bot: 🍝 Here are top Italian restaurants in Nairobi:
     
     1. Mediterraneo - Authentic Italian cuisine
     2. About Thyme - Modern Italian with local twist
     3. Artcaffe - Casual Italian favorites
     
     Based on your previous preferences, I'd recommend About Thyme! 
```

## 🛠️ API Endpoints

The bot exposes several admin endpoints:

- `GET /api/bot/status` - Check WhatsApp connection status
- `GET /api/bot/info` - Get connected WhatsApp account info
- `POST /api/bot/restart` - Restart WhatsApp client
- `POST /api/bot/send` - Send message to specific phone number
- `GET /api/bot/test` - Health check endpoint

## 🔧 Development

### Project Structure

```
src/
├── bot/           # WhatsApp client and message handling
├── agent/         # AI agent with tool orchestration
├── groq/          # Groq API service for LLM
├── tavily/        # Search service integration
├── profile/       # User memory and preferences
├── app.module.ts  # Main application module
└── main.ts        # Application entry point
```

### Adding New Tools

To add a new tool to the agent:

1. Create the tool in `agent.service.ts`:
```typescript
this.tools.set('newTool', {
  name: 'newTool',
  description: 'Description of what the tool does',
  parameters: { /* tool schema */ },
  execute: this.executeNewTool.bind(this),
});
```

2. Implement the execution method:
```typescript
private async executeNewTool(params: any, context: AgentContext): Promise<any> {
  // Tool implementation
}
```

### Testing

```bash
# Unit tests
npm run test

# E2E tests
npm run test:e2e

# Test coverage
npm run test:cov
```

## 📊 User Profiles

The bot automatically creates and maintains user profiles with:

- **Personal Info**: Name, location, budget preferences
- **Preferences**: Cuisine types, hotel preferences, travel class
- **Favorites**: Saved restaurants, hotels, destinations
- **Conversation History**: Recent interactions for context

Profiles are stored as JSON files in `data/profiles/`.

## 🔒 Security Notes

- Keep API keys secure and never commit them to version control
- The bot currently works only in private chats (group messages are ignored)
- WhatsApp session data is stored locally in the configured session path

## 🚧 Roadmap

- [ ] Database integration (PostgreSQL/MongoDB)
- [ ] Advanced conversation memory
- [ ] Multi-language support
- [ ] Voice message handling
- [ ] Booking integration APIs
- [ ] Admin dashboard
- [ ] Analytics and metrics

## 📝 License

This project is licensed under the UNLICENSED license.

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch
3. Follow TypeScript and NestJS best practices
4. Add tests for new functionality
5. Submit a pull request

## 📞 Support

For support, please check the bot status endpoint or review the application logs for debugging information.


Kindly use the baileys branch.
