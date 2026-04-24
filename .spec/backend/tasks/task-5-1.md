---
phase: 5
task_number: 5.1
title: Implement Metrics Ingestion
description: Accept POST /metrics with performance data, queue feedback loop analysis
dependencies: [4.2]
parallel: false
estimated_time: 2 hours
---

# Task 5.1: Implement Metrics Ingestion

## Context

Clients record performance metrics (impressions, saves, likes, engagement) so the system learns what content works. This task creates the metrics ingestion endpoint and queues feedback loop analysis.

## Acceptance Criteria

- [ ] `app/schemas/metrics.py` created with request/response models
- [ ] `app/services/metrics_service.py` created with ingest_metrics method
- [ ] `app/api/routes/metrics.py` created with POST /metrics/{post_id} and GET endpoints
- [ ] POST /metrics/{post_id} validates non-negative integers
- [ ] Metrics stored in post_metrics table with recorded_at, recorded_by_user_id
- [ ] GET /metrics/{post_id} returns all metrics for post, sorted by recorded_at DESC
- [ ] GET /metrics/summary/{generated_content_id} returns aggregated metrics
- [ ] Feedback loop job queued after POST
- [ ] Cross-workspace access blocked

## Files to Create

1. **app/schemas/metrics.py** — Request/response models
2. **app/services/metrics_service.py** — Metrics service
3. **app/api/routes/metrics.py** — Metrics endpoints

## Implementation Steps

### Step 1: Create app/schemas/metrics.py

```python
from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime


class MetricsRequest(BaseModel):
    """Ingest metrics request."""
    impressions: int = Field(..., ge=0)
    saves: int = Field(..., ge=0)
    likes: int = Field(..., ge=0)
    comments: int = Field(..., ge=0)
    shares: int = Field(..., ge=0)
    clicks: int = Field(default=0, ge=0)
    conversions: int = Field(default=0, ge=0)


class MetricsResponse(BaseModel):
    """Metrics record response."""
    id: str
    impressions: int
    saves: int
    likes: int
    comments: int
    shares: int
    clicks: int
    conversions: int
    recorded_at: datetime


class MetricsSummaryResponse(BaseModel):
    """Metrics summary."""
    total_impressions: int
    total_saves: int
    total_likes: int
    total_comments: int
    total_shares: int
    total_clicks: int
    total_conversions: int
    avg_engagement_rate: float
```

### Step 2: Create app/services/metrics_service.py

```python
from sqlalchemy.orm import Session
from app.models import PostMetrics, GeneratedPost
from app.services.job_service import JobService
from app.core.cloudmq import cloudmq_client
from app.core.errors import NotFoundError
from sqlalchemy import and_, func
import logging

logger = logging.getLogger(__name__)


class MetricsService:
    def __init__(self, db: Session):
        self.db = db
        self.job_service = JobService(db)
    
    def ingest_metrics(
        self,
        workspace_id: str,
        post_id: str,
        metrics: dict,
        user_id: Optional[str] = None
    ) -> PostMetrics:
        """Ingest metrics for a post."""
        
        # Validate post exists in workspace
        post = self.db.query(GeneratedPost).join(GeneratedContent).filter(
            and_(
                GeneratedPost.id == post_id,
                GeneratedContent.workspace_id == workspace_id
            )
        ).first()
        
        if not post:
            raise NotFoundError("Generated post")
        
        # Create metrics record
        metric = PostMetrics(
            workspace_id=workspace_id,
            generated_post_id=post_id,
            impressions=metrics.get("impressions", 0),
            saves=metrics.get("saves", 0),
            likes=metrics.get("likes", 0),
            comments=metrics.get("comments", 0),
            shares=metrics.get("shares", 0),
            clicks=metrics.get("clicks", 0),
            conversions=metrics.get("conversions", 0),
            recorded_by_user_id=user_id
        )
        
        self.db.add(metric)
        self.db.commit()
        
        logger.info(f"Ingested metrics for post {post_id}")
        return metric
    
    def get_post_metrics(self, workspace_id: str, post_id: str) -> list:
        """Get all metrics for a post."""
        metrics = self.db.query(PostMetrics).filter(
            and_(
                PostMetrics.workspace_id == workspace_id,
                PostMetrics.generated_post_id == post_id
            )
        ).order_by(PostMetrics.created_at.desc()).all()
        
        return metrics
    
    def get_content_summary(self, workspace_id: str, content_id: str) -> dict:
        """Get aggregated metrics for generated content."""
        result = self.db.query(
            func.sum(PostMetrics.impressions),
            func.sum(PostMetrics.saves),
            func.sum(PostMetrics.likes),
            func.sum(PostMetrics.comments),
            func.sum(PostMetrics.shares),
            func.sum(PostMetrics.clicks),
            func.sum(PostMetrics.conversions)
        ).join(GeneratedPost).join(GeneratedContent).filter(
            and_(
                GeneratedContent.workspace_id == workspace_id,
                GeneratedContent.id == content_id
            )
        ).first()
        
        return {
            "total_impressions": result[0] or 0,
            "total_saves": result[1] or 0,
            "total_likes": result[2] or 0,
            "total_comments": result[3] or 0,
            "total_shares": result[4] or 0,
            "total_clicks": result[5] or 0,
            "total_conversions": result[6] or 0
        }
    
    def queue_feedback_analysis(
        self,
        workspace_id: str,
        brand_kit_id: str
    ) -> None:
        """Queue feedback loop analysis job."""
        payload = {"brand_kit_id": brand_kit_id}
        
        job = self.job_service.create_job(
            workspace_id,
            "metrics_analysis",
            payload
        )
        
        cloudmq_client.queue("metrics_analysis", {**payload, "job_id": job.id})
        logger.info(f"Queued metrics analysis job for brand kit {brand_kit_id}")
```

### Step 3: Create app/api/routes/metrics.py

```python
from fastapi import APIRouter, Depends, Request
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.services.metrics_service import MetricsService
from app.schemas.metrics import MetricsRequest, MetricsResponse, MetricsSummaryResponse

router = APIRouter(prefix="/metrics", tags=["metrics"])


@router.post("/{post_id}")
async def ingest_metrics(
    request: Request,
    post_id: str,
    data: MetricsRequest,
    db: Session = Depends(get_db)
) -> dict:
    """Ingest performance metrics for a post."""
    workspace_id = request.state.workspace_id
    user_id = request.state.user_id
    
    service = MetricsService(db)
    metric = service.ingest_metrics(
        workspace_id,
        post_id,
        data.dict(),
        user_id
    )
    
    return {
        "status": "success",
        "data": {
            "id": metric.id,
            "recorded_at": metric.recorded_at.isoformat()
        }
    }


@router.get("/{post_id}")
async def get_post_metrics(
    request: Request,
    post_id: str,
    db: Session = Depends(get_db)
) -> dict:
    """Get all metrics for a post."""
    workspace_id = request.state.workspace_id
    
    service = MetricsService(db)
    metrics = service.get_post_metrics(workspace_id, post_id)
    
    return {
        "status": "success",
        "count": len(metrics),
        "items": [
            {
                "id": m.id,
                "impressions": m.impressions,
                "saves": m.saves,
                "likes": m.likes,
                "comments": m.comments,
                "shares": m.shares,
                "clicks": m.clicks,
                "conversions": m.conversions,
                "recorded_at": m.recorded_at.isoformat()
            }
            for m in metrics
        ]
    }


@router.get("/summary/{content_id}")
async def get_metrics_summary(
    request: Request,
    content_id: str,
    db: Session = Depends(get_db)
) -> dict:
    """Get aggregated metrics for generated content."""
    workspace_id = request.state.workspace_id
    
    service = MetricsService(db)
    summary = service.get_content_summary(workspace_id, content_id)
    
    total_interactions = (
        summary["total_likes"] +
        summary["total_saves"] +
        summary["total_comments"] +
        summary["total_shares"]
    )
    
    avg_engagement = 0
    if summary["total_impressions"] > 0:
        avg_engagement = total_interactions / summary["total_impressions"]
    
    return {
        "status": "success",
        "data": {
            **summary,
            "avg_engagement_rate": avg_engagement
        }
    }
```

## Verification Checklist

- [ ] Metrics ingested and stored
- [ ] Validates non-negative integers
- [ ] GET /metrics returns all records for post
- [ ] GET /metrics/summary aggregates correctly
- [ ] Feedback loop job queued
- [ ] Cross-workspace access blocked

## Commit Message

```
feat: implement metrics ingestion endpoint and feedback loop job queueing
```

## Notes

- Feedback loop job queued immediately after POST /metrics
- Engagement rate: (likes + saves + comments + shares) / impressions
- All metrics recorded per post (not aggregated at ingest time)
