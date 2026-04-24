---
phase: 7
task_number: 7.1
title: Docker Setup
description: Create Dockerfile and .dockerignore for production deployment
dependencies: [1.1, 1.3]
parallel: false
estimated_time: 1 hour
---

# Task 7.1: Docker Setup

## Context

Docker containerizes the FastAPI application for deployment to Render. This task creates a multi-stage Dockerfile that builds the image efficiently and includes database migration on startup.

## Acceptance Criteria

- [ ] `Dockerfile` created with multi-stage build
- [ ] `.dockerignore` created to exclude unnecessary files
- [ ] `docker-entrypoint.sh` created with migration logic
- [ ] Base image: python:3.11-slim
- [ ] Production image runs migrations before startup
- [ ] Exposes port 8000
- [ ] Health check endpoint configured
- [ ] `docker build -t content-engine-api .` succeeds
- [ ] `docker run -p 8000:8000 content-engine-api` starts without errors
- [ ] GET http://localhost:8000/health returns 200

## Files to Create

1. **Dockerfile** — Multi-stage Docker build
2. **.dockerignore** — Files to exclude from build
3. **docker-entrypoint.sh** — Entrypoint script with migrations

## Implementation Steps

### Step 1: Create Dockerfile

```dockerfile
# Multi-stage build for production

# Stage 1: Builder
FROM python:3.11-slim as builder

WORKDIR /build

# Install build dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    gcc \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements
COPY requirements.txt .

# Install Python dependencies
RUN pip install --no-cache-dir --user -r requirements.txt

# Stage 2: Production
FROM python:3.11-slim

WORKDIR /app

# Install runtime dependencies only
RUN apt-get update && apt-get install -y --no-install-recommends \
    postgresql-client \
    && rm -rf /var/lib/apt/lists/*

# Copy Python packages from builder
COPY --from=builder /root/.local /root/.local

# Copy application code
COPY . .

# Set PATH for user pip install
ENV PATH=/root/.local/bin:$PATH

# Make entrypoint executable
RUN chmod +x ./docker-entrypoint.sh

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:8000/health || exit 1

EXPOSE 8000

ENTRYPOINT ["./docker-entrypoint.sh"]

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

### Step 2: Create .dockerignore

```
.git
.gitignore
.venv
venv/
__pycache__
*.pyc
*.pyo
*.pyd
.Python
*.egg-info/
dist/
build/
.pytest_cache/
.coverage
htmlcov/
.vscode/
.idea/
.DS_Store
.env
.env.local
*.log
.claude/
.spec/
```

### Step 3: Create docker-entrypoint.sh

```bash
#!/bin/bash
set -e

echo "Running database migrations..."
alembic upgrade head

echo "Starting application..."
exec "$@"
```

## Verification Checklist

- [ ] Dockerfile exists with multi-stage build
- [ ] .dockerignore exists
- [ ] docker-entrypoint.sh exists and is executable
- [ ] `docker build -t content-engine-api .` succeeds
- [ ] Image size reasonable (~500MB max)
- [ ] `docker run -p 8000:8000 content-engine-api` starts
- [ ] Migrations run on startup
- [ ] GET http://localhost:8000/health returns 200
- [ ] Health check endpoint configured

## Commit Message

```
infra: add Docker configuration for production containerization
```

## Notes

- Multi-stage build reduces final image size (builder stage discarded)
- Runtime dependencies only (postgresql-client for DB connectivity)
- Health check runs every 30 seconds
- Entrypoint runs migrations before starting uvicorn
- Environment variables passed at runtime (docker run -e), not baked into image
