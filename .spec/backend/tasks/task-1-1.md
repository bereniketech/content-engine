---
phase: 1
task_number: 1.1
title: Create FastAPI Project Structure
description: Set up Python project with FastAPI, SQLAlchemy, environment variables, and basic health check endpoint
dependencies: []
parallel: false
estimated_time: 2 hours
---

# Task 1.1: Create FastAPI Project Structure

## Context

This is the first task in Phase 1 (Foundation). It establishes the basic project skeleton that all subsequent tasks depend on. Once complete, you'll have a working FastAPI application that can be started locally with `uvicorn app.main:app --reload`.

## Acceptance Criteria

- [ ] `requirements.txt` created with all Python dependencies
- [ ] `pyproject.toml` created with project metadata and tool configuration
- [ ] `app/__init__.py` exists (empty package marker)
- [ ] `app/main.py` created with FastAPI app, CORS middleware, and health endpoints
- [ ] `.env.example` created with all required environment variables
- [ ] `.gitignore` created with Python/venv/IDE patterns
- [ ] `git init` completed (if not already a repo)
- [ ] `uvicorn app.main:app --reload` starts without errors on localhost:8000
- [ ] `GET http://localhost:8000/health` returns `{"status": "ok"}`
- [ ] `GET http://localhost:8000/docs` loads Swagger UI (FastAPI auto-generated)

## Files to Create

1. **requirements.txt** — Python dependencies
2. **pyproject.toml** — Project metadata + tool config (black, ruff, pytest)
3. **app/__init__.py** — Empty package marker
4. **app/main.py** — FastAPI application entry point
5. **.env.example** — Template for environment variables
6. **.gitignore** — Git ignore patterns

## Implementation Steps

### Step 1: Create requirements.txt

```text
fastapi==0.104.1
uvicorn[standard]==0.24.0
sqlalchemy==2.0.23
alembic==1.13.0
pydantic==2.5.0
pydantic-settings==2.1.0
python-dotenv==1.0.0
psycopg2-binary==2.9.9
supabase==2.0.3
python-jose[cryptography]==3.3.0
cryptography==41.0.7
requests==2.31.0
httpx==0.25.2
pytest==7.4.3
pytest-asyncio==0.21.1
pytest-cov==4.1.0
pytest-mock==3.12.0
black==23.12.0
ruff==0.1.8
```

### Step 2: Create pyproject.toml

```toml
[build-system]
requires = ["setuptools>=68.0", "wheel"]
build-backend = "setuptools.build_meta"

[project]
name = "content-engine-backend"
version = "0.1.0"
description = "FastAPI microservice for content generation, distribution, and feedback loop"
requires-python = ">=3.11"
dependencies = [
    "fastapi==0.104.1",
    "uvicorn[standard]==0.24.0",
    "sqlalchemy==2.0.23",
    "alembic==1.13.0",
    "pydantic==2.5.0",
    "pydantic-settings==2.1.0",
    "python-dotenv==1.0.0",
    "psycopg2-binary==2.9.9",
    "supabase==2.0.3",
    "python-jose[cryptography]==3.3.0",
    "cryptography==41.0.7",
    "requests==2.31.0",
    "httpx==0.25.2",
]

[project.optional-dependencies]
dev = [
    "pytest==7.4.3",
    "pytest-asyncio==0.21.1",
    "pytest-cov==4.1.0",
    "pytest-mock==3.12.0",
    "black==23.12.0",
    "ruff==0.1.8",
]

[tool.black]
line-length = 100
target-version = ["py311"]

[tool.ruff]
line-length = 100
target-version = "py311"
select = ["E", "F", "W"]

[tool.pytest.ini_options]
testpaths = ["tests"]
asyncio_mode = "auto"
addopts = "--cov=app --cov-report=term-missing"
```

### Step 3: Create app/__init__.py

Empty file (package marker).

### Step 4: Create app/main.py

```python
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="Content Engine Backend API",
    description="FastAPI microservice for brand kit management, content generation, and distribution",
    version="0.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "https://content-engine.onrender.com"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
async def health_check():
    """Health check endpoint for Render."""
    return {"status": "ok"}


@app.get("/")
async def root():
    """Root endpoint."""
    return {"message": "Content Engine Backend API"}
```

### Step 5: Create .env.example

```bash
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/content_engine

# Supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=eyJhbGc...
SUPABASE_JWT_SECRET=your-jwt-secret

# Anthropic
ANTHROPIC_API_KEY=sk-ant-...

# Platform APIs (optional for local dev)
X_API_BEARER_TOKEN=
LINKEDIN_API_TOKEN=
INSTAGRAM_BUSINESS_ACCOUNT_ID=
REDDIT_CLIENT_ID=
REDDIT_CLIENT_SECRET=

# Email Services
MAILCHIMP_API_KEY=
SENDGRID_API_KEY=

# Job Queue
CLOUDMQ_CONNECTION_STRING=

# App Config
ENVIRONMENT=development
DEBUG=true
RENDER_EXTERNAL_URL=http://localhost:8000
```

### Step 6: Create .gitignore

```
# Python
__pycache__/
*.py[cod]
*$py.class
*.so
.Python
build/
develop-eggs/
dist/
downloads/
eggs/
.eggs/
lib/
lib64/
parts/
sdist/
var/
wheels/
*.egg-info/
.installed.cfg
*.egg

# Virtual Environments
venv/
ENV/
env/
.venv

# IDE
.vscode/
.idea/
*.swp
*.swo
*~
.DS_Store

# Environment
.env
.env.local
.env.*.local

# Testing
.pytest_cache/
.coverage
htmlcov/
.tox/

# Alembic
alembic/versions/__pycache__/

# Temporary
*.tmp
*.log
```

## Verification Checklist

- [ ] All files created in correct locations
- [ ] `pip install -r requirements.txt` succeeds (or `pip install -e ".[dev]"` from pyproject.toml)
- [ ] `python -m venv venv && source venv/bin/activate` works (Windows: `venv\Scripts\activate`)
- [ ] `uvicorn app.main:app --reload` starts without errors
- [ ] Server responds to `GET http://localhost:8000/health` with `{"status": "ok"}`
- [ ] Swagger UI loads at `GET http://localhost:8000/docs`
- [ ] `black --check app/` passes (no formatting needed)
- [ ] `ruff check app/` passes (no lint errors)
- [ ] Git repository initialized: `git status` shows clean working tree

## Commit Message

```
feat: initialize FastAPI project structure with dependencies and basic endpoints
```

## Notes

- Do NOT create the full project structure (models, services, routes, etc.) yet — that comes in subsequent tasks
- Focus only on the foundation: project config, health check, and CORS middleware
- Do NOT implement database connection or auth middleware in this task
