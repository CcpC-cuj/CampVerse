# Multi-stage build for smaller production image
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files first for better layer caching
COPY package*.json ./

# Install ALL dependencies (including dev) for potential build steps
RUN npm ci

# Production stage
FROM node:20-alpine AS production

# Install curl for healthcheck
RUN apk add --no-cache curl

# Create non-root user (Hugging Face requires UID 1000)
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1000 -G nodejs

WORKDIR /app

# Copy only production dependencies
COPY package*.json ./
RUN npm ci --only=production && \
    npm cache clean --force

# Copy application code
COPY --chown=nodejs:nodejs . .

# Switch to non-root user
USER nodejs

# Expose port (HF Spaces MUST listen on 7860)
ENV PORT=7860
EXPOSE 7860

# Health check (HF handles this, but good to keep)
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD curl -f http://localhost:7860/health || exit 1

# Start the application
CMD ["node", "app.js"]

