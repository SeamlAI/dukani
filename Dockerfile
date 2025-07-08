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

# Install only essential system dependencies
RUN apk add --no-cache \
    curl \
    wget \
    && rm -rf /var/cache/apk/*

# Create a non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S whatsapp -u 1001

# Set environment variables for Baileys
ENV NODE_ENV=production \
    # Fly.io specific environment variables
    FLY_APP=true \
    # Reduced memory limits for Fly.io constraints
    NODE_OPTIONS="--max-old-space-size=512"

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

# Health check for Fly.io - simple and efficient
HEALTHCHECK --interval=45s --timeout=15s --start-period=60s --retries=3 \
    CMD curl --fail --silent --max-time 10 http://localhost:3000/api/health || exit 1

# Start the application
CMD ["npm", "run", "start:prod"] 