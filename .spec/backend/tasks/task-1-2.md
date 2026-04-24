---
phase: 1
task_number: 1.2
title: Create SQLAlchemy ORM Models
description: Define database models for all 13 tables with workspace_id isolation and timestamps
dependencies: [1.1]
parallel: false
estimated_time: 3 hours
---

# Task 1.2: Create SQLAlchemy ORM Models

## Context

This task defines the data model for the entire system. All 13 core tables are modeled as SQLAlchemy ORM classes with proper relationships, indexes, and multi-tenancy isolation via workspace_id. Models are the foundation for both database migrations (Task 1.3) and all service layers (Tasks 2.1+).

## Acceptance Criteria

- [ ] `app/models/__init__.py` created and exports all models
- [ ] `app/models/base.py` created with BaseModel class (workspace_id, timestamps)
- [ ] `app/models/workspace.py` — Workspace model
- [ ] `app/models/brand_kit.py` — BrandKit, BrandKitVersion, BrandVisualIdentity, BrandContentIdentity, BrandPlatformOverride, BrandPerformanceBenchmark
- [ ] `app/models/content.py` — GeneratedContent, GeneratedPost
- [ ] `app/models/metrics.py` — PostMetrics
- [ ] `app/models/insights.py` — FeedbackInsight
- [ ] `app/models/newsjacking.py` — NewsjackingTopic
- [ ] `app/models/jobs.py` — Job, JobLog
- [ ] All models inherit from BaseModel
- [ ] All models have workspace_id, created_at, updated_at (except explicit exceptions)
- [ ] Foreign keys properly defined with ForeignKey constraints
- [ ] Indexes created on frequently queried columns (workspace_id, status, created_at)
- [ ] `from app.models import *` imports without error
- [ ] SQLAlchemy can reflect schema: `from app.database import Base; Base.metadata.tables.keys()`

## Files to Create

1. **app/models/__init__.py** — Model exports
2. **app/models/base.py** — BaseModel with common fields
3. **app/models/workspace.py** — Workspace (multi-tenancy root)
4. **app/models/brand_kit.py** — Brand kit and related tables
5. **app/models/content.py** — Generated content models
6. **app/models/metrics.py** — Post metrics model
7. **app/models/insights.py** — Feedback insights model
8. **app/models/newsjacking.py** — Trending topics model
9. **app/models/jobs.py** — Job queue tracking models

## Implementation Steps

### Step 1: Create app/models/base.py

```python
from sqlalchemy import Column, String, DateTime, func, Index
from sqlalchemy.orm import declarative_base
from datetime import datetime
from uuid import uuid4

Base = declarative_base()


class BaseModel(Base):
    __abstract__ = True

    id = Column(String(36), primary_key=True, default=lambda: str(uuid4()))
    workspace_id = Column(String(36), nullable=False, index=True)
    created_at = Column(DateTime, server_default=func.now(), nullable=False)
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now(), nullable=False)

    __table_args__ = (
        Index("idx_workspace_id", "workspace_id"),
        Index("idx_created_at", "created_at"),
    )
```

### Step 2: Create app/models/workspace.py

```python
from sqlalchemy import Column, String, DateTime, func, Index
from app.models.base import Base


class Workspace(Base):
    __tablename__ = "workspaces"
    __abstract__ = False

    id = Column(String(36), primary_key=True)
    name = Column(String(255), nullable=False)
    created_at = Column(DateTime, server_default=func.now(), nullable=False)
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now(), nullable=False)

    __table_args__ = (Index("idx_workspace_name", "name"),)
```

### Step 3: Create app/models/brand_kit.py

```python
from sqlalchemy import Column, String, Integer, Boolean, JSON, ForeignKey, DateTime, func, Index
from sqlalchemy.orm import relationship
from app.models.base import BaseModel


class BrandKit(BaseModel):
    __tablename__ = "brand_kits"

    workspace_id = Column(String(36), ForeignKey("workspaces.id"), nullable=False, index=True)
    name = Column(String(255), nullable=False)
    version = Column(Integer, default=1, nullable=False)
    is_active = Column(Boolean, default=False, nullable=False)
    is_deleted = Column(Boolean, default=False, nullable=False)
    approved_at = Column(DateTime, nullable=True)
    created_by = Column(String(36), nullable=True)

    visual_identity = Column(JSON, default={})
    content_identity = Column(JSON, default={})
    platform_overrides = Column(JSON, default={})
    performance_benchmarks = Column(JSON, default={})

    versions = relationship("BrandKitVersion", back_populates="brand_kit", cascade="all, delete-orphan")

    __table_args__ = (
        Index("idx_brand_kit_workspace_active", "workspace_id", "is_active"),
        Index("idx_brand_kit_workspace_created", "workspace_id", "created_at"),
    )


class BrandKitVersion(BaseModel):
    __tablename__ = "brand_kit_versions"

    brand_kit_id = Column(String(36), ForeignKey("brand_kits.id"), nullable=False, index=True)
    version = Column(Integer, nullable=False)
    approved_at = Column(DateTime, nullable=True)
    reason = Column(String(500), nullable=True)
    changes = Column(JSON, default={})
    created_by = Column(String(36), nullable=True)

    brand_kit = relationship("BrandKit", back_populates="versions")

    __table_args__ = (
        Index("idx_version_brand_kit_version", "brand_kit_id", "version"),
    )


class BrandVisualIdentity(BaseModel):
    __tablename__ = "brand_visual_identity"

    brand_kit_id = Column(String(36), ForeignKey("brand_kits.id"), nullable=False, index=True)
    primary_color = Column(String(7), nullable=True)
    secondary_color = Column(String(7), nullable=True)
    accent_color = Column(String(7), nullable=True)
    font_family = Column(String(255), nullable=True)
    logo_url = Column(String(500), nullable=True)
    brand_assets = Column(JSON, default={})


class BrandContentIdentity(BaseModel):
    __tablename__ = "brand_content_identity"

    brand_kit_id = Column(String(36), ForeignKey("brand_kits.id"), nullable=False, index=True)
    tone_descriptors = Column(JSON, default=[])
    voice_descriptor = Column(String(255), nullable=True)
    content_pillars = Column(JSON, default=[])
    key_messages = Column(JSON, default=[])
    avoid_topics = Column(JSON, default=[])


class BrandPlatformOverride(BaseModel):
    __tablename__ = "brand_platform_overrides"

    brand_kit_id = Column(String(36), ForeignKey("brand_kits.id"), nullable=False, index=True)
    platform = Column(String(50), nullable=False)
    override_data = Column(JSON, default={})

    __table_args__ = (
        Index("idx_platform_override_brand_platform", "brand_kit_id", "platform"),
    )


class BrandPerformanceBenchmark(BaseModel):
    __tablename__ = "brand_performance_benchmarks"

    brand_kit_id = Column(String(36), ForeignKey("brand_kits.id"), nullable=False, index=True)
    platform = Column(String(50), nullable=False)
    target_engagement_rate = Column(Integer, nullable=True)
    target_conversion_rate = Column(Integer, nullable=True)
    benchmark_data = Column(JSON, default={})

    __table_args__ = (
        Index("idx_benchmark_brand_platform", "brand_kit_id", "platform"),
    )
```

### Step 4: Create app/models/content.py

```python
from sqlalchemy import Column, String, Integer, JSON, ForeignKey, DateTime, func, Index
from sqlalchemy.orm import relationship
from app.models.base import BaseModel


class GeneratedContent(BaseModel):
    __tablename__ = "generated_content"

    workspace_id = Column(String(36), ForeignKey("workspaces.id"), nullable=False, index=True)
    brand_kit_id = Column(String(36), ForeignKey("brand_kits.id"), nullable=False, index=True)
    topic = Column(String(500), nullable=False)
    source_type = Column(String(50), default="standard")
    newsjacking_topic_id = Column(String(36), nullable=True)
    content_data = Column(JSON, default={})

    posts = relationship("GeneratedPost", back_populates="content", cascade="all, delete-orphan")

    __table_args__ = (
        Index("idx_generated_content_workspace_kit", "workspace_id", "brand_kit_id"),
        Index("idx_generated_content_topic", "topic"),
    )


class GeneratedPost(BaseModel):
    __tablename__ = "generated_posts"

    generated_content_id = Column(String(36), ForeignKey("generated_content.id"), nullable=False, index=True)
    platform = Column(String(50), nullable=False)
    content = Column(String(5000), nullable=False)
    posted_at = Column(DateTime, nullable=True)
    platform_post_id = Column(String(255), nullable=True)
    post_url = Column(String(500), nullable=True)

    content = relationship("GeneratedContent", back_populates="posts")

    __table_args__ = (
        Index("idx_generated_post_content_platform", "generated_content_id", "platform"),
    )
```

### Step 5: Create app/models/metrics.py

```python
from sqlalchemy import Column, String, Integer, Float, ForeignKey, DateTime, func, Index
from app.models.base import BaseModel


class PostMetrics(BaseModel):
    __tablename__ = "post_metrics"

    workspace_id = Column(String(36), ForeignKey("workspaces.id"), nullable=False, index=True)
    generated_post_id = Column(String(36), ForeignKey("generated_posts.id"), nullable=False, index=True)
    impressions = Column(Integer, default=0, nullable=False)
    saves = Column(Integer, default=0, nullable=False)
    likes = Column(Integer, default=0, nullable=False)
    comments = Column(Integer, default=0, nullable=False)
    shares = Column(Integer, default=0, nullable=False)
    clicks = Column(Integer, default=0, nullable=False)
    conversions = Column(Integer, default=0, nullable=False)
    recorded_by_user_id = Column(String(36), nullable=True)

    __table_args__ = (
        Index("idx_post_metrics_workspace_post", "workspace_id", "generated_post_id"),
        Index("idx_post_metrics_created", "created_at"),
    )
```

### Step 6: Create app/models/insights.py

```python
from sqlalchemy import Column, String, Float, Boolean, ForeignKey, Index
from app.models.base import BaseModel


class FeedbackInsight(BaseModel):
    __tablename__ = "feedback_insights"

    workspace_id = Column(String(36), ForeignKey("workspaces.id"), nullable=False, index=True)
    brand_kit_id = Column(String(36), ForeignKey("brand_kits.id"), nullable=False, index=True)
    insight_type = Column(String(100), nullable=False)
    insight_text = Column(String(1000), nullable=False)
    impact_metric = Column(String(100), nullable=False)
    confidence = Column(Float, nullable=False)
    recommendation = Column(String(1000), nullable=False)
    applied = Column(Boolean, default=False, nullable=False)

    __table_args__ = (
        Index("idx_feedback_insight_workspace_kit", "workspace_id", "brand_kit_id"),
        Index("idx_feedback_insight_applied", "applied"),
    )
```

### Step 7: Create app/models/newsjacking.py

```python
from sqlalchemy import Column, String, Float, DateTime, ForeignKey, Index
from app.models.base import BaseModel


class NewsjackingTopic(BaseModel):
    __tablename__ = "newsjacking_topics"

    workspace_id = Column(String(36), ForeignKey("workspaces.id"), nullable=False, index=True)
    brand_kit_id = Column(String(36), ForeignKey("brand_kits.id"), nullable=False, index=True)
    topic_title = Column(String(500), nullable=False)
    trend_source = Column(String(50), nullable=False)
    relevance_score = Column(Float, nullable=False)
    momentum_score = Column(Float, nullable=False)
    context = Column(String(2000), nullable=True)
    expires_at = Column(DateTime, nullable=False)
    expired = Column(Boolean, default=False, nullable=False)

    __table_args__ = (
        Index("idx_newsjacking_workspace_kit", "workspace_id", "brand_kit_id"),
        Index("idx_newsjacking_expires", "expires_at"),
    )
```

### Step 8: Create app/models/jobs.py

```python
from sqlalchemy import Column, String, Integer, JSON, Index
from app.models.base import BaseModel


class Job(BaseModel):
    __tablename__ = "jobs"

    job_type = Column(String(50), nullable=False)
    status = Column(String(50), default="pending", nullable=False)
    payload = Column(JSON, default={})
    result = Column(JSON, nullable=True)
    error_message = Column(String(1000), nullable=True)
    retry_count = Column(Integer, default=0, nullable=False)
    cloudmq_job_id = Column(String(255), nullable=True)

    __table_args__ = (
        Index("idx_job_workspace_status", "workspace_id", "status"),
        Index("idx_job_type_status", "job_type", "status"),
    )


class JobLog(BaseModel):
    __tablename__ = "job_logs"

    job_id = Column(String(36), nullable=False, index=True)
    log_level = Column(String(20), nullable=False)
    message = Column(String(1000), nullable=False)

    __table_args__ = (
        Index("idx_job_log_job_id", "job_id"),
    )
```

### Step 9: Create app/models/__init__.py

```python
from app.models.base import Base
from app.models.workspace import Workspace
from app.models.brand_kit import (
    BrandKit,
    BrandKitVersion,
    BrandVisualIdentity,
    BrandContentIdentity,
    BrandPlatformOverride,
    BrandPerformanceBenchmark,
)
from app.models.content import GeneratedContent, GeneratedPost
from app.models.metrics import PostMetrics
from app.models.insights import FeedbackInsight
from app.models.newsjacking import NewsjackingTopic
from app.models.jobs import Job, JobLog

__all__ = [
    "Base",
    "Workspace",
    "BrandKit",
    "BrandKitVersion",
    "BrandVisualIdentity",
    "BrandContentIdentity",
    "BrandPlatformOverride",
    "BrandPerformanceBenchmark",
    "GeneratedContent",
    "GeneratedPost",
    "PostMetrics",
    "FeedbackInsight",
    "NewsjackingTopic",
    "Job",
    "JobLog",
]
```

## Verification Checklist

- [ ] All model files created with correct naming
- [ ] `from app.models import *` imports successfully
- [ ] All models have workspace_id field (except Workspace)
- [ ] All models have created_at, updated_at
- [ ] Foreign key relationships defined correctly
- [ ] Indexes created on workspace_id, status, created_at
- [ ] No import errors when running: `python -c "from app.models import *; print('OK')"`
- [ ] SQLAlchemy can introspect tables (needed for migrations)

## Commit Message

```
feat: create SQLAlchemy ORM models for all 13 database tables with multi-tenancy isolation
```

## Notes

- Models define schema but do NOT create tables yet (migrations do that in Task 1.3)
- All models are designed to support soft deletes via is_deleted flag where needed
- JSON columns provide flexibility for future brand kit extensions
- Foreign keys reference workspace_id for implicit workspace isolation in queries
