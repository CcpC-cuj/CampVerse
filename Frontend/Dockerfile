# Stage 1: Build
FROM node:20-alpine AS builder
WORKDIR /app

# Copy package files first for better layer caching
COPY package*.json ./

# Install dependencies with clean cache
RUN npm ci && \
    npm cache clean --force

# Copy source code
COPY . .

# Accept build-time env vars
ARG VITE_GOOGLE_CLIENT_ID
ARG VITE_API_URL

# Expose them so Vite bakes into bundle
ENV VITE_GOOGLE_CLIENT_ID=$VITE_GOOGLE_CLIENT_ID
ENV VITE_API_URL=$VITE_API_URL

# Run build
RUN npm run build

# Stage 2: Serve with optimized nginx
FROM nginx:alpine

# Remove default nginx config
RUN rm -rf /usr/share/nginx/html/*

# Copy built assets
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy nginx config
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

# Add healthcheck
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --quiet --tries=1 --spider http://localhost:80 || exit 1

CMD ["nginx", "-g", "daemon off;"] 