#!/bin/bash

# Deploy xavia-ota to Koyeb
# This script helps you deploy your xavia-ota server to Koyeb

set -e

echo "🚀 Deploying xavia-ota to Koyeb..."

# Check if git is initialized
if [ ! -d ".git" ]; then
    echo "❌ Git repository not initialized. Please run:"
    echo "   git init"
    echo "   git add ."
    echo "   git commit -m 'Initial commit'"
    echo "   git remote add origin https://github.com/yourusername/xavia-ota.git"
    echo "   git push -u origin main"
    exit 1
fi

# Check if .env.production exists
if [ ! -f ".env.production" ]; then
    echo "⚠️  .env.production not found. Please:"
    echo "   1. Copy .env.production.template to .env.production"
    echo "   2. Fill in your production environment variables"
    echo "   3. Run this script again"
    exit 1
fi

# Check if required environment variables are set
source .env.production

required_vars=("HOST" "DB_TYPE" "POSTGRES_USER" "POSTGRES_PASSWORD" "POSTGRES_DB" "POSTGRES_HOST" "ADMIN_PASSWORD")

for var in "${required_vars[@]}"; do
    if [ -z "${!var}" ]; then
        echo "❌ Required environment variable $var is not set in .env.production"
        exit 1
    fi
done

echo "✅ Environment variables validated"

# Build the application
echo "🔨 Building application..."
npm run build

# Commit and push changes
echo "📤 Pushing to GitHub..."
git add .
git commit -m "Deploy to production $(date)"
git push origin main

echo "✅ Deployment initiated!"
echo ""
echo "📋 Next steps:"
echo "   1. Go to https://app.koyeb.com"
echo "   2. Create a new app from your GitHub repository"
echo "   3. Set the environment variables from .env.production"
echo "   4. Deploy the app"
echo "   5. Set up the database schema"
echo "   6. Test the deployment"
echo ""
echo "🔗 Useful links:"
echo "   - Koyeb Dashboard: https://app.koyeb.com"
echo "   - Deployment Guide: ./koyeb-deployment-guide.md"
echo "   - Your app will be available at: $HOST"


