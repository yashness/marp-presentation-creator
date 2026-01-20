# Azure Full-Stack Deployment Guide

A comprehensive guide for deploying full-stack applications (Python backend + React frontend) to Azure, based on real-world deployment experience. This document covers common pitfalls, solutions, and best practices.

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Prerequisites](#prerequisites)
3. [Resource Setup](#resource-setup)
4. [Backend Deployment](#backend-deployment)
5. [Frontend Deployment](#frontend-deployment)
6. [Environment Variables & Secrets](#environment-variables--secrets)
7. [CORS Configuration](#cors-configuration)
8. [Monitoring & Observability](#monitoring--observability)
9. [GitHub Actions Workflows](#github-actions-workflows)
10. [Common Issues & Solutions](#common-issues--solutions)
11. [Checklist](#deployment-checklist)

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                         Azure Cloud                              │
│  ┌──────────────────┐    ┌──────────────────────────────────┐   │
│  │  Static Web App  │    │      App Service (Linux)         │   │
│  │    (Frontend)    │───▶│         (Backend API)            │   │
│  │  React/Vite/Bun  │    │      Python/FastAPI/Gunicorn     │   │
│  └──────────────────┘    └──────────────────────────────────┘   │
│           │                            │                         │
│           └────────────┬───────────────┘                         │
│                        ▼                                         │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │              Application Insights + Log Analytics         │   │
│  └──────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

### Recommended Azure Services

| Component | Azure Service | Why |
|-----------|---------------|-----|
| Frontend | Azure Static Web Apps | Free tier, auto SSL, global CDN, GitHub integration |
| Backend | Azure App Service (Linux) | Managed Python runtime, easy scaling, deployment slots |
| Monitoring | Application Insights + Log Analytics | Full observability, tracing, metrics |
| Containers (optional) | Azure Container Registry + App Service | For complex dependencies (Node.js, Chromium, etc.) |

---

## Prerequisites

### Tools Required

```bash
# Azure CLI
brew install azure-cli  # macOS
# or: curl -sL https://aka.ms/InstallAzureCLIDeb | sudo bash  # Linux

# GitHub CLI
brew install gh

# Login to both
az login
gh auth login
```

### Verify Authentication

```bash
# Check Azure subscription
az account show --query "{name:name, id:id}" -o table

# Check GitHub auth
gh auth status
```

---

## Resource Setup

### Step 1: Create Resource Group

```bash
RESOURCE_GROUP="myapp-rg"
LOCATION="centralindia"  # Choose closest region

az group create --name $RESOURCE_GROUP --location $LOCATION
```

### Step 2: Create App Service Plan

```bash
APP_SERVICE_PLAN="myapp-plan"

az appservice plan create \
  --name $APP_SERVICE_PLAN \
  --resource-group $RESOURCE_GROUP \
  --location $LOCATION \
  --sku B1 \
  --is-linux
```

**SKU Options:**
| SKU | Use Case | Price |
|-----|----------|-------|
| F1 | Testing only (limited) | Free |
| B1 | Development/small apps | ~$13/month |
| S1 | Production | ~$70/month |
| P1V2 | High performance | ~$80/month |

### Step 3: Create Backend App Service

```bash
BACKEND_APP="myapp-api"

az webapp create \
  --name $BACKEND_APP \
  --resource-group $RESOURCE_GROUP \
  --plan $APP_SERVICE_PLAN \
  --runtime "PYTHON:3.11"
```

### Step 4: Create Static Web App (Frontend)

```bash
FRONTEND_APP="myapp-ui"

az staticwebapp create \
  --name $FRONTEND_APP \
  --resource-group $RESOURCE_GROUP \
  --location "eastasia"  # Limited regions for SWA
```

> ⚠️ **Caveat**: Static Web Apps have limited region availability. Use `az staticwebapp list-skus` to see available regions.

### Step 5: Create Monitoring Resources

```bash
LOG_ANALYTICS="myapp-logs"
APP_INSIGHTS="myapp-insights"

# Log Analytics Workspace
az monitor log-analytics workspace create \
  --resource-group $RESOURCE_GROUP \
  --workspace-name $LOG_ANALYTICS \
  --location $LOCATION

# Get workspace ID
WORKSPACE_ID=$(az monitor log-analytics workspace show \
  --resource-group $RESOURCE_GROUP \
  --workspace-name $LOG_ANALYTICS \
  --query id -o tsv)

# Application Insights
az monitor app-insights component create \
  --app $APP_INSIGHTS \
  --resource-group $RESOURCE_GROUP \
  --location $LOCATION \
  --workspace $WORKSPACE_ID
```

---

## Backend Deployment

### Option A: Source Deployment (Recommended for Simple Apps)

#### 1. Enable Oryx Build

```bash
az webapp config appsettings set \
  --name $BACKEND_APP \
  --resource-group $RESOURCE_GROUP \
  --settings \
    SCM_DO_BUILD_DURING_DEPLOYMENT=true \
    ENABLE_ORYX_BUILD=true
```

#### 2. Create `runtime.txt`

> ⚠️ **Critical**: Oryx needs this file to detect Python version!

```bash
echo "python-3.11" > backend/runtime.txt
```

#### 3. Create `requirements.txt`

Oryx looks for `requirements.txt`, not `pyproject.toml`:

```bash
# If using uv/poetry, export to requirements.txt
cd backend && uv pip compile pyproject.toml -o requirements.txt
```

#### 4. Get Publish Profile

```bash
az webapp deployment list-publishing-profiles \
  --name $BACKEND_APP \
  --resource-group $RESOURCE_GROUP \
  --xml > /tmp/publish-profile.xml

# Add as GitHub secret
gh secret set AZURE_WEBAPP_PUBLISH_PROFILE < /tmp/publish-profile.xml
rm /tmp/publish-profile.xml
```

#### 5. Configure Startup Command

```bash
az webapp config set \
  --name $BACKEND_APP \
  --resource-group $RESOURCE_GROUP \
  --startup-file "gunicorn --bind=0.0.0.0:8000 --timeout 600 -k uvicorn.workers.UvicornWorker app.main:app"
```

### Option B: Docker Deployment (For Complex Dependencies)

Use Docker when you need:
- Node.js + Python together
- System packages (Chromium, LibreOffice, etc.)
- Specific runtime versions

#### 1. Create Dockerfile

```dockerfile
FROM python:3.11-slim

# Install system dependencies
RUN apt-get update && apt-get install -y \
    nodejs npm \
    chromium \
    && rm -rf /var/lib/apt/lists/*

# Install Python dependencies
COPY requirements.txt .
RUN pip install -r requirements.txt

COPY . /app
WORKDIR /app

EXPOSE 8000
CMD ["gunicorn", "--bind=0.0.0.0:8000", "-k", "uvicorn.workers.UvicornWorker", "app.main:app"]
```

#### 2. Build and Push to GHCR

```bash
# Login to GitHub Container Registry
echo $GITHUB_TOKEN | docker login ghcr.io -u USERNAME --password-stdin

# Build and push
docker build -t ghcr.io/USERNAME/myapp-backend:latest ./backend
docker push ghcr.io/USERNAME/myapp-backend:latest
```

#### 3. Configure App Service for Container

```bash
az webapp config container set \
  --name $BACKEND_APP \
  --resource-group $RESOURCE_GROUP \
  --docker-custom-image-name "ghcr.io/USERNAME/myapp-backend:latest" \
  --docker-registry-server-url "https://ghcr.io"

az webapp config appsettings set \
  --name $BACKEND_APP \
  --resource-group $RESOURCE_GROUP \
  --settings WEBSITES_PORT=8000
```

---

## Frontend Deployment

### 1. Get Deployment Token

```bash
DEPLOYMENT_TOKEN=$(az staticwebapp secrets list \
  --name $FRONTEND_APP \
  --resource-group $RESOURCE_GROUP \
  --query "properties.apiKey" -o tsv)

gh secret set AZURE_STATIC_WEB_APPS_API_TOKEN --body "$DEPLOYMENT_TOKEN"
```

### 2. Configure Build Settings

Create `staticwebapp.config.json` in frontend root:

```json
{
  "navigationFallback": {
    "rewrite": "/index.html",
    "exclude": ["/assets/*", "/*.svg", "/*.ico"]
  },
  "routes": [
    {
      "route": "/api/*",
      "allowedRoles": ["anonymous"]
    }
  ],
  "globalHeaders": {
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY"
  }
}
```

### 3. Set API Base URL

> ⚠️ **Critical**: Environment variable must be prefixed with `VITE_` for Vite apps!

```bash
# In GitHub Actions workflow:
env:
  VITE_API_BASE_URL: "https://myapp-api.azurewebsites.net"
```

**Common Mistake:**
```bash
# ❌ Wrong - won't be available at runtime
API_BASE_URL: "https://..."

# ✅ Correct - Vite injects this at build time
VITE_API_BASE_URL: "https://..."
```

---

## Environment Variables & Secrets

### Backend App Settings

```bash
az webapp config appsettings set \
  --name $BACKEND_APP \
  --resource-group $RESOURCE_GROUP \
  --settings \
    CORS_ORIGINS="http://localhost:3000,https://myapp-ui.azurestaticapps.net" \
    DATABASE_URL="sqlite:///./app.db" \
    API_SECRET_KEY="your-secret-key" \
    AZURE_ENDPOINT="https://your-openai.openai.azure.com" \
    API_KEY="your-api-key"
```

### Viewing Current Settings

```bash
az webapp config appsettings list \
  --name $BACKEND_APP \
  --resource-group $RESOURCE_GROUP \
  -o table
```

### GitHub Secrets

| Secret Name | Purpose | How to Get |
|-------------|---------|------------|
| `AZURE_WEBAPP_PUBLISH_PROFILE` | Backend deployment | `az webapp deployment list-publishing-profiles --xml` |
| `AZURE_STATIC_WEB_APPS_API_TOKEN` | Frontend deployment | `az staticwebapp secrets list` |
| `AZURE_CREDENTIALS` | Docker deployment (optional) | `az ad sp create-for-rbac --json-auth` |

---

## CORS Configuration

> ⚠️ **Most Common Issue**: Frontend can't call backend due to CORS.

### Backend FastAPI CORS Setup

```python
from fastapi.middleware.cors import CORSMiddleware

origins = os.getenv("CORS_ORIGINS", "http://localhost:3000").split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

### Azure App Setting

```bash
az webapp config appsettings set \
  --name $BACKEND_APP \
  --resource-group $RESOURCE_GROUP \
  --settings CORS_ORIGINS="http://localhost:3000,http://localhost:5173,https://YOUR-FRONTEND.azurestaticapps.net"
```

**Include ALL origins:**
- `http://localhost:3000` - Local dev (CRA)
- `http://localhost:5173` - Local dev (Vite)
- `http://localhost:5174` - Local dev (Vite alternate port)
- `https://your-frontend.azurestaticapps.net` - Production

---

## Monitoring & Observability

### Enable Diagnostic Logs

```bash
az webapp log config \
  --name $BACKEND_APP \
  --resource-group $RESOURCE_GROUP \
  --application-logging filesystem \
  --detailed-error-messages true \
  --failed-request-tracing true \
  --web-server-logging filesystem
```

### Stream Live Logs

```bash
az webapp log tail \
  --name $BACKEND_APP \
  --resource-group $RESOURCE_GROUP
```

### Download Logs for Analysis

```bash
az webapp log download \
  --name $BACKEND_APP \
  --resource-group $RESOURCE_GROUP \
  --log-file /tmp/logs.zip
```

### Connect to Application Insights

```bash
INSTRUMENTATION_KEY=$(az monitor app-insights component show \
  --app $APP_INSIGHTS \
  --resource-group $RESOURCE_GROUP \
  --query instrumentationKey -o tsv)

CONNECTION_STRING=$(az monitor app-insights component show \
  --app $APP_INSIGHTS \
  --resource-group $RESOURCE_GROUP \
  --query connectionString -o tsv)

az webapp config appsettings set \
  --name $BACKEND_APP \
  --resource-group $RESOURCE_GROUP \
  --settings \
    APPINSIGHTS_INSTRUMENTATIONKEY=$INSTRUMENTATION_KEY \
    APPLICATIONINSIGHTS_CONNECTION_STRING=$CONNECTION_STRING
```

---

## GitHub Actions Workflows

### Backend Workflow (Source Deployment)

```yaml
name: Deploy Backend

on:
  push:
    branches: [main]
    paths: ['backend/**']
  workflow_dispatch:

env:
  AZURE_WEBAPP_NAME: myapp-api

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - uses: actions/setup-python@v5
        with:
          python-version: '3.11'
      
      - name: Create deployment package
        working-directory: ./backend
        run: |
          # Create requirements.txt if using pyproject.toml
          pip install uv
          uv pip compile pyproject.toml -o requirements.txt
          
          # CRITICAL: Create runtime.txt for Oryx
          echo "python-3.11" > runtime.txt
          
          # Create zip package
          mkdir deploy_pkg
          cp -r app deploy_pkg/
          cp requirements.txt runtime.txt deploy_pkg/
          cp config.toml deploy_pkg/ 2>/dev/null || true
          cd deploy_pkg && zip -r ../deploy.zip .
      
      - name: Deploy to Azure
        uses: azure/webapps-deploy@v3
        with:
          app-name: ${{ env.AZURE_WEBAPP_NAME }}
          publish-profile: ${{ secrets.AZURE_WEBAPP_PUBLISH_PROFILE }}
          package: ./backend/deploy.zip
```

### Frontend Workflow

```yaml
name: Deploy Frontend

on:
  push:
    branches: [main]
    paths: ['frontend/**']
  workflow_dispatch:

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - uses: oven-sh/setup-bun@v2
      
      - name: Install and Build
        working-directory: ./frontend
        env:
          VITE_API_BASE_URL: "https://myapp-api.azurewebsites.net"
        run: |
          bun install
          bun run build
      
      - name: Deploy to Static Web App
        uses: Azure/static-web-apps-deploy@v1
        with:
          azure_static_web_apps_api_token: ${{ secrets.AZURE_STATIC_WEB_APPS_API_TOKEN }}
          repo_token: ${{ secrets.GITHUB_TOKEN }}
          action: "upload"
          app_location: "/frontend"
          output_location: "dist"
          skip_app_build: true
```

---

## Common Issues & Solutions

### Issue 1: Backend Returns 503 / App Won't Start

**Symptoms:**
- Health endpoint returns 503
- Logs show "container didn't respond to HTTP pings"

**Causes & Solutions:**

| Cause | Solution |
|-------|----------|
| Wrong startup command | Set correct gunicorn command with `--bind=0.0.0.0:8000` |
| Missing runtime.txt | Create `runtime.txt` with `python-3.11` |
| Oryx can't detect Python | Ensure `requirements.txt` exists (not just pyproject.toml) |
| Startup script not found | Use inline command, not external script |

```bash
# Fix startup command
az webapp config set \
  --name $BACKEND_APP \
  --resource-group $RESOURCE_GROUP \
  --startup-file "gunicorn --bind=0.0.0.0:8000 --timeout 600 -k uvicorn.workers.UvicornWorker app.main:app"
```

### Issue 2: Frontend Shows "localhost" Errors

**Symptom:** Network tab shows requests to `localhost:8000`

**Cause:** Environment variable not set at build time

**Solution:**
```yaml
# In workflow, set env BEFORE build step
env:
  VITE_API_BASE_URL: "https://myapp-api.azurewebsites.net"
```

### Issue 3: CORS Errors

**Symptom:** Console shows "blocked by CORS policy"

**Solution:**
```bash
# Add frontend URL to CORS_ORIGINS
az webapp config appsettings set \
  --name $BACKEND_APP \
  --resource-group $RESOURCE_GROUP \
  --settings CORS_ORIGINS="https://YOUR-FRONTEND.azurestaticapps.net"
```

### Issue 4: Deployment Succeeds but Code Not Updated

**Symptom:** Workflow passes but old code still running

**Causes & Solutions:**

| Cause | Solution |
|-------|----------|
| Oryx caching | Add `DISABLE_ORYX_CACHE=true` setting |
| Container not restarted | Run `az webapp restart` |
| Wrong deployment path | Check `paths` filter in workflow |

### Issue 5: "No such file or directory: 'marp'" (or other CLI tools)

**Symptom:** Runtime error for missing system tools

**Cause:** Azure App Service Python containers don't include Node.js or other runtimes

**Solutions:**
1. **Fallback approach**: Implement alternative code path that works without the tool
2. **Docker deployment**: Use custom container with all dependencies
3. **POST_BUILD_COMMAND**: Limited, doesn't have root access

### Issue 6: Publish Profile Authentication Fails

**Symptom:** Deployment returns 401 Unauthorized

**Solution:**
```bash
# Enable basic auth for SCM
az resource update \
  --resource-group $RESOURCE_GROUP \
  --name scm \
  --namespace Microsoft.Web \
  --resource-type basicPublishingCredentialsPolicies \
  --parent sites/$BACKEND_APP \
  --set properties.allow=true
```

### Issue 7: Static Web App API Returns 404

**Symptom:** Frontend deployed but shows 404 on routes

**Solution:** Add navigation fallback in `staticwebapp.config.json`:
```json
{
  "navigationFallback": {
    "rewrite": "/index.html"
  }
}
```

### Issue 8: Environment Variables Not Available

**Symptom:** Code can't read env vars, returns None

**Causes:**
1. For Vite apps: Missing `VITE_` prefix
2. Settings not propagated: App needs restart
3. Wrong env file loaded

```bash
# Restart app to apply new settings
az webapp restart --name $BACKEND_APP --resource-group $RESOURCE_GROUP
```

---

## Deployment Checklist

### Pre-Deployment

- [ ] Azure CLI logged in (`az account show`)
- [ ] GitHub CLI logged in (`gh auth status`)
- [ ] Resource group created
- [ ] App Service Plan created (Linux, correct SKU)

### Backend Setup

- [ ] App Service created with correct Python runtime
- [ ] `runtime.txt` exists with `python-3.11`
- [ ] `requirements.txt` exists (even if using pyproject.toml)
- [ ] Startup command configured (gunicorn + uvicorn)
- [ ] SCM basic auth enabled (for publish profile)
- [ ] Publish profile added as GitHub secret
- [ ] CORS_ORIGINS includes all frontend URLs
- [ ] All required environment variables set

### Frontend Setup

- [ ] Static Web App created
- [ ] Deployment token added as GitHub secret
- [ ] `VITE_API_BASE_URL` set in workflow (with `VITE_` prefix!)
- [ ] `staticwebapp.config.json` with navigation fallback
- [ ] Build output directory matches workflow config (`dist` for Vite)

### Monitoring

- [ ] Log Analytics workspace created
- [ ] Application Insights created and connected
- [ ] Diagnostic logs enabled
- [ ] Health endpoint exists (`/health`)

### Post-Deployment Verification

- [ ] Backend health check passes: `curl https://myapp-api.azurewebsites.net/health`
- [ ] Frontend loads: `curl https://myapp.azurestaticapps.net`
- [ ] Frontend can call backend (no CORS errors)
- [ ] Logs are being collected
- [ ] All API endpoints work

---

## Quick Reference Commands

```bash
# View app logs
az webapp log tail --name $BACKEND_APP --resource-group $RESOURCE_GROUP

# Restart app
az webapp restart --name $BACKEND_APP --resource-group $RESOURCE_GROUP

# SSH into container
az webapp ssh --name $BACKEND_APP --resource-group $RESOURCE_GROUP

# View app settings
az webapp config appsettings list --name $BACKEND_APP --resource-group $RESOURCE_GROUP -o table

# View deployment status
az webapp deployment list --name $BACKEND_APP --resource-group $RESOURCE_GROUP -o table

# Force redeploy
az webapp deployment source sync --name $BACKEND_APP --resource-group $RESOURCE_GROUP
```

---

## Cost Optimization Tips

1. **Use Free Tier for Frontend**: Azure Static Web Apps free tier is generous
2. **Scale Down Dev/Test**: Use B1 for non-production
3. **Enable Auto-scaling**: Only for production with variable load
4. **Clean Up Unused Resources**: Delete deployment slots, old apps
5. **Use Resource Tags**: Track costs by project/environment

```bash
# Tag resources for cost tracking
az group update --name $RESOURCE_GROUP --tags Environment=Production Project=MyApp
```

---

## Architecture Decision Record

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Frontend hosting | Static Web Apps | Free, auto SSL, global CDN, GitHub integration |
| Backend hosting | App Service | Managed Python, easy deployment, scaling options |
| Python runtime | Source deployment | Simpler than Docker for pure Python apps |
| Complex deps | Docker on App Service | When Node.js/Chromium/etc. needed |
| Monitoring | App Insights | Native integration, powerful analytics |
| CI/CD | GitHub Actions | Free for public repos, native Azure integration |

---

*Last updated: January 2026*
*Based on deployment of marp-presentation-creator to Azure*
