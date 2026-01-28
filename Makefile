.PHONY: help build build-prod up down restart logs clean deploy

# Default target
help:
	@echo "Excalidraw AI Agent - Docker Commands"
	@echo ""
	@echo "Usage: make [target]"
	@echo ""
	@echo "Available targets:"
	@sed -n 's/^##//p' $(MAKEFILE_LIST) | sed 's/## /  /'
	@echo ""

## build: Build the Docker image
build:
	docker-compose build

## build-prod: Build the production Docker image
build-prod:
	docker-compose -f docker-compose.prod.yml build

## up: Start all services in detached mode
up:
	docker-compose up -d

## up-prod: Start production services
up-prod:
	docker-compose -f docker-compose.prod.yml up -d

## down: Stop all services and remove containers
down:
	docker-compose down

## restart: Restart all services
restart:
	docker-compose restart

## logs: Show logs from all services
logs:
	docker-compose logs -f

## logs-app: Show logs from the app service
logs-app:
	docker-compose logs -f excalidraw-app

## shell: Open a shell in the app container
shell:
	docker-compose exec excalidraw-app sh

## clean: Remove all containers, networks, and volumes
clean:
	docker-compose down -v
	docker rmi excalidraw-ai-agent:latest 2>/dev/null || true

## clean-all: Remove everything including images
clean-all:
	docker-compose down -v --rmi all --remove-orphans
	docker rmi excalidraw-ai-agent:latest 2>/dev/null || true
	docker volume rm excalidraw-ollama-data excalidraw-n8n-data excalidraw-redis-data 2>/dev/null || true

## deploy: Deploy to production (requires .env file)
deploy: build-prod
	@echo "Deploying to production..."
	docker-compose -f docker-compose.prod.yml --env-file .env up -d
	@echo "Deployment complete!"
	@echo "Application is running at http://localhost:8080"

## ps: Show running containers
ps:
	docker-compose ps

## stats: Show resource usage stats
stats:
	docker-compose stats

## update: Pull latest images and rebuild
update:
	git pull
	docker-compose build
	docker-compose up -d

## test: Run health check
test:
	@curl -f http://localhost:8080/health || exit 1
	@echo "Health check passed!"
