# 🔍 Debugging Koyeb Deployment Issues

## Current Status
- ✅ **App deployed**: `https://grim-reyna-tapframe-69970143.koyeb.app`
- ✅ **Main page loads**: Frontend is working
- ❌ **API endpoints failing**: 500 errors on `/api/releases`
- ❌ **Health endpoint**: 404 (not deployed yet)

## Issue Analysis

### Problem: Database Connection Failure
The `/api/releases` endpoint is returning `{"error":"Failed to fetch releases"}`, which indicates:

1. **Database connection issue** - Environment variables not set correctly
2. **Storage configuration issue** - BLOB_STORAGE_TYPE not configured
3. **Missing environment variables** - Required variables not set in Koyeb

## Required Environment Variables

Make sure these are set in your Koyeb app settings:

```env
# Database Configuration
DB_TYPE=postgres
POSTGRES_USER=your-postgres-user
POSTGRES_PASSWORD=your-postgres-password
POSTGRES_DB=your-database-name
POSTGRES_HOST=your-postgres-host
POSTGRES_PORT=5432

# Storage Configuration
BLOB_STORAGE_TYPE=supabase
# OR use local storage for testing:
# BLOB_STORAGE_TYPE=local

# Admin Configuration
ADMIN_PASSWORD=your-secure-admin-password

# Host Configuration
HOST=https://your-app-name.koyeb.app

# Optional: Supabase Storage (if using Supabase)
SUPABASE_URL=your-supabase-url
SUPABASE_API_KEY=your-supabase-key
SUPABASE_BUCKET_NAME=expo-updates
```

## Debugging Steps

### 1. Check Environment Variables in Koyeb
1. Go to your Koyeb app dashboard
2. Click on "Environment" tab
3. Verify all required variables are set
4. Make sure there are no typos

### 2. Test Database Connection
```bash
# Test from your local machine
psql "postgres://your-user:your-password@your-host/your-database" -c "\dt"
```

### 3. Check Koyeb Logs
1. Go to Koyeb app dashboard
2. Click on "Logs" tab
3. Look for error messages related to database connection

### 4. Test API Endpoints
```bash
# Test releases endpoint
curl -v https://your-app-name.koyeb.app/api/releases

# Test health endpoint (after deployment)
curl -v https://your-app-name.koyeb.app/api/health
```

## Common Issues & Solutions

### Issue 1: Environment Variables Not Set
**Symptoms**: 500 errors, "Failed to fetch releases"
**Solution**: Set all required environment variables in Koyeb dashboard

### Issue 2: Database Connection Failed
**Symptoms**: Database connection errors in logs
**Solution**: 
- Verify database credentials
- Check if database is accessible from Koyeb
- Ensure database tables exist

### Issue 3: Storage Configuration Missing
**Symptoms**: Storage-related errors
**Solution**: Set `BLOB_STORAGE_TYPE=local` for testing

### Issue 4: Missing Database Tables
**Symptoms**: Database query errors
**Solution**: Run the database schema setup:
```sql
-- Connect to your database and run:
\i containers/database/schema/releases.sql
\i containers/database/schema/tracking.sql
```

## Quick Fix: Use Local Storage

For immediate testing, set these environment variables in Koyeb:

```env
DB_TYPE=postgres
POSTGRES_USER=koyeb-adm
POSTGRES_PASSWORD=npg_RbWXQ8znf2Sj
POSTGRES_DB=koyebdb
POSTGRES_HOST=ep-cool-cell-a202shcm.eu-central-1.pg.koyeb.app
POSTGRES_PORT=5432
BLOB_STORAGE_TYPE=local
ADMIN_PASSWORD=t7FdoQGSGENiduZXO/w7LYUEm0YK79F+byiggsD4sJk=
HOST=https://grim-reyna-tapframe-69970143.koyeb.app
```

## Next Steps

1. **Set environment variables** in Koyeb dashboard
2. **Redeploy** the app (if needed)
3. **Test the health endpoint** once deployed
4. **Check logs** for any remaining errors
5. **Test API endpoints** to verify functionality

## Testing Commands

```bash
# Test main app
curl -s https://grim-reyna-tapframe-69970143.koyeb.app/ | head -5

# Test releases API
curl -v https://grim-reyna-tapframe-69970143.koyeb.app/api/releases

# Test health API (after deployment)
curl -v https://grim-reyna-tapframe-69970143.koyeb.app/api/health

# Test manifest API
curl -H "expo-runtime-version: 0.6.0-beta.8" \
     -H "expo-platform: ios" \
     -H "expo-protocol-version: 1" \
     "https://grim-reyna-tapframe-69970143.koyeb.app/api/manifest"
```

The most likely issue is missing environment variables in Koyeb. Set them up and the API should work! 🚀


