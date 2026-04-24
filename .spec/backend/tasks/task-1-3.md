---
phase: 1
task_number: 1.3
title: Create Database Connection & Migrations
description: Set up PostgreSQL connection pool, Alembic migrations, and initial schema migration
dependencies: [1.1, 1.2]
parallel: false
estimated_time: 3 hours
---

# Task 1.3: Create Database Connection & Migrations

## Context

This task establishes database connectivity and migration infrastructure. It creates the configuration layer (Pydantic settings), SQLAlchemy connection pool, and Alembic migration system. After completion, you'll have a working migration pipeline that creates all 13 tables in PostgreSQL.

## Acceptance Criteria

- [ ] `app/core/config.py` created with Pydantic Settings class
- [ ] `app/core/database.py` created with SQLAlchemy engine and session factory
- [ ] `alembic/` directory initialized via `alembic init`
- [ ] `alembic/env.py` configured to use SQLAlchemy models (auto-migration support)
- [ ] `alembic/versions/0001_initial_schema.py` created via `alembic revision --autogenerate`
- [ ] `alembic/versions/0001_initial_schema.py` contains CREATE TABLE statements for all 13 models
- [ ] `.env` created from `.env.example` with valid DATABASE_URL
- [ ] `alembic upgrade head` successfully creates tables in local PostgreSQL
- [ ] `alembic downgrade base` successfully drops all tables (rollback test)
- [ ] Database tables created with correct columns, types, indexes
- [ ] Connection pool configured with pool_size=20, max_overflow=40
- [ ] Settings loadable via `from app.core.config import settings`

## Files to Create

1. **app/core/__init__.py** — Core module marker
2. **app/core/config.py** — Environment variables and settings
3. **app/core/database.py** — SQLAlchemy engine and session management
4. **alembic/env.py** — Alembic configuration (modified for auto-migration)
5. **alembic/script.py.mako** — Alembic template (auto-generated)
6. **alembic/versions/0001_initial_schema.py** — Initial migration
7. **.env** — Local environment file (copy from .env.example)

## Implementation Steps

### Step 1: Create app/core/__init__.py

Empty file (package marker).

### Step 2: Create app/core/config.py

```python
from pydantic_settings import BaseSettings
from typing import Optional


class Settings(BaseSettings):
    # Database
    DATABASE_URL: str
    
    # Supabase
    SUPABASE_URL: str
    SUPABASE_ANON_KEY: str
    SUPABASE_JWT_SECRET: str
    
    # Anthropic
    ANTHROPIC_API_KEY: str
    
    # Platform APIs
    X_API_BEARER_TOKEN: Optional[str] = None
    LINKEDIN_API_TOKEN: Optional[str] = None
    INSTAGRAM_BUSINESS_ACCOUNT_ID: Optional[str] = None
    REDDIT_CLIENT_ID: Optional[str] = None
    REDDIT_CLIENT_SECRET: Optional[str] = None
    
    # Email Services
    MAILCHIMP_API_KEY: Optional[str] = None
    SENDGRID_API_KEY: Optional[str] = None
    
    # Job Queue
    CLOUDMQ_CONNECTION_STRING: Optional[str] = None
    
    # App Config
    ENVIRONMENT: str = "development"
    DEBUG: bool = False
    RENDER_EXTERNAL_URL: str = "http://localhost:8000"
    
    class Config:
        env_file = ".env"
        case_sensitive = True


settings = Settings()
```

### Step 3: Create app/core/database.py

```python
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, Session
from app.core.config import settings

engine = create_engine(
    settings.DATABASE_URL,
    echo=settings.DEBUG,
    pool_size=20,
    max_overflow=40,
    pool_pre_ping=True,
    connect_args={"connect_timeout": 10},
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def get_db() -> Session:
    """Dependency injection for database session."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
```

### Step 4: Initialize Alembic

Run in the project root:

```bash
alembic init alembic
```

This creates the `alembic/` directory with boilerplate files.

### Step 5: Configure alembic/env.py for Auto-Migration

Replace `alembic/env.py` with:

```python
from logging.config import fileConfig
from sqlalchemy import engine_from_config
from sqlalchemy import pool
from alembic import context
from app.models import Base
from app.core.config import settings

config = context.config

if config.config_file_name is not None:
    fileConfig(config.config_file_name)

target_metadata = Base.metadata


def run_migrations_offline() -> None:
    """Run migrations in 'offline' mode."""
    url = settings.DATABASE_URL
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )

    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    """Run migrations in 'online' mode."""
    configuration = config.get_section(config.config_ini_section)
    configuration["sqlalchemy.url"] = settings.DATABASE_URL

    connectable = engine_from_config(
        configuration,
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )

    with connectable.connect() as connection:
        context.configure(
            connection=connection, target_metadata=target_metadata
        )

        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
```

### Step 6: Create Initial Migration

Run in the project root:

```bash
alembic revision --autogenerate -m "Initial schema with all 13 tables"
```

This creates `alembic/versions/0001_initial_schema.py` with auto-generated CREATE TABLE statements based on SQLAlchemy models.

### Step 7: Create .env from .env.example

Copy `.env.example` to `.env` and fill in valid values:

```bash
cp .env.example .env
```

Then edit `.env` with valid connection string:

```bash
DATABASE_URL=postgresql://postgres:password@localhost:5432/content_engine_dev
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=eyJhbGc...
SUPABASE_JWT_SECRET=test-secret-key
ANTHROPIC_API_KEY=sk-ant-...
ENVIRONMENT=development
DEBUG=true
RENDER_EXTERNAL_URL=http://localhost:8000
```

## Verification Checklist

- [ ] `from app.core.config import settings` imports successfully
- [ ] `settings.DATABASE_URL` loads correctly from `.env`
- [ ] `from app.core.database import engine, SessionLocal` imports
- [ ] `engine.connect()` successfully connects to PostgreSQL
- [ ] `alembic/versions/0001_initial_schema.py` created with CREATE TABLE statements
- [ ] Migration file contains all 13 tables: workspaces, brand_kits, brand_kit_versions, brand_visual_identity, brand_content_identity, brand_platform_override, brand_performance_benchmark, generated_content, generated_posts, post_metrics, feedback_insights, newsjacking_topics, jobs, job_logs
- [ ] `alembic upgrade head` runs without errors
- [ ] All tables exist in PostgreSQL: `\dt` in psql
- [ ] Each table has workspace_id column
- [ ] Indexes created: `\d+ {table_name}` shows indexes
- [ ] `alembic downgrade base` rolls back all tables
- [ ] `alembic upgrade head` again re-applies migration

## Commit Message

```
feat: set up PostgreSQL connection, Alembic migrations, and initial schema
```

## Notes

- Do NOT hardcode DATABASE_URL — always load from settings
- Connection pooling configured for production (pool_size=20, max_overflow=40)
- Auto-migration helps keep schema in sync with models
- Migration files are version-controlled — commit them to git
- For Supabase, get DATABASE_URL from project settings → "Connection Pooling" or "Direct Connection"
- For local dev, use standard PostgreSQL: `postgresql://user:password@localhost:5432/db_name`
