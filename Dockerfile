# Build stage
FROM node:18.20.5-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install all dependencies (including devDependencies for build)
RUN npm ci

# Copy source code
COPY . .

# Build the application
RUN npm run build

# Production stage
FROM node:18.20.5-alpine AS production

# Set working directory
WORKDIR /app

# Install system dependencies for WhatsApp Web (Chromium and dependencies)
RUN apk add --no-cache \
    chromium \
    nss \
    freetype \
    freetype-dev \
    harfbuzz \
    ca-certificates \
    ttf-freefont \
    font-noto-emoji \
    wqy-zenhei \
    dbus \
    dbus-x11 \
    xvfb \
    fontconfig \
    wget \
    curl \
    && rm -rf /var/cache/apk/*

# Create a non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S whatsapp -u 1001

# Tell Puppeteer to skip installing Chromium (we installed it manually)
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser \
    NODE_ENV=production \
    # Fly.io specific environment variables
    FLY_APP=true \
    # Chrome/Chromium environment variables for better stability
    CHROME_BIN=/usr/bin/chromium-browser \
    DISPLAY=:99 \
    # Reduced memory limits for Fly.io constraints
    NODE_OPTIONS="--max-old-space-size=512" \
    # Additional Chrome stability variables
    CHROME_NO_SANDBOX=true \
    CHROMIUM_FLAGS="--no-sandbox --disable-setuid-sandbox --disable-dev-shm-usage"

# Copy package files
COPY package*.json ./

# Install only production dependencies
RUN npm ci --only=production && npm cache clean --force

# Copy built application from builder stage
COPY --from=builder /app/dist ./dist

# Create directory for WhatsApp session and data
RUN mkdir -p /app/wa-session /app/data/profiles && \
    chown -R whatsapp:nodejs /app

# Switch to non-root user
USER whatsapp

# Expose port
EXPOSE 3000

# Health check for Fly.io - more robust and lenient
HEALTHCHECK --interval=45s --timeout=15s --start-period=120s --retries=3 \
    CMD curl --fail --silent --max-time 10 http://localhost:3000/api/health || exit 1

# Start the application
CMD ["npm", "run", "start:prod"] 