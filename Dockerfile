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
    # Additional dependencies for better Chromium stability
    dbus \
    dbus-x11 \
    xvfb \
    # Font dependencies
    fontconfig \
    # Process management
    procps \
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
    # Memory and process limits for container
    NODE_OPTIONS="--max-old-space-size=1024"

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

# Health check for Fly.io
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:3000/api/health || exit 1

# Start the application
CMD ["npm", "run", "start:prod"] 