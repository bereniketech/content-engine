---
phase: 7
task_number: 7.3
title: Render Deployment Setup
description: Configure Web Service and Background Worker in Render dashboard
dependencies: [7.1, 7.2]
parallel: false
estimated_time: 1 hour
---

# Task 7.3: Render Deployment Setup

## Context

This task is manual configuration in the Render dashboard. Create two services: Web Service (FastAPI API) and Background Worker (CloudMQ processor). Both deploy from GitHub with auto-redeploy on push.

## Acceptance Criteria

- [ ] Web Service "content-engine-api" created
- [ ] Background Worker "content-engine-worker" created
- [ ] Both connected to GitHub repository
- [ ] Environment variables configured in both services
- [ ] Web Service has health check (/health)
- [ ] Web Service auto-scales 0-3 instances
- [ ] Background Worker runs 1 instance minimum
- [ ] Logs visible in Render dashboard
- [ ] Database connection pool configured
- [ ] CloudMQ credentials configured

## Configuration Steps

### Step 1: Create Web Service

1. Log in to https://dashboard.render.com
2. Click "New +" → "Web Service"
3. Select GitHub repository: `content-engine-backend`
4. Configure:
   - **Name:** `content-engine-api`
   - **Environment:** `Python 3`
   - **Build Command:** `pip install -r requirements.txt`
   - **Start Command:** `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
   - **Plan:** Free (or Starter)
   - **Health Check Path:** `/health`
   - **Auto-deploy:** On (from GitHub)

5. Set environment variables:
   ```
   DATABASE_URL=postgresql://user:pass@db.supabase.co/postgres
   SUPABASE_URL=https://your-project.supabase.co
   SUPABASE_ANON_KEY=eyJhbGc...
   SUPABASE_JWT_SECRET=your-secret
   ANTHROPIC_API_KEY=sk-ant-...
   X_API_BEARER_TOKEN=...
   LINKEDIN_API_TOKEN=...
   INSTAGRAM_BUSINESS_ACCOUNT_ID=...
   REDDIT_CLIENT_ID=...
   REDDIT_CLIENT_SECRET=...
   MAILCHIMP_API_KEY=...
   SENDGRID_API_KEY=...
   CLOUDMQ_CONNECTION_STRING=cloudmq://...
   ENVIRONMENT=production
   DEBUG=false
   RENDER_EXTERNAL_URL=https://content-engine-api.onrender.com
   ```

6. Click "Create Web Service"

### Step 2: Configure Web Service Scaling

1. Go to Web Service settings
2. Expand "Auto-scaling"
3. Set:
   - **Min Instances:** 0 (saves cost)
   - **Max Instances:** 3
   - **CPU Threshold:** 50%
   - **Memory Threshold:** 50%

4. Save

### Step 3: Create Background Worker

1. Click "New +" → "Background Worker"
2. Select GitHub repository: `content-engine-backend`
3. Configure:
   - **Name:** `content-engine-worker`
   - **Environment:** `Python 3`
   - **Build Command:** `pip install -r requirements.txt`
   - **Start Command:** `python -m app.worker_distribution`
   - **Plan:** Free (or Starter)
   - **Auto-deploy:** On (from GitHub)

4. Set same environment variables as Web Service

5. Set:
   - **Min Instances:** 1 (always running to process jobs)
   - **Max Instances:** 1

6. Click "Create Background Worker"

### Step 4: Configure Database

1. In Render dashboard, select Web Service
2. Connect to Supabase PostgreSQL:
   - Get DATABASE_URL from Supabase Project Settings
   - Verify connection pooling enabled
   - Set pool timeout: 30 seconds

3. Test connection:
   ```bash
   psql $DATABASE_URL -c "SELECT 1;"
   ```

### Step 5: Verify Deployment

1. Check Web Service logs for startup
2. Verify health check: `curl https://content-engine-api.onrender.com/health`
3. Check Background Worker logs
4. Verify migrations ran: check database tables

### Step 6: Configure GitHub Secrets for Render

1. Go to GitHub repo → Settings → Secrets and variables → Actions
2. Add:
   - `RENDER_SERVICE_ID` (from Web Service info page)
   - `RENDER_API_KEY` (from Render account settings)

3. Verify CI/CD pipeline can trigger deploys

## Test Checklist

- [ ] Web Service deployed and accessible
- [ ] GET /health returns 200
- [ ] GET /docs returns Swagger UI
- [ ] Database connection works
- [ ] All tables created (alembic upgrade head ran)
- [ ] Background Worker running
- [ ] Can queue CloudMQ jobs
- [ ] Logs visible in dashboard
- [ ] Auto-scaling configured
- [ ] GitHub Actions can trigger deploys

## Monitoring & Maintenance

### Daily Checks
- [ ] No critical errors in logs
- [ ] Health check passing
- [ ] Database connection pool healthy

### Weekly
- [ ] Review job queue backlog
- [ ] Check CloudMQ processing rate
- [ ] Verify background worker processing jobs

### Monthly
- [ ] Review error patterns
- [ ] Check database performance
- [ ] Verify backups enabled (Supabase)

## Deployment Checklist

Before going to production, verify:

- [ ] All environment variables set in Render
- [ ] Database migrations applied
- [ ] CloudMQ credentials verified
- [ ] Platform API credentials configured (X, LinkedIn, Instagram, Reddit)
- [ ] Email service credentials set (Mailchimp/SendGrid)
- [ ] CORS policy configured (only frontend origin)
- [ ] Rate limiting enabled (if using slowapi)
- [ ] Error tracking configured (Sentry, optional)
- [ ] PostgreSQL backups enabled (Supabase)
- [ ] SSL certificate auto-renewal active (Render handles)
- [ ] Health check endpoint responding
- [ ] Auto-scaling settings optimal

## Troubleshooting

### Web Service won't start
1. Check logs for errors
2. Verify DATABASE_URL is correct
3. Verify all required env vars set
4. Run migrations manually: `alembic upgrade head`

### Background worker not processing jobs
1. Verify CloudMQ connection string
2. Check CloudMQ credentials
3. Verify worker logs for errors
4. Manually restart: Dashboard → Background Worker → Restart

### Database connection timeouts
1. Check connection pool size
2. Verify database is accessible
3. Check Supabase connection pooling settings
4. Increase pool size if needed

## Commit Message

```
infra: configure Render deployment services with Web Service and Background Worker
```

## Notes

- Render provides auto-scaling, managed PostgreSQL, and auto-SSL
- Background Worker runs continuously (min instances = 1)
- Web Service scales to 0 when idle (cost optimization)
- All logs visible in Render dashboard for monitoring
- GitHub Actions triggers deployments on push to main
