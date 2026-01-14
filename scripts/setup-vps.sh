#!/bin/bash
#
# Flixor OTA Server - VPS Initial Setup Script
#
# Run this on a fresh Ubuntu 22.04 VPS to set up the OTA server
#
# Usage:
#   curl -fsSL https://raw.githubusercontent.com/Flixorui/flixor-ota-server/main/scripts/setup-vps.sh | bash
#
# Or download and run:
#   wget https://raw.githubusercontent.com/Flixorui/flixor-ota-server/main/scripts/setup-vps.sh
#   chmod +x setup-vps.sh
#   ./setup-vps.sh
#

set -e

DEPLOY_DIR="/opt/flixor-ota"
DOMAIN="ota.flixor.xyz"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log_info() { echo -e "${GREEN}[INFO]${NC} $1"; }
log_warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

echo "======================================"
echo "Flixor OTA Server - VPS Setup"
echo "======================================"
echo ""

# Check if running as root
if [ "$EUID" -ne 0 ]; then
    log_error "Please run as root (use sudo)"
    exit 1
fi

# Update system
log_info "Updating system packages..."
apt-get update
apt-get upgrade -y

# Install Docker
if ! command -v docker &> /dev/null; then
    log_info "Installing Docker..."
    curl -fsSL https://get.docker.com | sh
    systemctl enable docker
    systemctl start docker
else
    log_info "Docker already installed"
fi

# Install Docker Compose plugin
if ! docker compose version &> /dev/null; then
    log_info "Installing Docker Compose..."
    apt-get install -y docker-compose-plugin
else
    log_info "Docker Compose already installed"
fi

# Install Nginx
if ! command -v nginx &> /dev/null; then
    log_info "Installing Nginx..."
    apt-get install -y nginx
    systemctl enable nginx
else
    log_info "Nginx already installed"
fi

# Install Certbot
if ! command -v certbot &> /dev/null; then
    log_info "Installing Certbot..."
    apt-get install -y certbot python3-certbot-nginx
else
    log_info "Certbot already installed"
fi

# Create deployment directory
log_info "Creating deployment directory..."
mkdir -p "$DEPLOY_DIR"
cd "$DEPLOY_DIR"

# Download docker-compose.yml
log_info "Downloading docker-compose.yml..."
curl -fsSL https://raw.githubusercontent.com/Flixorui/flixor-ota-server/main/docker-compose.yml -o docker-compose.yml

# Download .env.example
curl -fsSL https://raw.githubusercontent.com/Flixorui/flixor-ota-server/main/.env.example -o .env.example

# Download database schema
mkdir -p containers/database/schema
curl -fsSL https://raw.githubusercontent.com/Flixorui/flixor-ota-server/main/containers/database/schema/releases.sql -o containers/database/schema/releases.sql
curl -fsSL https://raw.githubusercontent.com/Flixorui/flixor-ota-server/main/containers/database/schema/tracking.sql -o containers/database/schema/tracking.sql

# Generate secure passwords if .env doesn't exist
if [ ! -f "$DEPLOY_DIR/.env" ]; then
    log_info "Generating .env file with secure passwords..."
    POSTGRES_PASSWORD=$(openssl rand -hex 16)
    ADMIN_PASSWORD=$(openssl rand -hex 12)
    UPLOAD_KEY=$(openssl rand -hex 32)

    cat > .env << EOF
# Auto-generated configuration
HOST=https://${DOMAIN}

# Database
POSTGRES_USER=flixor
POSTGRES_PASSWORD=${POSTGRES_PASSWORD}
POSTGRES_DB=flixor_ota

# Security
ADMIN_PASSWORD=${ADMIN_PASSWORD}
UPLOAD_KEY=${UPLOAD_KEY}
PRIVATE_KEY_BASE_64=
EOF

    log_warn "Generated credentials saved to $DEPLOY_DIR/.env"
    echo ""
    echo "======================================"
    echo "IMPORTANT: Save these credentials!"
    echo "======================================"
    echo "Admin Password: ${ADMIN_PASSWORD}"
    echo "Upload Key: ${UPLOAD_KEY}"
    echo "======================================"
    echo ""
else
    log_info ".env already exists, skipping generation"
fi

# Configure Nginx
log_info "Configuring Nginx..."
cat > /etc/nginx/sites-available/ota.flixor.xyz << 'EOF'
server {
    listen 80;
    server_name ota.flixor.xyz;

    client_max_body_size 100M;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 300s;
        proxy_connect_timeout 75s;
    }
}
EOF

# Enable site
ln -sf /etc/nginx/sites-available/ota.flixor.xyz /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default

# Test and reload Nginx
nginx -t
systemctl reload nginx

# Pull and start services
log_info "Pulling Docker images..."
cd "$DEPLOY_DIR"
docker compose pull

log_info "Starting services..."
docker compose up -d

# Wait for services
log_info "Waiting for services to start..."
sleep 15

# Check health
HEALTH=$(curl -s http://localhost:3000/api/health 2>/dev/null || echo '{"status":"error"}')
STATUS=$(echo "$HEALTH" | grep -o '"status":"[^"]*"' | cut -d'"' -f4)

echo ""
echo "======================================"
if [ "$STATUS" = "healthy" ]; then
    log_info "Setup complete!"
    echo ""
    echo "Next steps:"
    echo "1. Point DNS for ${DOMAIN} to this server's IP"
    echo "2. Run: certbot --nginx -d ${DOMAIN}"
    echo "3. Access admin: https://${DOMAIN}"
    echo ""
    echo "Credentials are in: $DEPLOY_DIR/.env"
else
    log_error "Health check failed. Check logs with:"
    echo "  docker compose -f $DEPLOY_DIR/docker-compose.yml logs"
fi
echo "======================================"
