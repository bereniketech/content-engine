# Task Plan: Content Engine Backend Implementation

**Project:** content-engine-backend (FastAPI microservice)  
**Status:** Ready for implementation  
**Date Created:** 2026-04-24  

---

## Overview

This document breaks down the 7-phase implementation plan into concrete, self-contained tasks. Each task is executable independently with step-by-step guidance.

**Approval Status:**
- Requirements: ✓ Approved (in `.spec/requirements.md`)
- Design: ✓ Approved (in `.spec/design.md`)
- Skills selected: ✓ (in `.claude/CLAUDE.md`)
- Deployment config: ✓ (in `.claude/project-config.md`)

**Ready to start Phase 1 (Foundation).**

---

## Phase 1: Foundation — Database Schema & Auth Middleware

### Task 1.1: Create FastAPI Project Structure

**Goal:** Set up Python project with FastAPI, SQLAlchemy, environment variables.

**Files to Create:**
1. `requirements.txt` — Python dependencies
2. `app/main.py` — FastAPI application entry point
3. `.env.example` — Template for environment variables
4. `pyproject.toml` — Project metadata + tool config (black, ruff)
5. `.gitignore` — Ignore `.env`, `__pycache__`, `venv/`, `.pytest_cache/`

**Implementation Steps:**

1. Create `requirements.txt`:
```
fastapi==0.104.1
uvicorn==0.24.0
sqlalchemy==2.0.23
psycopg2-binary==2.9.9
pydantic==2.5.0
pydantic-settings==2.1.0
python-dotenv==1.0.0
httpx==0.25.1
anthropic==0.7.1
pytest==7.4.3
pytest-asyncio==0.21.1
slowapi==0.1.9
```

2. Create `app/__init__.py` (empty):
```python
# Package marker
```

3. Create `app/main.py`:
```python
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(
    title="Content Engine Backend API",
    version="0.1.0",
    description="FastAPI microservice for brand kit management, content generation, and distribution",
)

# CORS middleware
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

# Import routes here (Phase 2+)
```

4. Create `.env.example`:
```
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/content_engine

# Supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_JWT_SECRET=your-jwt-secret

# Anthropic
ANTHROPIC_API_KEY=sk-ant-...

# Platform APIs (optional for local)
X_API_BEARER_TOKEN=
LINKEDIN_API_TOKEN=
INSTAGRAM_BUSINESS_ACCOUNT_ID=
REDDIT_CLIENT_ID=
REDDIT_CLIENT_SECRET=

# Email
MAILCHIMP_API_KEY=
SENDGRID_API_KEY=

# Job Queue
CLOUDMQ_CONNECTION_STRING=

# App Config
ENVIRONMENT=development
DEBUG=true
RENDER_EXTERNAL_URL=http://localhost:8000
```

5. Create `pyproject.toml`:
```toml
[build-system]
requires = ["setuptools", "wheel"]
build-backend = "setuptools.build_meta"

[project]
name = "content-engine-backend"
version = "0.1.0"
description = "FastAPI microservice for content generation"

[tool.black]
line-length = 100
target-version = ["py311"]

[tool.ruff]
line-length = 100
target-version = "py311"
extend-select = ["I"]  # isort compatibility

[tool.pytest.ini_options]
testpaths = ["tests"]
asyncio_mode = "auto"
```

6. Create `.gitignore`:
```
.env
.env.local
.env.*.local
__pycache__/
*.py[cod]
*$py.class
.pytest_cache/
.coverage
htmlcov/
dist/
build/
*.egg-info/
venv/
.venv/
.idea/
.vscode/
```

**Tests:**
- [ ] `pip install -r requirements.txt` succeeds
- [ ] `uvicorn app.main:app --reload` starts without errors
- [ ] `GET http://localhost:8000/health` returns `{"status": "ok"}`
- [ ] `GET http://localhost:8000/docs` loads Swagger UI

**Commit:** `feat: initialize FastAPI project structure`

---

### Task 1.2: Create SQLAlchemy ORM Models

**Goal:** Define database models for all 13 tables (from design).

**Files to Create:**
1. `app/models/__init__.py` — Export all models
2. `app/models/base.py` — Base model with workspace_id, timestamps
3. `app/models/brand_kit.py` — BrandKit, BrandKitVersion, VisualIdentity, etc.
4. `app/models/content.py` — GeneratedContent, GeneratedPost
5. `app/models/metrics.py` — PostMetrics, FeedbackInsight
6. `app/models/newsjacking.py` — NewsjackingTopic
7. `app/models/jobs.py` — Job, JobLog (for CloudMQ tracking)

**Implementation Pattern:**

```python
# app/models/base.py
from sqlalchemy import Column, DateTime, String, func
from sqlalchemy.orm import declarative_base
from uuid import uuid4

Base = declarative_base()

class BaseModel(Base):
    __abstract__ = True
    
    workspace_id = Column(String(36), nullable=False, index=True)
    created_at = Column(DateTime, default=func.now(), nullable=False)
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())

# app/models/brand_kit.py
from sqlalchemy import Column, String, Integer, Boolean, JSON, ForeignKey, DateTime, func
from uuid import uuid4
from .base import BaseModel

class BrandKit(BaseModel):
    __tablename__ = "brand_kits"
    
    id = Column(String(36), primary_key=True, default=lambda: str(uuid4()))
    workspace_id = Column(String(36), ForeignKey("workspaces.id"), nullable=False)
    name = Column(String(255), nullable=False)
    version = Column(Integer, default=1)
    is_active = Column(Boolean, default=False)
    approved_at = Column(DateTime, nullable=True)
    created_by = Column(String(36), nullable=True)  # user_id
    
    # JSONB columns for flexible schema
    visual_identity = Column(JSON, default={})
    content_identity = Column(JSON, default={})
    platform_overrides = Column(JSON, default={})
    performance_benchmarks = Column(JSON, default={})
```

**Schema Checklist:**
- [ ] workspaces table
- [ ] brand_kits table + versions
- [ ] brand_visual_identity, brand_content_identity, etc. (or JSONB columns)
- [ ] generated_content + generated_posts
- [ ] post_metrics
- [ ] feedback_insights
- [ ] newsjacking_topics
- [ ] jobs + job_logs
- [ ] All tables have workspace_id + timestamps
- [ ] All foreign keys reference workspace_id

**Tests:**
- [ ] `from app.models import *` imports without error
- [ ] All models have `workspace_id`, `created_at`, `updated_at`
- [ ] SQLAlchemy can create tables: `metadata.create_all(engine)`

**Commit:** `feat: create SQLAlchemy ORM models for all tables`

---

### Task 1.3: Create Database Connection & Migrations

**Goal:** Set up PostgreSQL connection pool, Alembic migrations.

**Files to Create:**
1. `app/core/config.py` — Environment variables (pydantic Settings)
2. `app/core/database.py` — SQLAlchemy engine + session management
3. `alembic/` directory — Migration system
4. `alembic/env.py` — Alembic config
5. `alembic/versions/0001_initial_schema.py` — First migration

**Implementation:**

1. Create `app/core/config.py`:
```python
from pydantic_settings import BaseSettings
from typing import Optional

class Settings(BaseSettings):
    DATABASE_URL: str
    SUPABASE_URL: str
    SUPABASE_JWT_SECRET: str
    ANTHROPIC_API_KEY: str
    X_API_BEARER_TOKEN: Optional[str] = None
    LINKEDIN_API_TOKEN: Optional[str] = None
    CLOUDMQ_CONNECTION_STRING: Optional[str] = None
    ENVIRONMENT: str = "development"
    DEBUG: bool = False
    RENDER_EXTERNAL_URL: str = "http://localhost:8000"
    
    class Config:
        env_file = ".env"
        case_sensitive = True

settings = Settings()
```

2. Create `app/core/database.py`:
```python
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, Session
from .config import settings

engine = create_engine(
    settings.DATABASE_URL,
    echo=settings.DEBUG,
    pool_size=20,
    max_overflow=40,
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def get_db() -> Session:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
```

3. Initialize Alembic:
```bash
cd app && alembic init alembic
```

4. Create migration:
```bash
alembic revision --autogenerate -m "Initial schema"
```

**Tests:**
- [ ] `from app.core.config import settings` imports
- [ ] Database connection works: `engine.connect()`
- [ ] Alembic migration file created
- [ ] `alembic upgrade head` applies migration to local DB

**Commit:** `feat: set up database connection and Alembic migrations`

---

### Task 1.4: Implement Auth Middleware (Supabase JWT)

**Goal:** Validate JWT tokens, extract workspace_id, enforce auth on all endpoints.

**Files to Create:**
1. `app/core/auth.py` — JWT validation logic
2. `app/middleware/auth.py` — FastAPI middleware

**Implementation:**

```python
# app/core/auth.py
import jwt
from fastapi import HTTPException, status
from .config import settings

def verify_token(token: str) -> dict:
    """Verify Supabase JWT token and return payload."""
    try:
        payload = jwt.decode(
            token,
            settings.SUPABASE_JWT_SECRET,
            algorithms=["HS256"],
            audience="authenticated"
        )
        return payload
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")

# app/middleware/auth.py
from fastapi import Request, HTTPException, status
from app.core.auth import verify_token

async def auth_middleware(request: Request, call_next):
    """Extract JWT token, validate, add to request.state."""
    # Skip auth for health check and docs
    if request.url.path in ["/health", "/docs", "/openapi.json", "/"]:
        return await call_next(request)
    
    auth_header = request.headers.get("Authorization")
    if not auth_header or not auth_header.startswith("Bearer "):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Missing token")
    
    token = auth_header[7:]  # Remove "Bearer " prefix
    payload = verify_token(token)
    
    request.state.user_id = payload.get("sub")
    request.state.workspace_id = payload.get("workspace_id")
    request.state.email = payload.get("email")
    
    return await call_next(request)
```

**Tests:**
- [ ] Valid JWT → middleware adds to request.state
- [ ] Invalid JWT → 401 Unauthorized
- [ ] Missing Authorization header → 401 Unauthorized
- [ ] /health endpoint doesn't require auth
- [ ] /docs accessible without auth

**Commit:** `feat: implement Supabase JWT authentication middleware`

---

### Task 1.5: Add Error Handling & Response Models

**Goal:** Standardize error responses, create Pydantic response models.

**Files to Create:**
1. `app/core/errors.py` — Custom exception classes
2. `app/schemas/` directory — Pydantic response models
3. `app/middleware/error_handler.py` — Global error handler

**Implementation:**

```python
# app/core/errors.py
from fastapi import HTTPException, status

class WorkspaceAccessDenied(HTTPException):
    def __init__(self):
        super().__init__(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={"error": "forbidden", "message": "Access denied"}
        )

class NotFound(HTTPException):
    def __init__(self, resource: str):
        super().__init__(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"error": "not_found", "message": f"{resource} not found"}
        )

# app/schemas/__init__.py
from pydantic import BaseModel
from typing import Optional, Dict, Any

class ErrorResponse(BaseModel):
    error: str
    message: str
    details: Optional[Dict[str, Any]] = None

class SuccessResponse(BaseModel):
    status: str = "success"
    data: Dict[str, Any]
```

**Tests:**
- [ ] Error responses follow JSON format
- [ ] 400 Validation error returns details
- [ ] 401 Unauthorized returns proper error code
- [ ] 403 Forbidden returns proper error code
- [ ] 404 Not Found returns proper error code
- [ ] 500 Server error doesn't expose stack trace

**Commit:** `feat: add error handling and response models`

---

## Phase 2: Brand Kit Service — CRUD & Versioning

### Task 2.1: Create Brand Kit CRUD Endpoints

**Goal:** Implement POST/GET/PATCH brand kit endpoints.

**Files to Create/Modify:**
1. `app/api/routes/brand_kits.py` — Brand kit endpoints
2. `app/services/brand_kit_service.py` — Business logic
3. `app/schemas/brand_kit.py` — Request/response models

**Endpoints:**
```
POST   /brand-kits                    → Create
GET    /brand-kits                    → List
GET    /brand-kits/{id}               → Get one
PATCH  /brand-kits/{id}               → Update
DELETE /brand-kits/{id}               → Soft delete
```

**Implementation Pattern:**

```python
# app/api/routes/brand_kits.py
from fastapi import APIRouter, Depends, Request
from app.core.database import get_db
from app.services.brand_kit_service import BrandKitService

router = APIRouter(prefix="/brand-kits", tags=["brand-kits"])

@router.post("")
async def create_brand_kit(
    request: Request,
    data: CreateBrandKitRequest,
    db: Session = Depends(get_db)
):
    """Create new brand kit."""
    workspace_id = request.state.workspace_id
    service = BrandKitService(db)
    kit = service.create_kit(workspace_id, data.name)
    return {"id": kit.id, "name": kit.name, "version": kit.version}

@router.get("/{kit_id}")
async def get_brand_kit(
    request: Request,
    kit_id: str,
    db: Session = Depends(get_db)
):
    """Get brand kit by ID."""
    workspace_id = request.state.workspace_id
    service = BrandKitService(db)
    kit = service.get_kit(kit_id, workspace_id)
    if not kit:
        raise NotFound("Brand kit")
    return kit.to_dict()
```

**Tests:**
- [ ] POST /brand-kits creates and returns new kit
- [ ] GET /brand-kits lists all kits in workspace
- [ ] GET /brand-kits/{id} returns single kit
- [ ] PATCH /brand-kits/{id} updates fields
- [ ] DELETE /brand-kits/{id} soft-deletes
- [ ] Cannot access kit from different workspace (403)

**Commit:** `feat: implement brand kit CRUD endpoints`

---

### Task 2.2: Implement Brand Kit Versioning

**Goal:** Implement approve, activate, revert, version history endpoints.

**Endpoints:**
```
POST   /brand-kits/{id}/approve        → Increment version
POST   /brand-kits/{id}/activate       → Set is_active=true
GET    /brand-kits/{id}/versions       → List versions
POST   /brand-kits/{id}/revert         → Revert to old version
```

**Implementation:**

```python
# app/services/brand_kit_service.py
class BrandKitService:
    def approve(self, kit_id: str, workspace_id: str, reason: str):
        """Approve kit, increment version."""
        kit = self.get_kit(kit_id, workspace_id)
        if not kit:
            raise NotFound("Brand kit")
        
        # Check if already approved (cannot modify)
        if kit.approved_at:
            raise HTTPException(status_code=409, detail="Kit already approved")
        
        # Create version record
        version = BrandKitVersion(
            brand_kit_id=kit_id,
            version=kit.version + 1,
            approved_at=func.now(),
            reason=reason,
            changes=self._compute_changes(kit)
        )
        kit.version += 1
        kit.approved_at = func.now()
        self.db.add(version)
        self.db.commit()
        return kit
    
    def activate(self, kit_id: str, workspace_id: str):
        """Activate kit, deactivate all others."""
        kit = self.get_kit(kit_id, workspace_id)
        if not kit:
            raise NotFound("Brand kit")
        
        # Deactivate all others in workspace
        self.db.query(BrandKit).filter(
            BrandKit.workspace_id == workspace_id,
            BrandKit.is_active == True
        ).update({BrandKit.is_active: False})
        
        kit.is_active = True
        self.db.commit()
        return kit
    
    def get_versions(self, kit_id: str, workspace_id: str):
        """Get all versions of a kit."""
        # Check workspace access
        kit = self.get_kit(kit_id, workspace_id)
        if not kit:
            raise NotFound("Brand kit")
        
        versions = self.db.query(BrandKitVersion).filter(
            BrandKitVersion.brand_kit_id == kit_id
        ).order_by(BrandKitVersion.version.desc()).all()
        
        return versions
```

**Tests:**
- [ ] POST /approve increments version
- [ ] POST /activate sets is_active=true
- [ ] GET /versions returns all versions
- [ ] POST /revert creates new unapproved version
- [ ] Cannot modify approved kit

**Commit:** `feat: implement brand kit versioning and approval workflow`

---

## Phase 3: Content Generation Service

### Task 3.1: Create Content Generation Job Queuing

**Goal:** Queue content generation jobs to CloudMQ, return 202 Accepted.

**Endpoint:**
```
POST /generate-content
  Request: { topic, source_type, brand_kit_id }
  Response: { job_id, status: "pending" }
  (202 Accepted)
```

**Files:**
1. `app/services/content_generation_service.py`
2. `app/api/routes/content.py`
3. `app/schemas/content.py`

**Implementation:**

```python
# app/services/content_generation_service.py
from app.core.cloudmq import cloudmq_client

class ContentGenerationService:
    def queue_generation(self, workspace_id: str, topic: str, source_type: str, brand_kit_id: str):
        """Queue content generation job."""
        
        # Validate brand kit exists in workspace
        kit = self.db.query(BrandKit).filter(
            BrandKit.id == brand_kit_id,
            BrandKit.workspace_id == workspace_id
        ).first()
        
        if not kit:
            raise NotFound("Brand kit")
        
        # Create job record
        job = Job(
            workspace_id=workspace_id,
            job_type="content_generation",
            status="pending",
            payload={
                "topic": topic,
                "source_type": source_type,
                "brand_kit_id": brand_kit_id
            }
        )
        self.db.add(job)
        self.db.commit()
        
        # Queue to CloudMQ
        cloudmq_job = cloudmq_client.queue(
            queue="content_generation",
            payload=job.payload,
            metadata={"job_id": job.id, "workspace_id": workspace_id}
        )
        
        # Store CloudMQ job ID
        job.cloudmq_job_id = cloudmq_job.id
        self.db.commit()
        
        return job

# app/api/routes/content.py
@router.post("/generate-content", status_code=202)
async def generate_content(
    request: Request,
    data: GenerateContentRequest,
    db: Session = Depends(get_db)
):
    """Queue content generation job."""
    service = ContentGenerationService(db)
    job = service.queue_generation(
        request.state.workspace_id,
        data.topic,
        data.source_type,
        data.brand_kit_id
    )
    return {"job_id": job.id, "status": "pending"}
```

**Tests:**
- [ ] POST /generate-content returns 202 Accepted
- [ ] Job created in database with status="pending"
- [ ] CloudMQ job queued successfully
- [ ] GET /jobs/{job_id} returns pending status
- [ ] Invalid brand_kit_id returns 404

**Commit:** `feat: implement content generation job queuing`

---

### Task 3.2: Implement Claude API Integration

**Goal:** Create background worker task to call Claude API with platform-specific prompts.

**Files:**
1. `app/worker.py` — Background worker entry point
2. `app/services/claude_service.py` — Claude API wrapper
3. `app/services/prompt_builder.py` — Platform-specific prompt building

**Implementation:**

```python
# app/worker.py
from app.core.cloudmq import cloudmq_client
from app.core.database import SessionLocal
from app.services.content_generation_service import ContentGenerationService
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

@cloudmq_client.task(queue="content_generation")
def process_content_generation(job_id: str, workspace_id: str, payload: dict):
    """Background worker: generate content via Claude."""
    db = SessionLocal()
    try:
        service = ContentGenerationService(db)
        job = service.get_job(job_id)
        job.status = "processing"
        db.commit()
        
        # Load brand kit
        topic = payload["topic"]
        brand_kit_id = payload["brand_kit_id"]
        kit = service.get_brand_kit(brand_kit_id, workspace_id)
        
        # Generate content for all platforms
        platforms = ["x", "linkedin", "instagram", "reddit", "email"]
        generated_posts = {}
        
        for platform in platforms:
            content = service.generate_content(topic, kit, platform)
            generated_posts[platform] = content
        
        # Store results
        generated_content = GeneratedContent(
            workspace_id=workspace_id,
            brand_kit_id=brand_kit_id,
            topic=topic,
            source_type=payload["source_type"],
            content_data={"posts": generated_posts}
        )
        db.add(generated_content)
        
        # Create generated_posts records
        for platform, content in generated_posts.items():
            post = GeneratedPost(
                generated_content_id=generated_content.id,
                platform=platform,
                content=content
            )
            db.add(post)
        
        db.commit()
        
        # Update job
        job.status = "completed"
        job.result = {"generated_content_id": str(generated_content.id)}
        db.commit()
        
        logger.info(f"Content generation job {job_id} completed")
        
    except Exception as e:
        logger.error(f"Content generation job {job_id} failed: {e}")
        job.status = "failed"
        job.error_message = str(e)
        if job.retry_count < 3:
            job.retry_count += 1
            # Re-queue with backoff
            cloudmq_client.queue("content_generation", payload, delay=2 ** job.retry_count)
        db.commit()
    finally:
        db.close()

if __name__ == "__main__":
    cloudmq_client.start()

# app/services/claude_service.py
from anthropic import Anthropic

class ClaudeService:
    def __init__(self, api_key: str):
        self.client = Anthropic(api_key=api_key)
    
    def generate_content(self, prompt: str) -> str:
        """Call Claude API to generate content."""
        message = self.client.messages.create(
            model="claude-3-5-sonnet-20241022",
            max_tokens=1024,
            messages=[
                {"role": "user", "content": prompt}
            ]
        )
        return message.content[0].text

# app/services/prompt_builder.py
class PromptBuilder:
    @staticmethod
    def build_linkedin_prompt(topic: str, brand_kit: dict) -> str:
        """LinkedIn: 50-word hook, first-person, save optimization."""
        return f"""
Generate LinkedIn content about '{topic}' following these rules:
- Write a 50-word hook in first person
- Focus on save-optimization (frameworks, checklists)
- Use tone: {brand_kit.get('tone', 'professional')}
- Brand voice: {brand_kit.get('voice_descriptor', 'authoritative')}

Generate only the hook, no extras.
        """
    
    @staticmethod
    def build_x_prompt(topic: str, brand_kit: dict) -> str:
        """X: Thread format (1/N), ≤280 chars per tweet, real-time voice."""
        return f"""
Generate an X thread about '{topic}' with these rules:
- Format as numbered tweets (1/3, 2/3, 3/3)
- Each tweet ≤ 280 characters
- Use real-time, conversational voice
- Brand voice: {brand_kit.get('voice_descriptor', 'casual')}

Generate the full thread.
        """
    
    # ... similar for Instagram, Reddit, Email
```

**Tests:**
- [ ] Background worker receives job from CloudMQ
- [ ] Claude API called with correct prompt
- [ ] Generated content stored in database
- [ ] Job status updated to "completed"
- [ ] On error: job marked "failed", not retried indefinitely
- [ ] GET /jobs/{job_id} returns generated content in result

**Commit:** `feat: implement Claude API integration and background worker`

---

## Phase 4: Platform Distribution Service

### Task 4.1: Implement Distribution Job Queueing

**Goal:** Queue distribution jobs, return 202 Accepted.

**Endpoint:**
```
POST /platform-distribution
  Request: { content_id, platforms: ["x", "linkedin", ...] }
  Response: { job_id, status: "pending" }
```

**Implementation:**

Similar to Task 3.1, create:
1. `app/services/distribution_service.py`
2. `app/api/routes/distribution.py`
3. Queue job to `platform_distribution` CloudMQ queue

**Tests:**
- [ ] POST /platform-distribution returns 202
- [ ] Job queued for each platform
- [ ] GET /jobs/{job_id} returns pending status

**Commit:** `feat: implement platform distribution job queuing`

---

### Task 4.2: Implement Platform API Integrations

**Goal:** Implement posting to X, LinkedIn, Instagram, Reddit, Email.

**Files:**
1. `app/services/x_service.py` — X/Twitter API
2. `app/services/linkedin_service.py` — LinkedIn API
3. `app/services/instagram_service.py` — Instagram Business API
4. `app/services/reddit_service.py` — Reddit API
5. `app/services/email_service.py` — Mailchimp/SendGrid

**Background Worker Task:**

```python
@cloudmq_client.task(queue="platform_distribution")
def process_distribution(job_id: str, workspace_id: str, payload: dict):
    """Background worker: post to platforms."""
    db = SessionLocal()
    try:
        service = DistributionService(db)
        job = service.get_job(job_id)
        job.status = "processing"
        db.commit()
        
        content_id = payload["content_id"]
        platforms = payload.get("platforms", ["x", "linkedin", "instagram", "reddit", "email"])
        
        content = service.get_content(content_id, workspace_id)
        results = {}
        
        for platform in platforms:
            try:
                if platform == "x":
                    result = service.post_to_x(content)
                elif platform == "linkedin":
                    result = service.post_to_linkedin(content)
                # ... etc for other platforms
                results[platform] = {"status": "posted", "post_id": result["id"]}
            except Exception as e:
                logger.error(f"Failed to post to {platform}: {e}")
                results[platform] = {"status": "failed", "error": str(e)}
        
        # Store results in database
        for platform, result in results.items():
            platform_result = PlatformDistributionResult(
                generated_content_id=content_id,
                platform=platform,
                result_data=result
            )
            db.add(platform_result)
        
        db.commit()
        job.status = "completed"
        job.result = results
        db.commit()
        
    except Exception as e:
        logger.error(f"Distribution job {job_id} failed: {e}")
        job.status = "failed"
        job.error_message = str(e)
        db.commit()
    finally:
        db.close()
```

**Tests:**
- [ ] POST to X succeeds, returns tweet_id
- [ ] POST to LinkedIn succeeds, returns post_id
- [ ] POST to Instagram succeeds, returns carousel_id
- [ ] POST to Reddit succeeds, returns submission_id
- [ ] Email campaign created in Mailchimp/SendGrid
- [ ] Partial success returned (e.g., X posted, LinkedIn failed)
- [ ] No retry on platform API failure (log only)

**Commit:** `feat: implement multi-platform content distribution`

---

## Phase 5: Metrics & Feedback Loop

### Task 5.1: Implement Metrics Ingestion

**Goal:** Accept POST /metrics with performance data.

**Endpoint:**
```
POST /metrics/{post_id}
  Request: { impressions, saves, likes, comments, shares, clicks?, conversions? }
  Response: { id, recorded_at }

GET /metrics/{post_id}
  Response: [ { impressions, saves, ..., recorded_at }, ... ]
```

**Files:**
1. `app/api/routes/metrics.py`
2. `app/services/metrics_service.py`

**Implementation:**

```python
# app/api/routes/metrics.py
@router.post("/metrics/{post_id}")
async def ingest_metrics(
    request: Request,
    post_id: str,
    data: MetricsRequest,
    db: Session = Depends(get_db)
):
    """Ingest performance metrics for a post."""
    service = MetricsService(db)
    metric = service.ingest_metrics(
        request.state.workspace_id,
        post_id,
        data.dict()
    )
    
    # Queue feedback loop analysis
    service.queue_feedback_analysis(request.state.workspace_id, post_id)
    
    return {"id": metric.id, "recorded_at": metric.recorded_at}

@router.get("/metrics/{post_id}")
async def get_metrics(
    request: Request,
    post_id: str,
    db: Session = Depends(get_db)
):
    """Get all metrics for a post."""
    service = MetricsService(db)
    metrics = service.get_post_metrics(request.state.workspace_id, post_id)
    return [m.to_dict() for m in metrics]
```

**Tests:**
- [ ] POST /metrics/{post_id} stores metrics
- [ ] GET /metrics/{post_id} returns all recorded metrics
- [ ] Validates non-negative integers
- [ ] Feedback loop job queued on POST
- [ ] Cannot access metrics from different workspace (403)

**Commit:** `feat: implement metrics ingestion endpoint`

---

### Task 5.2: Implement Feedback Loop Engine

**Goal:** Analyze metrics, extract patterns, generate insights.

**Files:**
1. `app/services/feedback_loop_service.py`
2. Background worker task for `metrics_analysis` queue

**Implementation:**

```python
class FeedbackLoopService:
    def analyze_metrics(self, brand_kit_id: str, workspace_id: str):
        """Analyze post metrics, generate insights."""
        
        # Aggregate metrics from last 30 days
        cutoff = datetime.now() - timedelta(days=30)
        metrics = self.db.query(PostMetrics).join(GeneratedPost).join(GeneratedContent).filter(
            GeneratedContent.brand_kit_id == brand_kit_id,
            PostMetrics.recorded_at >= cutoff
        ).all()
        
        # Group by tone, platform, format
        insights = self._extract_patterns(metrics, brand_kit_id)
        
        # Store insights
        for insight in insights:
            db_insight = FeedbackInsight(
                brand_kit_id=brand_kit_id,
                insight_type=insight["type"],
                insight_text=insight["text"],
                impact_metric=insight["metric"],
                confidence=insight["confidence"],
                recommendation=insight["recommendation"],
                applied=False
            )
            self.db.add(db_insight)
        
        self.db.commit()
        return insights
    
    def _extract_patterns(self, metrics, brand_kit_id):
        """Extract correlations between content attributes and performance."""
        patterns = {}
        
        for metric in metrics:
            post = metric.generated_post
            content = post.generated_content
            
            key = (content.platform, content.tone, content.format)
            if key not in patterns:
                patterns[key] = {"count": 0, "metrics": []}
            
            patterns[key]["count"] += 1
            patterns[key]["metrics"].append({
                "saves": metric.saves,
                "likes": metric.likes,
                "engagement": (metric.likes + metric.saves + metric.comments) / (metric.impressions or 1)
            })
        
        insights = []
        for (platform, tone, format), data in patterns.items():
            avg_engagement = sum(m["engagement"] for m in data["metrics"]) / len(data["metrics"])
            confidence = min(1.0, len(data["metrics"]) / 10)  # Higher confidence with more data
            
            if confidence >= 0.7:
                insights.append({
                    "type": "tone_performance",
                    "text": f"Tone '{tone}' on {platform} avg engagement: {avg_engagement:.1%}",
                    "metric": "engagement",
                    "confidence": confidence,
                    "recommendation": f"Consider using '{tone}' more on {platform}"
                })
        
        return insights

@cloudmq_client.task(queue="metrics_analysis")
def process_metrics_analysis(job_id: str, workspace_id: str, payload: dict):
    """Background worker: analyze metrics and generate insights."""
    db = SessionLocal()
    try:
        service = FeedbackLoopService(db)
        insights = service.analyze_metrics(payload["brand_kit_id"], workspace_id)
        
        job = service.get_job(job_id)
        job.status = "completed"
        job.result = {"insights_count": len(insights)}
        db.commit()
    except Exception as e:
        logger.error(f"Metrics analysis failed: {e}")
        job.status = "failed"
        job.error_message = str(e)
        db.commit()
    finally:
        db.close()
```

**Endpoints:**

```
GET /insights/{brand_kit_id}
  Response: [ { id, type, text, confidence, recommendation, applied }, ... ]

POST /insights/{insight_id}/approve
  Request: { apply: true|false }
  Response: { id, applied, version_updated? }
```

**Tests:**
- [ ] Background worker analyzes metrics
- [ ] Insights generated with confidence scores
- [ ] Only insights with confidence ≥0.7 stored
- [ ] GET /insights returns pending insights
- [ ] POST /approve applies insight to brand kit
- [ ] Brand kit version incremented on approval

**Commit:** `feat: implement feedback loop engine and insight generation`

---

## Phase 6: Newsjacking

### Task 6.1: Implement Trending Topics Sourcing

**Goal:** Fetch trending topics from X Trends + NewsAPI, filter by relevance.

**Endpoint:**
```
GET /newsjacking/topics
  Query: { limit: 10 }
  Response: [ { id, topic_title, trend_source, relevance_score, momentum_score, expires_at }, ... ]
```

**Files:**
1. `app/services/newsjacking_service.py`
2. `app/api/routes/newsjacking.py`
3. `app/integrations/x_trends.py`
4. `app/integrations/newsapi.py`

**Implementation:**

```python
class NewsjackingService:
    def fetch_trending_topics(self, workspace_id: str, brand_kit_id: str, limit: int = 10):
        """Fetch trending topics from X + NewsAPI, filter and rank."""
        
        # Get brand kit pillars
        brand_kit = self.db.query(BrandKit).filter(
            BrandKit.id == brand_kit_id,
            BrandKit.workspace_id == workspace_id
        ).first()
        
        if not brand_kit:
            raise NotFound("Brand kit")
        
        pillars = brand_kit.content_identity.get("content_pillars", [])
        
        # Fetch from X Trends
        x_trends = self._fetch_x_trends()
        
        # Fetch from NewsAPI
        news_trends = self._fetch_news_trends()
        
        # Merge + deduplicate
        all_trends = x_trends + news_trends
        
        # Score and rank
        ranked = []
        for trend in all_trends:
            relevance = self._score_relevance(trend["title"], pillars)
            momentum = self._score_momentum(trend)
            
            if relevance > 0.3 or momentum > 0.5:  # Threshold
                ranked.append({
                    "title": trend["title"],
                    "source": trend["source"],
                    "relevance_score": relevance,
                    "momentum_score": momentum,
                    "context": trend.get("description", ""),
                    "expires_at": datetime.now() + timedelta(hours=6)
                })
        
        # Sort by relevance + momentum
        ranked.sort(key=lambda x: x["relevance_score"] * 0.6 + x["momentum_score"] * 0.4, reverse=True)
        
        # Store in DB + return top N
        saved_topics = []
        for trend in ranked[:limit]:
            topic = NewsjackingTopic(
                workspace_id=workspace_id,
                brand_kit_id=brand_kit_id,
                topic_title=trend["title"],
                trend_source=trend["source"],
                relevance_score=trend["relevance_score"],
                momentum_score=trend["momentum_score"],
                context=trend["context"],
                expires_at=trend["expires_at"]
            )
            self.db.add(topic)
            saved_topics.append(topic)
        
        self.db.commit()
        return saved_topics
    
    def _score_relevance(self, trend_title: str, pillars: list) -> float:
        """Score relevance (0-1) based on content pillars."""
        score = 0
        keywords = trend_title.lower().split()
        
        for pillar in pillars:
            pillar_keywords = pillar.lower().split()
            matches = sum(1 for kw in keywords if kw in pillar_keywords)
            score += matches / len(keywords)
        
        return min(1.0, score)
    
    def _score_momentum(self, trend: dict) -> float:
        """Score momentum (0-1) based on engagement/popularity."""
        # Higher if trending on multiple sources or high engagement
        engagement = trend.get("engagement_count", 0)
        return min(1.0, engagement / 10000)  # Normalize
```

**Tests:**
- [ ] GET /newsjacking/topics returns trending topics
- [ ] Topics filtered by relevance to content pillars
- [ ] Topics ranked by relevance + momentum
- [ ] Expired topics excluded
- [ ] Cannot access topics from different workspace (403)

**Commit:** `feat: implement trending topics sourcing and filtering`

---

### Task 6.2: Implement Newsjacking Content Generation

**Goal:** Generate content for trending topics with newsjacking-specific prompts.

**Endpoint:**
```
POST /newsjacking/generate
  Request: { topic_id, brand_kit_id }
  Response: { job_id, status: "pending" }
```

**Implementation:**

Similar to Task 3.1-3.2, but with newsjacking-specific prompts:

```python
class PromptBuilder:
    @staticmethod
    def build_newsjacking_prompt(topic: str, brand_kit: dict) -> str:
        """Newsjacking: contextualize, answer 'so what?', urgency."""
        return f"""
Generate content about trending topic '{topic}' following these rules:
- DON'T summarize the news, contextualize it
- Answer 'So what?' — why should people care?
- Create urgency: "Post within 24-48 hours"
- Brand voice: {brand_kit.get('voice_descriptor', 'expert')}
- Tone: {brand_kit.get('tone', 'insightful')}

Generate content that ties the trend to your brand's expertise.
        """
```

**Tests:**
- [ ] POST /newsjacking/generate queues job
- [ ] Newsjacking prompts used for generation
- [ ] Generated content tagged with source_type="newsjacking"
- [ ] topic_id stored in generated_content
- [ ] GET /jobs/{job_id} returns generated content

**Commit:** `feat: implement newsjacking content generation`

---

## Phase 7: Deployment & CI/CD

### Task 7.1: Docker Setup

**Goal:** Create Dockerfile for production deployment.

**Files:**
1. `Dockerfile` — Multi-stage build for production
2. `.dockerignore` — Exclude unnecessary files

**Implementation:**

```dockerfile
FROM python:3.11-slim as builder

WORKDIR /app

# Install build dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Production stage
FROM python:3.11-slim

WORKDIR /app

# Install runtime dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    postgresql-client \
    && rm -rf /var/lib/apt/lists/*

# Copy from builder
COPY --from=builder /usr/local/lib/python3.11/site-packages /usr/local/lib/python3.11/site-packages

# Copy app code
COPY . .

# Run migrations before start (Render will run this)
RUN chmod +x ./docker-entrypoint.sh

EXPOSE 8000

ENTRYPOINT ["./docker-entrypoint.sh"]
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

**Create `docker-entrypoint.sh`:**
```bash
#!/bin/bash
set -e

# Run migrations
alembic upgrade head

# Start app
exec "$@"
```

**Tests:**
- [ ] `docker build -t content-engine-api .` succeeds
- [ ] `docker run -p 8000:8000 content-engine-api` starts
- [ ] `GET http://localhost:8000/health` returns 200

**Commit:** `feat: add Docker configuration for production deployment`

---

### Task 7.2: GitHub Actions CI/CD

**Goal:** Create CI/CD pipeline for testing and deployment.

**Files:**
1. `.github/workflows/ci.yml` — Test on push
2. `.github/workflows/deploy.yml` — Deploy on merge to main

**Implementation:**

```yaml
# .github/workflows/ci.yml
name: Tests

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main ]

jobs:
  test:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_PASSWORD: postgres
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
    
    steps:
    - uses: actions/checkout@v3
    - name: Set up Python
      uses: actions/setup-python@v4
      with:
        python-version: '3.11'
    - name: Install dependencies
      run: |
        pip install -r requirements.txt
    - name: Lint
      run: |
        black --check app/
        ruff check app/
    - name: Tests
      env:
        DATABASE_URL: postgresql://postgres:postgres@localhost/test_db
        SUPABASE_JWT_SECRET: test-secret
        ANTHROPIC_API_KEY: test-key
      run: |
        pytest --cov=app --cov-report=xml
    - name: Upload coverage
      uses: codecov/codecov-action@v3

# .github/workflows/deploy.yml
name: Deploy to Production

on:
  push:
    branches: [ main ]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v3
    - name: Deploy to Render
      run: |
        curl https://api.render.com/deploy/srv-${{ secrets.RENDER_SERVICE_ID }}?key=${{ secrets.RENDER_API_KEY }}
```

**Tests:**
- [ ] GitHub Actions runs tests on every push
- [ ] All tests pass (>90% coverage)
- [ ] Linting passes (black, ruff)
- [ ] Deploy job triggers on merge to main
- [ ] Render auto-deploys from GitHub

**Commit:** `feat: add GitHub Actions CI/CD pipeline`

---

### Task 7.3: Render Deployment Setup

**Goal:** Configure services in Render dashboard.

**Steps:**
1. Create Web Service (content-engine-api)
   - Build: `pip install -r requirements.txt`
   - Start: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
   - Health check: `/health`
   - Auto-scale: 0-3 instances

2. Create Background Worker (content-engine-worker)
   - Build: `pip install -r requirements.txt`
   - Start: `python -m app.worker`
   - Scale: 1 instance minimum

3. Set environment variables (see `.claude/project-config.md`)

4. Connect GitHub repository for auto-deploy on push to main

**Tests:**
- [ ] Web service deployed and accessible
- [ ] GET /health returns 200
- [ ] Background worker running
- [ ] CloudMQ jobs processed successfully
- [ ] Database accessible from both services

**Commit:** `infra: configure Render deployment services`

---

## Summary

This task plan covers 7 phases with 17 concrete tasks:

| Phase | Tasks | Goal |
|-------|-------|------|
| 1. Foundation | 5 | FastAPI setup, DB schema, auth middleware |
| 2. Brand Kit | 2 | CRUD + versioning |
| 3. Content Gen | 2 | Job queuing + Claude API |
| 4. Distribution | 2 | Multi-platform posting |
| 5. Metrics | 2 | Ingestion + feedback loop |
| 6. Newsjacking | 2 | Trend sourcing + generation |
| 7. Deployment | 3 | Docker + CI/CD + Render |

**Estimated Timeline:**
- Phase 1: 2–3 days (foundation + setup)
- Phase 2: 1–2 days (brand kit CRUD is straightforward)
- Phase 3: 3–5 days (Claude integration + async jobs)
- Phase 4: 4–6 days (platform APIs are complex)
- Phase 5: 3–4 days (metrics + insights)
- Phase 6: 2–3 days (newsjacking)
- Phase 7: 1–2 days (deployment + CI/CD)

**Total: 16–25 days** (depending on parallel work)

Each task is self-contained with tests and commit message. Start with Phase 1 Task 1.1.

---

**Ready to proceed?** Run `/task-handoff` to move to Phase 1 Task 1.1.
