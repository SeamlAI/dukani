# Railway Deployment Guide for dukAnI

## Prerequisites

1. **Node.js Compatibility**: The application now runs on Node.js 20+ (required by Baileys library)
2. **Environment Variables**: You'll need API keys for Groq and Tavily
3. **Railway Account**: Sign up at [railway.app](https://railway.app)

## Environment Variables

Set these in your Railway project dashboard:

```env
# Required API Keys
GROQ_API_KEY=your_groq_api_key_here
TAVILY_API_KEY=your_tavily_api_key_here

# App Configuration
NODE_ENV=production
PORT=3000

# WhatsApp Configuration (Railway-optimized for stability)
WA_SESSION_PATH=./wa-session
WA_CHROME_ARGS=--no-sandbox,--disable-setuid-sandbox,--disable-dev-shm-usage,--disable-gpu,--disable-software-rasterizer,--no-first-run,--no-zygote,--single-process,--disable-extensions,--disable-plugins,--disable-default-apps,--disable-background-timer-throttling,--disable-backgrounding-occluded-windows,--disable-renderer-backgrounding,--disable-features=TranslateUI,--disable-features=VizDisplayCompositor,--disable-ipc-flooding-protection,--memory-pressure-off,--max_old_space_size=256,--disable-web-security,--disable-sync,--disable-translate,--hide-scrollbars,--mute-audio,--disable-background-networking,--disable-background-sync,--disable-client-side-phishing-detection,--disable-sync-preferences,--disable-sync-app-settings
PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
```

## Deployment Steps

### 1. Connect Repository to Railway

1. Go to [railway.app](https://railway.app) and sign in
2. Click "New Project" → "Deploy from GitHub repo"
3. Select your dukAnI repository
4. Railway will automatically detect it's a Node.js project

### 2. Configure Environment Variables

1. In your Railway project dashboard, go to "Variables"
2. Add all the environment variables listed above
3. Make sure to get your API keys:
   - **Groq API Key**: [console.groq.com](https://console.groq.com)
   - **Tavily API Key**: [tavily.com](https://tavily.com)

### 3. Deploy

Railway will automatically deploy using the configuration files:
- `railway.json` - Railway-specific settings
- `nixpacks.toml` - Node.js 20 build configuration
- `.nvmrc` - Node.js version specification
- `package.json` - Dependencies and scripts

### Alternative: Docker Deployment

If Nixpacks continues to have issues, you can deploy using Docker:

1. In Railway dashboard, go to your project settings
2. Under "Deploy", change from "Nixpacks" to "Dockerfile"
3. Railway will use the included `Dockerfile` which guarantees Node.js 20.18.0

## WhatsApp Setup on Railway

### Important Notes:
1. **QR Code Access**: You'll need to check Railway logs to see the QR code for WhatsApp authentication
2. **Session Persistence**: WhatsApp session data will be stored in the container (temporary)
3. **Reconnection**: The bot will attempt to reconnect if the session expires

### Viewing QR Code:
1. Go to your Railway project dashboard
2. Click on "Deployments"
3. View the latest deployment logs
4. Look for the QR code in ASCII format
5. Scan with your WhatsApp mobile app

## File Structure for Railway

```
dukani/
├── src/                 # Application source code
├── dist/               # Built application (generated)
├── data/               # User profiles (generated)
├── wa-session/         # WhatsApp session (generated)
├── railway.json        # Railway configuration
├── nixpacks.toml       # Nixpacks build configuration (Node.js 18)
├── Dockerfile          # Docker configuration (backup deployment)
├── .nvmrc              # Node.js version specification
├── package.json        # Dependencies (Node.js 18 compatible)
└── env.example         # Environment template
```

## Troubleshooting

### Build Errors

**Error: Node.js version incompatibility**
- Solution: The package.json now specifies Node.js 18+ compatibility
- Railway uses Node.js 18 by default

**Error: Package lock file sync issues**
- Solution: package-lock.json has been regenerated with compatible versions
- Use `npm ci` instead of `npm install` in production

**Error: Nixpacks undefined variable 'npm'**
- Solution: Removed custom nixpacks.toml - Railway auto-detects Node.js projects
- Uses `.nvmrc` file to specify Node.js 18
- Let Railway handle the build process automatically

**Error: Health check failures**
- Solution: Fixed app to bind to `0.0.0.0` instead of `localhost` in production
- WhatsApp initialization moved to background to not block startup
- Added dedicated `/api/health` endpoint for Railway health checks
- Application starts even if WhatsApp fails to initialize

**Error: node-fetch ES Module compatibility**
- Solution: Downgraded node-fetch from v3.x to v2.7.0 (CommonJS compatible)
- Added @types/node-fetch for TypeScript support
- Fixed import statements to work with CommonJS builds

**Error: Wrong Node.js version (v22 instead of v18)**
- Solution: Created explicit nixpacks.toml with Node.js 18 specification
- Updated .nvmrc with specific version (18.20.5)
- Added Dockerfile as backup deployment method
- Set package.json engines to "node": "18.x"

**Error: "nest: not found" during Docker build**
- Solution: Multi-stage Docker build with devDependencies in build stage
- Install all dependencies for build, then only production for runtime
- Optimized nixpacks.toml to include devDependencies during build

### Runtime Errors

**WhatsApp Connection Issues:**
```bash
# Check Railway logs for:
curl https://your-railway-app.railway.app/api/bot/status
```

**Memory Issues:**
- Railway free tier has memory limits
- Consider upgrading if you see memory-related crashes
- Monitor usage in Railway dashboard

### API Endpoint Testing

Test your deployed bot:
```bash
# Health check
curl https://your-railway-app.railway.app/api

# Bot status
curl https://your-railway-app.railway.app/api/bot/status

# Send test message (replace with actual phone number)
curl -X POST https://your-railway-app.railway.app/api/bot/send \
  -H "Content-Type: application/json" \
  -d '{"phoneNumber": "1234567890", "message": "Test message"}'
```

## Railway-Specific Features

### Auto-Deployments
- Automatic deployments on git push to main/master branch
- View deployment history in Railway dashboard

### Scaling
- Railway automatically handles scaling
- Monitor resource usage in the dashboard

### Logs
- Real-time logs available in Railway dashboard
- Filter by date/time and log level

## Security Considerations

1. **API Keys**: Never commit API keys to git - use Railway environment variables
2. **Phone Numbers**: Be cautious with phone number handling in logs
3. **Session Data**: WhatsApp session data is temporarily stored in container

## Cost Considerations

- **Railway Free Tier**: Limited hours per month
- **Bandwidth**: Consider message volume
- **API Costs**: Groq and Tavily have their own pricing
- **Upgrade**: Consider Railway Pro for production use

## Support

If you encounter issues:
1. Check Railway deployment logs
2. Verify environment variables are set correctly
3. Test API endpoints individually
4. Check WhatsApp Web connection status

For Railway-specific support: [Railway Documentation](https://docs.railway.app) 