# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Accept build arguments for VITE environment variables
ARG VITE_AI_PROVIDER=anthropic
ARG VITE_ANTHROPIC_API_KEY=
ARG VITE_ANTHROPIC_MODEL=claude-sonnet-4-20250514
ARG VITE_OLLAMA_BASE_URL=http://localhost:11434
ARG VITE_OLLAMA_MODEL=llama3.2
ARG VITE_AI_MAX_TOKENS=4096
ARG VITE_AI_TEMPERATURE=0.7
ARG VITE_AI_TOP_P=0.9
ARG VITE_AI_TOP_K=40
ARG VITE_AI_REPEAT_PENALTY=1.1
ARG VITE_AI_MAX_RETRIES=3
ARG VITE_AI_RETRY_DELAY=1000
ARG VITE_AI_DEBUG=false
ARG VITE_LOGGING_ENABLED=true
ARG VITE_LOG_TO_CONSOLE=false
ARG VITE_MAX_LOG_ENTRIES=500
ARG VITE_N8N_WEBHOOK_URL=
ARG VITE_N8N_WEBHOOK_TOKEN=
ARG VITE_N8N_DEBUG=false
ARG VITE_N8N_CALLBACK_URL=

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy source code
COPY . .

# Build the application with VITE environment variables
RUN npm run build

# Production stage
FROM nginx:alpine AS production

# Copy custom nginx config
COPY nginx.conf /etc/nginx/nginx.conf

# Copy built assets from builder stage
COPY --from=builder /app/dist /usr/share/nginx/html

# Set proper permissions
RUN mkdir -p /etc/nginx/ssl && \
    chown -R nginx:nginx /usr/share/nginx/html /etc/nginx/ssl && \
    chmod 755 /etc/nginx/ssl

# Expose ports
EXPOSE 80 443

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider -O /dev/null http://127.0.0.1/health || exit 1

# Start nginx
CMD ["nginx", "-g", "daemon off;"]
