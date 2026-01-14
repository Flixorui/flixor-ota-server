#!/bin/bash

# Setup script for Koyeb deployment
# This script prepares your xavia-ota server for deployment to Koyeb

set -e

echo "🚀 Setting up Koyeb deployment for xavia-ota..."

# Check if .env.production exists
if [ ! -f ".env.production" ]; then
    echo "❌ .env.production not found. Please run:"
    echo "   cp .env.production.template .env.production"
    echo "   # Then edit .env.production with your values"
    exit 1
fi

# Source the environment file
source .env.production

echo "✅ Environment file found"

# Test database connection
echo "🔍 Testing database connection..."
if psql "postgres://$POSTGRES_USER:$POSTGRES_PASSWORD@$POSTGRES_HOST:$POSTGRES_PORT/$POSTGRES_DB" -c "\dt" > /dev/null 2>&1; then
    echo "✅ Database connection successful"
else
    echo "❌ Database connection failed. Please check your credentials."
    exit 1
fi

# Check if tables exist
echo "🔍 Checking database schema..."
tables=$(psql "postgres://$POSTGRES_USER:$POSTGRES_PASSWORD@$POSTGRES_HOST:$POSTGRES_PORT/$POSTGRES_DB" -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public' AND table_name IN ('releases', 'releases_tracking');")

if [ "$tables" = "2" ]; then
    echo "✅ Database schema is ready"
else
    echo "⚠️  Database schema not complete. Setting up tables..."
    psql "postgres://$POSTGRES_USER:$POSTGRES_PASSWORD@$POSTGRES_HOST:$POSTGRES_PORT/$POSTGRES_DB" -f containers/database/schema/releases.sql
    psql "postgres://$POSTGRES_USER:$POSTGRES_PASSWORD@$POSTGRES_HOST:$POSTGRES_PORT/$POSTGRES_DB" -f containers/database/schema/tracking.sql
    echo "✅ Database schema created"
fi

# Build the application
echo "🔨 Building application..."
npm run build

echo "✅ Build completed"

# Check if git is initialized
if [ ! -d ".git" ]; then
    echo "⚠️  Git repository not initialized. Initializing..."
    git init
    git add .
    git commit -m "Initial commit: xavia-ota server ready for Koyeb deployment"
    echo "✅ Git repository initialized"
    echo ""
    echo "📋 Next steps:"
    echo "   1. Create a GitHub repository"
    echo "   2. Add remote origin: git remote add origin https://github.com/yourusername/xavia-ota.git"
    echo "   3. Push to GitHub: git push -u origin main"
    echo "   4. Deploy to Koyeb using the GitHub repository"
else
    echo "✅ Git repository ready"
    echo ""
    echo "📋 Ready for deployment!"
    echo "   1. Commit your changes: git add . && git commit -m 'Ready for Koyeb deployment'"
    echo "   2. Push to GitHub: git push origin main"
    echo "   3. Deploy to Koyeb using the GitHub repository"
fi

echo ""
echo "🔗 Your Koyeb database is ready:"
echo "   Host: $POSTGRES_HOST"
echo "   Database: $POSTGRES_DB"
echo "   User: $POSTGRES_USER"
echo ""
echo "🔐 Admin password: $ADMIN_PASSWORD"
echo "   (Save this password securely!)"
echo ""
echo "📖 For detailed deployment instructions, see: koyeb-deployment-guide.md"


