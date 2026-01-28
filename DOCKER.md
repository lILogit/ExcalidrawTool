# ExcaliDraw AI Agent - Docker Deployment Guide

This guide explains how to deploy the ExcaliDraw AI Agent using Docker and Docker Compose.

## Prerequisites

- Docker Engine 20.10+
- Docker Compose 2.0+
- At least 1GB RAM available
- (Optional) NVIDIA GPU for Ollama with GPU support

## Quick Start

### 1. Clone the Repository

```bash
git clone <repository-url>
cd ExcalidrawTool
```

### 2. Configure Environment Variables

Copy the Docker Compose environment template and configure it:

```bash
cp .env.docker-compose .env
```

Edit `.env` and set at minimum:
- `VITE_ANTHROPIC_API_KEY` - Your Anthropic API key (required if using Anthropic)

### 3. Start the Application

```bash
# Using Docker Compose
docker-compose up -d

# Or use the Makefile
make up
```

The application will be available at: `http://localhost:8080`

## Docker Compose Files

### `docker-compose.yml` (Development/Full)
Full configuration with optional services (Ollama, N8N, Redis).

**Features:**
- Excalidraw AI Agent app
- Optional Ollama service (commented by default)
- Optional N8N service (commented by default)
- Optional Redis service (commented by default)
- Health checks enabled
- Volume persistence for data

### `docker-compose.prod.yml` (Production)
Production-optimized configuration.

**Features:**
- Only essential services
- Always restart policy
- Resource limits
- Log rotation
- Health checks
- Optimized for cloud deployment

## Environment Variables

All environment variables are documented in `.env.docker-compose`. Key variables:

### Required
- `VITE_ANTHROPIC_API_KEY` - Anthropic API key (or configure Ollama)

### Optional
- `VITE_AI_PROVIDER` - AI provider to use (anthropic or ollama)
- `VITE_AI_TEMPERATURE` - Controls AI response randomness
- `VITE_N8N_WEBHOOK_URL` - N8N webhook URL for integration
- See `.env.docker-compose` for full list

## Deployment Options

### Option 1: Using Anthropic Claude (Recommended)

1. Set your API key in `.env`:
```bash
VITE_ANTHROPIC_API_KEY=sk-ant-xxxxx
```

2. Start the service:
```bash
docker-compose up -d
```

### Option 2: Using Ollama (Local LLM)

1. Uncomment the Ollama service in `docker-compose.yml`

2. Start all services:
```bash
docker-compose up -d
```

3. Pull a model in the Ollama container:
```bash
docker-compose exec ollama ollama pull llama3.2
```

### Option 3: Production Deployment

1. Configure environment variables for production

2. Deploy using the production configuration:
```bash
make deploy
```

Or manually:
```bash
docker-compose -f docker-compose.prod.yml --env-file .env up -d
```

## Docker Commands Reference

### Using Makefile

```bash
make help           # Show all available commands
make build          # Build Docker image
make up             # Start services
make down           # Stop services
make restart        # Restart services
make logs           # View logs
make clean          # Remove containers and volumes
make deploy         # Deploy to production
```

### Using Docker Compose Directly

```bash
# Build and start
docker-compose up -d

# View logs
docker-compose logs -f excalidraw-app

# Stop services
docker-compose down

# Restart services
docker-compose restart

# Remove everything (including volumes)
docker-compose down -v
```

## Cloud Deployment

### Deploying to Cloud Services

The application can be deployed to any cloud platform that supports Docker Compose:

#### AWS (ECS)
1. Push image to ECR
2. Create ECS task definition
3. Deploy using ECS CLI or Console

#### Google Cloud (Cloud Run)
```bash
gcloud run deploy excalidraw-agent \
  --image gcr.io/PROJECT_ID/excalidraw-agent:latest \
  --platform managed \
  --region REGION \
  --allow-unauthenticated \
  --set-env-vars VITE_ANTHROPIC_API_KEY=$API_KEY
```

#### Azure (Container Instances)
```bash
az container create \
  --resource-group excalidraw-rg \
  --name excalidraw-agent \
  --image excalidraw-agent:latest \
  --dns-name-label excalidraw-agent \
  --ports 80 80
```

#### DigitalOcean App Platform
```bash
doctl apps create \
  --name excalidraw-agent \
  --region nyc \
  --spec excalidraw-agent
```

### Environment-Specific Configuration

#### Production URL Configuration

When deploying to a cloud platform, update the N8N callback URL:

```bash
# In .env or cloud environment variables
VITE_N8N_CALLBACK_URL=https://your-domain.com/api/n8n/callback
```

#### External API Access

For production, consider:
1. Using a backend proxy to hide the API key
2. Using secrets management (AWS Secrets Manager, etc.)
3. Enabling HTTPS/TLS

## Health Checks

The application includes a health check endpoint:

```bash
curl http://localhost:8080/health
```

Response: `healthy`

## Troubleshooting

### Container Won't Start

```bash
# Check logs
docker-compose logs excalidraw-app

# Check container status
docker-compose ps
```

### API Key Issues

- Verify the API key is set correctly in `.env`
- Check Docker logs for authentication errors
- Ensure the key has the required permissions

### Port Conflicts

Change the exposed port in `docker-compose.yml`:

```yaml
ports:
  - "8080:80"  # Change 8080 to your preferred port
```

### Ollama Connection Issues

- Verify Ollama service is running: `docker-compose ps`
- Check base URL matches service name: `http://ollama:11434`
- Ensure Ollama model is pulled: `docker-compose exec ollama ollama list`

## Volume Management

Data is persisted in named volumes:

```bash
# List volumes
docker volume ls | grep excalidraw

# Remove volumes (WARNING: deletes data)
docker-compose down -v

# Backup volumes
docker run --rm -v excalidraw-ollama-data:/data -v $(pwd):/backup alpine tar czf /backup/ollama-backup.tar.gz /data
```

## Updating the Application

```bash
# Pull latest changes
git pull

# Rebuild and restart
docker-compose up -d --build
```

## Security Considerations

1. **API Key Management**: Never commit `.env` files with real API keys
2. **HTTPS**: Use a reverse proxy (nginx, traefik) for production
3. **CORS**: Configure CORS appropriately for your domain
4. **Rate Limiting**: Implement rate limiting for API endpoints
5. **Secrets**: Use cloud secrets management in production

## Support

For issues or questions:
- Check logs: `docker-compose logs -f`
- Verify environment variables in `.env`
- Ensure all required services are running
