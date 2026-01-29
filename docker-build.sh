#!/bin/bash
# Docker Build Script with Environment Variables

echo "Excalidraw AI Agent - Docker Build Script"
echo "=========================================="
echo ""

# Check if .env file exists
if [ -f .env ]; then
    echo "Loading environment variables from .env..."
    export $(grep -v '^#' .env | xargs)
else
    echo "Warning: .env file not found"
    echo ""
fi

# Check for API key
if [ -z "$VITE_ANTHROPIC_API_KEY" ]; then
    echo "Error: VITE_ANTHROPIC_API_KEY is not set!"
    echo ""
    echo "Please set it before building:"
    echo "  export VITE_ANTHROPIC_API_KEY=sk-ant-xxxxx"
    echo ""
    echo "Or create a .env file with:"
    echo "  VITE_ANTHROPIC_API_KEY=sk-ant-xxxxx"
    exit 1
fi

echo "Using API key: ${VITE_ANTHROPIC_API_KEY:0:10}..."
echo ""

# Build and start
echo "Building Docker image..."
docker-compose down 2>/dev/null
docker-compose build
docker-compose up -d

echo ""
echo "Build complete!"
echo "Application is running at: http://localhost:8080"
