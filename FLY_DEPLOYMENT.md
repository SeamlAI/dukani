# Fly.io Deployment Guide for dukAnI

## Prerequisites

1. **Install Fly.io CLI**: 
   ```bash
   # macOS
   brew install flyctl
   
   # Or download from https://fly.io/docs/hands-on/install-flyctl/
   ```

2. **Login to Fly.io**:
   ```bash
   flyctl auth login
   ```

3. **API Keys**: You'll need Groq and Tavily API keys

## Initial Setup

### 1. Create Fly.io App (if not already done)
```bash
# If you haven't created the app yet
flyctl apps create dukani --generate-name
```

### 2. Create Volume for WhatsApp Session Data
```bash
# Create persistent volume for WhatsApp session data
flyctl volumes create wa_session_data --size 1 --region jnb
```

### 3. Set Environment Variables
```bash
# Set your API keys
flyctl secrets set GROQ_API_KEY=your_groq_api_key_here
flyctl secrets set TAVILY_API_KEY=your_tavily_api_key_here

# The following are already set in fly.toml, but you can override if needed:
# flyctl secrets set NODE_ENV=production
# flyctl secrets set PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
```

## Deployment

### 1. Deploy the Application
```bash
# Deploy from project root
flyctl deploy

# Or if you need to specify the app name
flyctl deploy --app dukani
```

### 2. Monitor Deployment
```bash
# Check deployment status
flyctl status

# View logs (very important for WhatsApp QR code)
flyctl logs

# Open the app in browser to test
flyctl open
```

## WhatsApp Setup on Fly.io

### 1. Access QR Code
```bash
# Watch logs for QR code
flyctl logs --follow

# Look for ASCII QR code in the logs
# It will appear when WhatsApp client initializes
```

### 2. Scan QR Code
1. Open WhatsApp on your phone
2. Go to **Settings** → **Linked Devices** → **Link a Device**
3. Scan the QR code from the Fly.io logs
4. Wait for "WhatsApp Web client is ready!" message

### 3. Test Connection
```bash
# Test the API endpoint
curl https://dukani.fly.dev/api/health

# Check bot status
curl https://dukani.fly.dev/api/bot/status
```

## Troubleshooting

### Connection Issues

If you see "instance refused connection" errors:

1. **Check host binding** (already fixed in the code):
   ```bash
   flyctl logs | grep "Binding to host"
   # Should show: Binding to host: 0.0.0.0:3000
   ```

2. **Verify app is running**:
   ```bash
   flyctl status
   ```

### WhatsApp Chrome Issues

If WhatsApp fails to initialize:

1. **Check memory usage**:
   ```bash
   flyctl metrics
   ```

2. **Restart the app**:
   ```bash
   flyctl machine restart
   ```

3. **Scale up resources if needed**:
   ```bash
   # Increase memory to 2GB if 1GB isn't enough
   flyctl scale memory 2048
   ```

### Session Persistence Issues

If WhatsApp session doesn't persist:

1. **Check volume is mounted**:
   ```bash
   flyctl volumes list
   ```

2. **Verify mount in logs**:
   ```bash
   flyctl logs | grep "session"
   ```

## Useful Commands

```bash
# View app information
flyctl info

# Scale the app
flyctl scale count 1
flyctl scale memory 1024

# Access app shell (for debugging)
flyctl ssh console

# View metrics
flyctl metrics

# Restart app
flyctl machine restart

# View secrets (masked)
flyctl secrets list

# Remove app (careful!)
flyctl apps destroy dukani
```

## Environment Variables Reference

Fly.io will automatically set these from `fly.toml`:
- `NODE_ENV=production`
- `PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true`

You need to set these manually:
- `GROQ_API_KEY`
- `TAVILY_API_KEY`

## Resource Requirements

- **Memory**: 1GB minimum (2GB recommended for heavy usage)
- **CPU**: 2 shared CPUs (adequate for most use cases)
- **Storage**: 1GB volume for WhatsApp session data

## Cost Estimation

- **Hobby Plan**: ~$5-10/month for basic usage
- **Volume Storage**: ~$0.15/GB/month
- **Bandwidth**: Usually included in plan

## Health Checks

The app includes health checks at `/api/health` which Fly.io monitors every 30 seconds.

## Scaling Considerations

1. **Single Instance**: WhatsApp Web allows only one session per phone number
2. **Auto-scaling**: Disabled to maintain session consistency
3. **Manual Scaling**: Use `flyctl scale count 1` to ensure single instance

## Support

If you encounter issues:

1. Check Fly.io logs: `flyctl logs`
2. Test health endpoint: `curl https://your-app.fly.dev/api/health`
3. Check bot status: `curl https://your-app.fly.dev/api/bot/status`
4. Review Fly.io documentation: https://fly.io/docs/

## Security Notes

- API keys are stored as encrypted secrets
- WhatsApp session data is stored on persistent volume
- HTTPS is enforced by default
- No data is transmitted outside of necessary API calls 