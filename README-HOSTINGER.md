# Hostinger Production Deployment Guide

Complete guide for deploying Excalidraw AI Agent to Hostinger VPS/Cloud hosting.

## Table of Contents

- [Prerequisites](#prerequisites)
- [Quick Start](#quick-start)
- [SSL Certificate Setup](#ssl-certificate-setup)
- [Environment Configuration](#environment-configuration)
- [Deployment Steps](#deployment-steps)
- [Verification](#verification)
- [SSL Certificate Auto-Renewal](#ssl-certificate-auto-renewal)
- [Monitoring and Maintenance](#monitoring-and-maintenance)
- [Troubleshooting](#troubleshooting)
- [Security Considerations](#security-considerations)

---

## Prerequisites

### System Requirements

- Hostinger VPS or Cloud hosting plan
- SSH access to your server
- Root or sudo privileges
- At least 1GB RAM (2GB recommended)
- 10GB disk space

### Software Requirements

The following will be installed during setup:

- Docker
- Docker Compose
- Certbot (for Let's Encrypt SSL)

---

## Quick Start

### 1. Connect to Your Hostinger VPS

```bash
ssh root@your-server-ip
# or
ssh user@your-server-ip
```

### 2. Update System

```bash
sudo apt update && sudo apt upgrade -y
```

### 3. Install Docker

```bash
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Enable and start Docker
sudo systemctl enable docker
sudo systemctl start docker

# Add your user to docker group (optional, for non-root usage)
sudo usermod -aG docker $USER
```

### 4. Install Docker Compose

```bash
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Verify installation
docker-compose --version
```

### 5. Install Certbot

```bash
sudo apt install certbot -y
```

### 6. Clone Repository

```bash
cd /opt
git clone <your-repo-url> ExcalidrawTool
cd ExcalidrawTool
```

### 7. Configure Environment

```bash
# Copy Hostinger env template
cp .env.hostinger.example .env

# Edit with your values
nano .env
```

### 8. Generate SSL Certificates

```bash
# Generate Let's Encrypt certificate
sudo certbot certonly --standalone -d your-domain.com

# Create SSL directory
mkdir -p ssl

# Copy certificates
sudo cp /etc/letsencrypt/live/your-domain.com/fullchain.pem ssl/
sudo cp /etc/letsencrypt/live/your-domain.com/privkey.pem ssl/
sudo chmod 644 ssl/*.pem
```

### 9. Deploy

```bash
# Make deploy script executable
chmod +x deploy-hostinger.sh

# Run deployment
./deploy-hostinger.sh
```

---

## SSL Certificate Setup

### Generate Let's Encrypt Certificate

```bash
sudo certbot certonly --standalone -d your-domain.com
```

**Flags:**
- `--standalone`: Use standalone mode (temporarily runs a webserver)
- `-d`: Domain name

**Multiple domains:**
```bash
sudo certbot certonly --standalone -d your-domain.com -d www.your-domain.com
```

### Copy Certificates to Project

```bash
mkdir -p ssl
sudo cp /etc/letsencrypt/live/your-domain.com/fullchain.pem ssl/
sudo cp /etc/letsencrypt/live/your-domain.com/privkey.pem ssl/
sudo chmod 644 ssl/*.pem
sudo chown $USER:$USER ssl/*.pem
```

### Verify Certificates

```bash
ls -la ssl/
# Should show:
# -rw-r--r-- 1 user user fullchain.pem
# -rw-r--r-- 1 user user privkey.pem

# Check certificate expiration
sudo certbot certificates
```

---

## Environment Configuration

### Required Variables

Edit `.env` and set at minimum:

```bash
# Your domain name
HOSTINGER_DOMAIN=your-domain.com

# Anthropic API key
VITE_ANTHROPIC_API_KEY=sk-ant-your-key-here

# N8N callback URL (use your public domain)
VITE_N8N_CALLBACK_URL=https://your-domain.com/api/n8n/callback
```

### Optional Variables

Adjust resource limits based on your Hostinger plan:

```bash
# CPU limits
HOSTINGER_CPU_LIMIT=1.0
HOSTINGER_CPU_RESERVE=0.25

# Memory limits
HOSTINGER_MEMORY_LIMIT=1G
HOSTINGER_MEMORY_RESERVE=256M
```

### AI Provider Options

**Anthropic (Claude) - Default:**
```bash
VITE_AI_PROVIDER=anthropic
VITE_ANTHROPIC_API_KEY=sk-ant-your-key-here
VITE_ANTHROPIC_MODEL=claude-sonnet-4-20250514
```

**Ollama (Local LLM):**
```bash
VITE_AI_PROVIDER=ollama
VITE_OLLAMA_BASE_URL=http://localhost:11434
VITE_OLLAMA_MODEL=llama3.2
```

---

## Deployment Steps

### Using Deploy Script (Recommended)

```bash
# From project directory
./deploy-hostinger.sh
```

### Manual Deployment

```bash
# Build and start containers
docker-compose -f docker-compose.hostinger.yml up -d --build

# Check container status
docker-compose -f docker-compose.hostinger.yml ps

# View logs
docker-compose -f docker-compose.hostinger.yml logs -f
```

---

## Verification

### Check Container Status

```bash
docker-compose -f docker-compose.hostinger.yml ps
```

Expected output:
```
NAME                    STATUS         PORTS
excalidraw-ai-agent     Up X minutes   0.0.0.0:80->80/tcp, 0.0.0.0:443->443/tcp
```

### Test Health Endpoint

```bash
curl http://localhost/health
# Should return: healthy

curl https://your-domain.com/health
# Should return: healthy
```

### Test Application

1. Open browser: `https://your-domain.com`
2. Verify HTTPS works (no certificate warnings)
3. Verify application loads correctly
4. Test AI features (requires valid API key)

---

## SSL Certificate Auto-Renewal

### Setup Cron Job

```bash
# Edit crontab
sudo crontab -e

# Add renewal task (runs twice daily)
0 */12 * * * certbot renew --quiet --post-hook "cd /opt/ExcalidrawTool && docker-compose -f docker-compose.hostinger.yml restart excalidraw-app"
```

### Test Renewal

```bash
# Dry run (doesn't actually renew)
sudo certbot renew --dry-run
```

### Manual Renewal

```bash
# Renew certificates
sudo certbot renew

# Copy new certificates
sudo cp /etc/letsencrypt/live/your-domain.com/fullchain.pem ssl/
sudo cp /etc/letsencrypt/live/your-domain.com/privkey.pem ssl/

# Restart container
docker-compose -f docker-compose.hostinger.yml restart excalidraw-app
```

---

## Monitoring and Maintenance

### View Logs

```bash
# All logs
docker-compose -f docker-compose.hostinger.yml logs

# Follow logs (tail -f)
docker-compose -f docker-compose.hostinger.yml logs -f

# Specific service
docker-compose -f docker-compose.hostinger.yml logs excalidraw-app

# Last 100 lines
docker-compose -f docker-compose.hostinger.yml logs --tail=100
```

### Restart Services

```bash
# Restart all services
docker-compose -f docker-compose.hostinger.yml restart

# Restart specific service
docker-compose -f docker-compose.hostinger.yml restart excalidraw-app
```

### Update Application

```bash
# Pull latest code
git pull

# Rebuild and restart
docker-compose -f docker-compose.hostinger.yml up -d --build
```

### Resource Monitoring

```bash
# Container stats (CPU, memory, etc.)
docker stats excalidraw-ai-agent

# Disk usage
docker system df

# Check disk space
df -h

# Check memory
free -h
```

### Clean Up Old Images

```bash
# Remove unused images
docker image prune -a

# Remove unused containers
docker container prune

# Remove unused volumes
docker volume prune

# Remove everything unused
docker system prune -a
```

---

## Troubleshooting

### Container Won't Start

**Check logs:**
```bash
docker-compose -f docker-compose.hostinger.yml logs
```

**Check configuration:**
```bash
docker-compose -f docker-compose.hostinger.yml config
```

**Common issues:**
- Port 80/443 already in use
- SSL certificates missing or invalid
- Environment variables not set correctly
- Insufficient disk space

### SSL Certificate Issues

**Verify certificate files exist:**
```bash
ls -la ssl/
# Should show fullchain.pem and privkey.pem
```

**Check certificate expiration:**
```bash
sudo certbot certificates
```

**Force renew:**
```bash
sudo certbot renew --force-renewal
```

### Port Already in Use

**Check what's using port 80:**
```bash
sudo netstat -tulpn | grep :80
```

**Check what's using port 443:**
```bash
sudo netstat -tulpn | grep :443
```

**Stop conflicting services (e.g., Apache):**
```bash
sudo systemctl stop apache2
sudo systemctl disable apache2
```

### Application Not Accessible

**Check firewall:**
```bash
sudo ufw status
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
```

**Check nginx status:**
```bash
docker exec excalidraw-ai-agent nginx -t
```

**Check container is running:**
```bash
docker ps | grep excalidraw
```

### AI Features Not Working

**Verify API key is set:**
```bash
# Check .env file
cat .env | grep ANTHROPIC_API_KEY
```

**Check AI debug logs:**
```bash
# Enable debug in .env
VITE_AI_DEBUG=true

# Restart container
docker-compose -f docker-compose.hostinger.yml restart

# View logs
docker-compose -f docker-compose.hostinger.yml logs -f
```

### N8N Integration Issues

**Verify callback URL:**
```bash
# Should use your public domain
cat .env | grep CALLBACK_URL
# Expected: VITE_N8N_CALLBACK_URL=https://your-domain.com/api/n8n/callback
```

**Test callback endpoint:**
```bash
curl -X POST https://your-domain.com/api/n8n/callback -H "Content-Type: application/json" -d '{"test":"data"}'
```

---

## Security Considerations

### API Key Security

**NEVER commit .env files to git:**
```bash
# .gitignore should include:
.env
.env.*
```

**Use read-only file permissions:**
```bash
chmod 600 .env
```

### Firewall Configuration

```bash
# Enable firewall
sudo ufw enable

# Allow SSH (your current port)
sudo ufw allow 22/tcp

# Allow HTTP/HTTPS
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# Check status
sudo ufw status
```

### Regular Updates

```bash
# Update system packages
sudo apt update && sudo apt upgrade -y

# Update Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
```

### Backups

**Backup environment and SSL certificates:**
```bash
# Create backup directory
mkdir -p /backup/excalidraw

# Backup .env and SSL
cp .env /backup/excalidraw/
cp -r ssl /backup/excalidraw/

# Backup with date
tar -czf /backup/excalidraw-$(date +%Y%m%d).tar.gz .env ssl/
```

---

## Production Checklist

Before going live, verify:

- [ ] Docker and Docker Compose installed
- [ ] SSL certificates generated and copied to ./ssl/
- [ ] .env file configured with domain and API keys
- [ ] Container starts successfully
- [ ] Health endpoint returns 200
- [ ] Application accessible via HTTP (redirects to HTTPS)
- [ ] Application accessible via HTTPS
- [ ] No SSL certificate warnings
- [ ] N8N callback URL uses public domain
- [ ] Logs are being written and rotated
- [ ] SSL auto-renewal configured
- [ ] Resource limits appropriate for Hostinger plan
- [ ] Firewall configured correctly
- [ ] Backup strategy in place

---

## Additional Resources

- [Docker Documentation](https://docs.docker.com/)
- [Docker Compose Documentation](https://docs.docker.com/compose/)
- [Certbot Documentation](https://certbot.eff.org/docs/)
- [nginx Documentation](https://nginx.org/en/docs/)
- [Hostinger VPS Documentation](https://support.hostinger.com/en/categories/hpowered-vps/)

---

## Support

For issues specific to Excalidraw AI Agent:
- Check application logs: `docker-compose -f docker-compose.hostinger.yml logs -f`
- Verify configuration: `docker-compose -f docker-compose.hostinger.yml config`
- Check health: `curl https://your-domain.com/health`

For Hostinger-specific issues:
- [Hostinger Support](https://support.hostinger.com/)
- [Hostinger Knowledge Base](https://support.hostinger.com/en/)
