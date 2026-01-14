# Deploying xavia-ota to Koyeb

This guide will help you deploy your xavia-ota server to Koyeb, a modern cloud platform for deploying applications.

## Prerequisites

1. **Koyeb Account**: Sign up at [koyeb.com](https://koyeb.com)
2. **PostgreSQL Database**: You'll need a PostgreSQL database (Koyeb provides managed PostgreSQL)
3. **Domain** (optional): For custom domain setup

## Step 1: Prepare Your Repository

### 1.1 Create a GitHub Repository
```bash
cd /Users/tapframe/Desktop/Project/Nuvio/xavia-ota
git init
git add .
git commit -m "Initial commit: xavia-ota server"
git remote add origin https://github.com/yourusername/xavia-ota.git
git push -u origin main
```

### 1.2 Create Production Environment File
Create a `.env.production` file (don't commit this to git):

```env
# Production Environment Variables
HOST=https://your-app-name.koyeb.app
BLOB_STORAGE_TYPE=supabase
DB_TYPE=postgres

# Database Configuration (will be provided by Koyeb)
POSTGRES_USER=your-db-user
POSTGRES_PASSWORD=your-db-password
POSTGRES_DB=your-db-name
POSTGRES_HOST=your-db-host
POSTGRES_PORT=5432

# Admin Configuration
ADMIN_PASSWORD=your-secure-admin-password

# Code Signing (optional but recommended)
PRIVATE_KEY_BASE_64=your-base64-encoded-private-key

# Supabase Configuration (if using Supabase storage)
SUPABASE_URL=your-supabase-url
SUPABASE_API_KEY=your-supabase-service-role-key
SUPABASE_BUCKET_NAME=expo-updates
```

## Step 2: Set Up PostgreSQL Database

### Option A: Koyeb Managed PostgreSQL
1. Go to your Koyeb dashboard
2. Click "Create" → "Database"
3. Select "PostgreSQL"
4. Choose your region
5. Set database name, username, and password
6. Note down the connection details

### Option B: External PostgreSQL (Supabase, Railway, etc.)
- Use any PostgreSQL provider
- Ensure it's accessible from Koyeb's IP ranges

## Step 3: Deploy to Koyeb

### 3.1 Create New App
1. Go to [Koyeb Dashboard](https://app.koyeb.com)
2. Click "Create" → "App"
3. Connect your GitHub repository
4. Select the xavia-ota repository

### 3.2 Configure Build Settings
- **Build Command**: `npm run build`
- **Run Command**: `npm start`
- **Node.js Version**: 18.x or 20.x

### 3.3 Set Environment Variables
In the Koyeb app settings, add these environment variables:

```env
HOST=https://your-app-name.koyeb.app
BLOB_STORAGE_TYPE=supabase
DB_TYPE=postgres
POSTGRES_USER=your-db-user
POSTGRES_PASSWORD=your-db-password
POSTGRES_DB=your-db-name
POSTGRES_HOST=your-db-host
POSTGRES_PORT=5432
ADMIN_PASSWORD=your-secure-admin-password
PRIVATE_KEY_BASE_64=your-base64-encoded-private-key
SUPABASE_URL=your-supabase-url
SUPABASE_API_KEY=your-supabase-service-role-key
SUPABASE_BUCKET_NAME=expo-updates
```

### 3.4 Deploy
Click "Deploy" and wait for the build to complete.

## Step 4: Set Up Database Schema

Once your app is deployed, you need to create the database tables:

### Option A: Using Koyeb Database Console
1. Go to your PostgreSQL database in Koyeb
2. Open the database console
3. Run the SQL commands from the schema files:

```sql
-- From containers/database/schema/releases.sql
CREATE TABLE IF NOT EXISTS releases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  runtime_version VARCHAR(255) NOT NULL,
  path VARCHAR(255) NOT NULL,
  timestamp TIMESTAMP NOT NULL,
  commit_hash VARCHAR(255) NOT NULL,
  commit_message VARCHAR(255) NOT NULL,
  update_id VARCHAR(255)
);

-- From containers/database/schema/tracking.sql
CREATE TABLE IF NOT EXISTS releases_tracking (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    release_id UUID NOT NULL REFERENCES releases(id),
    download_timestamp TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    platform VARCHAR(50) NOT NULL,
    CONSTRAINT fk_release
        FOREIGN KEY(release_id) 
        REFERENCES releases(id)
        ON DELETE CASCADE
);

-- Indexes
CREATE INDEX idx_tracking_release_id ON releases_tracking(release_id);
CREATE INDEX idx_tracking_platform ON releases_tracking(platform);
```

### Option B: Using psql Command Line
```bash
# Connect to your database
psql -h your-db-host -U your-db-user -d your-db-name

# Run the schema files
\i containers/database/schema/releases.sql
\i containers/database/schema/tracking.sql
```

## Step 5: Update Your App Configuration

Update your Nuvio app's `app.json` to point to the production server:

```json
{
  "updates": {
    "enabled": true,
    "checkAutomatically": "ON_LOAD",
    "fallbackToCacheTimeout": 0,
    "url": "https://your-app-name.koyeb.app/api/manifest"
  }
}
```

## Step 6: Test Your Deployment

### 6.1 Test the API Endpoint
```bash
curl -H "expo-runtime-version: 0.6.0-beta.8" \
     -H "expo-platform: ios" \
     -H "expo-protocol-version: 1" \
     "https://your-app-name.koyeb.app/api/manifest"
```

### 6.2 Access Admin Dashboard
Visit: `https://your-app-name.koyeb.app`
- Login with your admin password
- Upload a test update

### 6.3 Upload Your First Update
```bash
# From your Nuvio project root
./build-and-publish-app-release.sh 0.6.0-beta.8 https://your-app-name.koyeb.app
```

## Step 7: Set Up Custom Domain (Optional)

1. In Koyeb dashboard, go to your app
2. Click "Domains" → "Add Domain"
3. Add your custom domain (e.g., `updates.yourdomain.com`)
4. Update DNS records as instructed
5. Update your app's `app.json` with the new domain

## Step 8: Set Up Monitoring & Logs

### 8.1 Enable Logs
- Koyeb provides built-in logging
- Access logs in the Koyeb dashboard

### 8.2 Set Up Alerts
- Configure alerts for deployment failures
- Monitor database connections
- Set up uptime monitoring

## Production Checklist

- [ ] Environment variables configured
- [ ] Database schema created
- [ ] Admin password set securely
- [ ] Code signing key configured (optional)
- [ ] Custom domain configured (optional)
- [ ] Monitoring set up
- [ ] App configuration updated
- [ ] First update uploaded and tested

## Troubleshooting

### Common Issues

1. **Database Connection Failed**
   - Check environment variables
   - Verify database is accessible from Koyeb
   - Check firewall settings

2. **Build Failures**
   - Check Node.js version compatibility
   - Verify all dependencies are in package.json
   - Check build logs in Koyeb dashboard

3. **Update Upload Fails**
   - Verify admin password
   - Check storage configuration
   - Verify API endpoints are accessible

### Getting Help

- **Koyeb Documentation**: [docs.koyeb.com](https://docs.koyeb.com)
- **Koyeb Support**: Available in dashboard
- **xavia-ota Issues**: Check GitHub repository

## Cost Optimization

- **Database**: Start with smallest instance, scale as needed
- **App Instance**: Use smallest instance for development
- **Storage**: Consider using Supabase free tier for small projects
- **Bandwidth**: Monitor usage and optimize update sizes

## Security Best Practices

1. **Use HTTPS**: Always use HTTPS in production
2. **Secure Admin Password**: Use a strong, unique password
3. **Code Signing**: Enable code signing for production
4. **Environment Variables**: Never commit secrets to git
5. **Database Security**: Use connection pooling and SSL
6. **Regular Updates**: Keep dependencies updated

## Next Steps

1. **Set up CI/CD**: Automate deployments from GitHub
2. **Add Monitoring**: Set up application monitoring
3. **Scale**: Add more instances as your user base grows
4. **Backup**: Set up regular database backups
5. **Analytics**: Add update analytics and tracking


