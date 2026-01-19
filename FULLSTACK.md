Overview

This document defines the standard technology stack and operational philosophy for my SaaS projects.

Goals:
	•	MySQL-based data layer
	•	FastAPI backend
	•	Vite/React frontend
	•	Auth + Billing with minimal glue code
	•	CLI/API-first workflow
	•	GitHub-based CI/CD
	•	Full observability: analytics, monitoring, tracing, alerts
	•	Azure as primary cloud

⸻

Core Stack

Frontend
	•	Framework: Vite + React
	•	Hosting: Azure Static Web Apps (Free Tier)
	•	CI/CD: GitHub Actions (auto-deploy on push)

Backend
	•	Framework: FastAPI
	•	Hosting: Azure App Service (Linux, Python)
	•	Deployment: GitHub Actions or az webapp up

Database
	•	Engine: MySQL
	•	Hosting: Azure Database for MySQL (Flexible Server)
	•	Access via SQLAlchemy / Prisma / raw drivers

Auth + Billing
	•	Provider: Clerk
	•	Payments: Stripe (via Clerk Billing)
	•	Models supported:
	•	Subscriptions
	•	Usage-based billing
	•	One-time purchases

Analytics
	•	Product/User Analytics: PostHog (self-hosted or cloud)
	•	Event tracking from frontend and backend

Observability
	•	Monitoring: Azure Monitor + Application Insights
	•	Tracing: OpenTelemetry → Azure Monitor
	•	Logs: Log Analytics
	•	Alerts: Azure Monitor Alerts

⸻

Infrastructure Setup (CLI-First)

Azure Login

az login
az account set --subscription 1474094b-0cb4-4291-9dce-bffde96843d2

Resource Group

az group create \
  --name <RESOURCE_GROUP> \
  --location centralindia

MySQL Database

az mysql flexible-server create \
  --resource-group <RESOURCE_GROUP> \
  --name <MYSQL_NAME> \
  --location centralindia \
  --admin-user <ADMIN_USER> \
  --admin-password <ADMIN_PASSWORD> \
  --sku-name BurstableB1ms \
  --storage-size 32

App Service Plan (What is <APP_SERVICE_PLAN>?)

<APP_SERVICE_PLAN> is the compute plan that defines the pricing tier, region, and scaling rules for one or more Azure App Services.
Create it once, then attach web apps to it.

az appservice plan create \
  --resource-group <RESOURCE_GROUP> \
  --name <APP_SERVICE_PLAN> \
  --location centralindia \
  --sku F1 \
  --is-linux

Backend App Service

az webapp create \
  --resource-group <RESOURCE_GROUP> \
  --plan <APP_SERVICE_PLAN> \
  --name <BACKEND_NAME> \
  --runtime "PYTHON|3.14"

Frontend Static Web App

az staticwebapp create \
  --name <FRONTEND_NAME> \
  --resource-group <RESOURCE_GROUP> \
  --source https://github.com/yashness/<REPO> \
  --branch main \
  --app-location "/" \
  --output-location "dist"


⸻

Auth + Billing Setup

Clerk CLI?
	•	There is no full-featured official Clerk CLI for managing auth + billing like an infra tool.
	•	Clerk provides:
	•	Web Dashboard (for first-time enablement)
	•	Backend API + SDKs (Node, etc.) to manage users, sessions, billing plans, and subscriptions
	•	CLI-style automation is done by writing small scripts that call Clerk’s Backend API using your secret key.

Example pattern (conceptual):
	•	node scripts/create-plan.js
	•	python scripts/sync-plans.py

After bootstrap, all user, plan, and subscription management can be automated via API/scripts — no portal required.

⸻

Auth + Billing Setup

Clerk
	•	Used for authentication and identity management
	•	Provides UI components and backend SDKs
	•	Supports social login, email/password, MFA

Clerk Billing
	•	Integrated with Stripe
	•	Supports:
	•	Subscription plans
	•	Metered usage
	•	One-time purchases
	•	Plans and subscriptions managed via API/SDK scripts

Stripe
	•	Payment processor under Clerk Billing
	•	Handles cards, Apple Pay, Google Pay, invoices, taxes

⸻

Deployment Flow

GitHub → Azure
	•	Push to main
	•	GitHub Actions builds and deploys:
	•	Frontend → Azure Static Web Apps
	•	Backend → Azure App Service

Local Dev
	•	Frontend: npm run dev
	•	Backend: uvicorn main:app --reload
	•	MySQL: Azure or local Docker

⸻

Analytics Setup

PostHog
	•	Tracks:
	•	User events
	•	Funnels
	•	Feature usage
	•	Session recordings
	•	Integrated in:
	•	Frontend (JS SDK)
	•	Backend (API events)

⸻

Observability & Debuggability

Monitoring
	•	Azure Monitor
	•	Application Insights for:
	•	Request latency
	•	Error rates
	•	Dependency calls

Tracing
	•	OpenTelemetry in FastAPI
	•	Traces exported to Azure Monitor

Logging
	•	Structured logs to Azure Log Analytics

Alerts

Examples:
	•	Error rate > 5%
	•	Latency > 2s
	•	CPU > 70%
	•	DB connections near limit

⸻

Billing Models Supported

Subscriptions
	•	Monthly / yearly plans
	•	Trials, upgrades, downgrades

Usage-Based Billing
	•	Metered events reported to Stripe via Clerk
	•	Examples: API calls, credits, storage used

One-Time Purchases
	•	Credits, add-ons, lifetime deals

⸻

Philosophy
	•	CLI/API-first: no manual portal dependency after bootstrap
	•	GitHub as source of truth
	•	Automate everything
	•	Observability by default
	•	Free-tier friendly, scale-ready

⸻

Pricing & Free-Tier Notes (Azure)

Azure App Service (Linux, Python)
	•	Plan = App Service Plan (defines CPU/RAM/scale shared by attached apps).
	•	Common SKUs:
	•	F1 (Free): 60 CPU minutes/day, limited memory, single app — good for prototypes.
	•	B1 (Basic): Paid, small VM size, production entry.
	•	Pricing model: you pay for the plan, not per app. Multiple apps can share one plan.

What does “750 hours/month” mean (MySQL Flexible Server Free)
	•	Azure’s free MySQL includes up to 750 compute hours/month.
	•	750 hours ≈ one small server running 24/7 for a month.
	•	If you stop the server, you save hours.
	•	Exceeding 750 hours → you start paying for compute time.

MySQL Data Size (Free Tier)
	•	Storage: typically 32 GB free (varies by offer/region).
	•	You pay only if you exceed the free storage or I/O limits.

Azure Blob Storage (Free)
	•	Free for 12 months on new accounts:
	•	~5 GB storage
	•	~20,000 read operations
	•	~10,000 write operations
	•	Good for images, small media, user uploads.

⸻

PostHog Setup (Analytics)

Option A — Cloud PostHog
	1.	Create PostHog project (web once).
	2.	Get Project API Key.
	3.	Track events from frontend and backend.

Option B — Self-Hosted on Azure

Run via Azure Container Apps or VM.

az containerapp create \
  --name <POSTHOG_APP> \
  --resource-group <RESOURCE_GROUP> \
  --image posthog/posthog:latest \
  --target-port 8000

Set env vars for PostHog backend, DB, and secrets.

⸻

Azure Monitor & Application Insights

Create Application Insights

az monitor app-insights component create \
  --app <APPINSIGHTS_NAME> \
  --location centralindia \
  --resource-group <RESOURCE_GROUP> \
  --application-type web

Attach to App Service

az webapp config appsettings set \
  --resource-group <RESOURCE_GROUP> \
  --name <BACKEND_NAME> \
  --settings APPLICATIONINSIGHTS_CONNECTION_STRING=<CONNECTION_STRING>

Enable Logs

az monitor log-analytics workspace create \
  --resource-group <RESOURCE_GROUP> \
  --workspace-name <LOG_WORKSPACE>


⸻

Tracing with OpenTelemetry → Azure Monitor
	•	Use OpenTelemetry SDK in FastAPI.
	•	Export traces to Azure Monitor using the App Insights connection string.
	•	Traces show:
	•	Request flow
	•	DB calls
	•	External API calls
	•	Errors and latency

⸻

Alerts (Azure CLI)

Example: High Error Rate

az monitor metrics alert create \
  --name HighErrorRate \
  --resource-group <RESOURCE_GROUP> \
  --scopes <APP_SERVICE_RESOURCE_ID> \
  --condition "avg Http5xx > 5" \
  --window-size 5m \
  --evaluation-frequency 1m

Example: High CPU

az monitor metrics alert create \
  --name HighCPU \
  --resource-group <RESOURCE_GROUP> \
  --scopes <APP_SERVICE_RESOURCE_ID> \
  --condition "avg Percentage CPU > 70" \
  --window-size 5m

Action Group (Email/Slack/Webhook)

az monitor action-group create \
  --name <ACTION_GROUP> \
  --resource-group <RESOURCE_GROUP> \
  --short-name alerts \
  --email-receiver name=admin email=<EMAIL>


⸻

LLM Stack

Model Provider
	•	Provider: Anthropic (Claude models)
	•	Platform: Azure AI Foundry
	•	SDK: claude-agent-sdk v2

Setup Flow

az login
az account set --subscription 1474094b-0cb4-4291-9dce-bffde96843d2

Create Azure AI Foundry project and endpoint (once via portal or template).

Environment Variables

AZURE_ENDPOINT=https://<your-resource>.openai.azure.com/anthropic
AZURE_DEPLOYMENT=claude-haiku-4-5
AZURE_IMAGE_DEPLOYMENT=dall-e-3
API_KEY=<your-api-key>

Agent Runtime Concept
	•	Use claude-agent-sdk v2 to:
	•	Run task-based agents
	•	Tool calling
	•	Long-running workflows

Deployment Model
	•	Agents run inside FastAPI backend
	•	Called by frontend via API
	•	Traced via OpenTelemetry

⸻

Stack Summary

Layer	Choice
Frontend	Vite + React
Hosting (FE)	Azure Static Web Apps
Backend	FastAPI
Hosting (BE)	Azure App Service
Database	MySQL (Azure Flexible Server)
Auth	Clerk
Billing	Clerk + Stripe
Analytics	PostHog
Monitoring	Azure Monitor + App Insights
Tracing	OpenTelemetry
CI/CD	GitHub Actions


⸻

This stack is my default for SaaS projects going forward.