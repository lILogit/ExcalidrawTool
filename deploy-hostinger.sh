#!/bin/bash
set -e

# ===========================================
# Excalidraw AI Agent - Hostinger Deployment Script
# ===========================================
# This script automates the deployment process for Hostinger VPS/Cloud hosting.
#
# Usage:
#   chmod +x deploy-hostinger.sh
#   ./deploy-hostinger.sh
#
# Prerequisites:
#   - Docker and Docker Compose installed
#   - .env file configured (copy from .env.hostinger.example)
#   - SSL certificates in ./ssl/ directory
# ===========================================

echo "=================================="
echo "Excalidraw AI Agent - Hostinger Deployment"
echo "=================================="
echo ""

# ===========================================
# Check if .env exists
# ===========================================
if [ ! -f .env ]; then
    echo "❌ Error: .env file not found!"
    echo "Copy .env.hostinger.example to .env and configure your values:"
    echo "  cp .env.hostinger.example .env"
    echo "  nano .env"
    exit 1
fi

# Source environment variables
set -a
source .env
set +a

# ===========================================
# Check required variables
# ===========================================
if [ -z "$HOSTINGER_DOMAIN" ]; then
    echo "❌ Error: HOSTINGER_DOMAIN not set in .env"
    echo "Edit .env and add your domain name:"
    echo "  HOSTINGER_DOMAIN=your-domain.com"
    exit 1
fi

echo "✓ Domain configured: $HOSTINGER_DOMAIN"

# ===========================================
# Check if Docker is installed
# ===========================================
if ! command -v docker &> /dev/null; then
    echo "❌ Error: Docker is not installed!"
    echo "Install Docker:"
    echo "  curl -fsSL https://get.docker.com -o get-docker.sh"
    echo "  sudo sh get-docker.sh"
    exit 1
fi

# ===========================================
# Check if Docker Compose is installed
# ===========================================
if ! command -v docker-compose &> /dev/null; then
    echo "❌ Error: Docker Compose is not installed!"
    echo "Install Docker Compose:"
    echo "  sudo curl -L \"https://github.com/docker/compose/releases/latest/download/docker-compose-\$(uname -s)-\$(uname -m)\" -o /usr/local/bin/docker-compose"
    echo "  sudo chmod +x /usr/local/bin/docker-compose"
    exit 1
fi

echo "✓ Docker and Docker Compose are installed"

# ===========================================
# Create SSL directory if it doesn't exist
# ===========================================
mkdir -p ssl

# ===========================================
# Check if SSL certificates exist
# ===========================================
if [ ! -f "ssl/fullchain.pem" ] || [ ! -f "ssl/privkey.pem" ]; then
    echo ""
    echo "⚠️  Warning: SSL certificates not found in ./ssl/"
    echo ""
    echo "Generate Let's Encrypt certificates:"
    echo "  sudo certbot certonly --standalone -d $HOSTINGER_DOMAIN"
    echo "  sudo cp /etc/letsencrypt/live/$HOSTINGER_DOMAIN/fullchain.pem ssl/"
    echo "  sudo cp /etc/letsencrypt/live/$HOSTINGER_DOMAIN/privkey.pem ssl/"
    echo "  sudo chmod 644 ssl/*.pem"
    echo ""
    read -p "Continue without SSL? (y/N) " -n 1 -r
    echo ""
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "Deployment cancelled. Please generate SSL certificates first."
        exit 1
    fi
    echo "⚠️  Proceeding without SSL (not recommended for production)"
else
    echo "✓ SSL certificates found"
fi

# ===========================================
# Stop existing containers
# ===========================================
echo ""
echo "🛑 Stopping existing containers..."
docker-compose -f docker-compose.hostinger.yml down 2>/dev/null || true

# ===========================================
# Build and start containers
# ===========================================
echo ""
echo "🔨 Building and starting containers..."
echo ""

docker-compose -f docker-compose.hostinger.yml up -d --build

# ===========================================
# Wait for health check
# ===========================================
echo ""
echo "⏳ Waiting for application to be healthy..."
sleep 10

# ===========================================
# Check status
# ===========================================
echo ""
echo "=================================="
echo "Container Status:"
echo "=================================="
docker-compose -f docker-compose.hostinger.yml ps

# ===========================================
# Display deployment information
# ===========================================
echo ""
echo "=================================="
echo "✅ Deployment complete!"
echo "=================================="
echo ""
echo "Application should be available at:"
echo "  🌐 http://$HOSTINGER_DOMAIN"
echo "  🔒 https://$HOSTINGER_DOMAIN"
echo ""
echo "Health check:"
echo "  curl https://$HOSTINGER_DOMAIN/health"
echo ""
echo "View logs:"
echo "  docker-compose -f docker-compose.hostinger.yml logs -f"
echo ""
echo "Restart services:"
echo "  docker-compose -f docker-compose.hostinger.yml restart"
echo ""
echo "Stop services:"
echo "  docker-compose -f docker-compose.hostinger.yml down"
echo ""
echo "=================================="
echo ""
