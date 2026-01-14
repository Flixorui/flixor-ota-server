#!/bin/bash
#
# Flixor OTA Server Deployment Script
#
# Usage:
#   ./scripts/deploy.sh [options]
#
# Options:
#   --pull      Pull latest images before deploying
#   --restart   Force restart of all services
#   --logs      Show logs after deployment
#

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
DEPLOY_DIR="/opt/flixor-ota"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Parse arguments
PULL_IMAGES=false
FORCE_RESTART=false
SHOW_LOGS=false

for arg in "$@"; do
    case $arg in
        --pull)
            PULL_IMAGES=true
            ;;
        --restart)
            FORCE_RESTART=true
            ;;
        --logs)
            SHOW_LOGS=true
            ;;
    esac
done

# Check if .env exists
if [ ! -f "$DEPLOY_DIR/.env" ]; then
    log_error ".env file not found at $DEPLOY_DIR/.env"
    log_info "Create it from .env.example:"
    log_info "  cp .env.example $DEPLOY_DIR/.env"
    log_info "  nano $DEPLOY_DIR/.env"
    exit 1
fi

cd "$DEPLOY_DIR"

# Pull latest images if requested
if [ "$PULL_IMAGES" = true ]; then
    log_info "Pulling latest images..."
    docker compose pull
fi

# Deploy
if [ "$FORCE_RESTART" = true ]; then
    log_info "Stopping existing services..."
    docker compose down
fi

log_info "Starting services..."
docker compose up -d

# Wait for health checks
log_info "Waiting for services to be healthy..."
sleep 10

# Check health
HEALTH=$(curl -s http://localhost:3000/api/health 2>/dev/null || echo '{"status":"error"}')
STATUS=$(echo "$HEALTH" | grep -o '"status":"[^"]*"' | cut -d'"' -f4)

if [ "$STATUS" = "healthy" ]; then
    log_info "Deployment successful!"
    echo ""
    echo "======================================"
    echo "Flixor OTA Server is running"
    echo "======================================"
    echo "Health: $HEALTH"
    echo ""
    echo "Admin Dashboard: https://ota.flixor.xyz"
    echo "Manifest URL: https://ota.flixor.xyz/api/manifest"
    echo "======================================"
else
    log_error "Health check failed!"
    echo "Response: $HEALTH"
    log_info "Checking logs..."
    docker compose logs --tail=50 ota-server
    exit 1
fi

# Show logs if requested
if [ "$SHOW_LOGS" = true ]; then
    log_info "Following logs (Ctrl+C to exit)..."
    docker compose logs -f
fi
