---
phase: 4
task_number: 4.1
title: Implement Distribution Job Queueing
description: Queue content distribution jobs to CloudMQ, return 202 Accepted with job_id
dependencies: [3.1, 2.1]
parallel: false
estimated_time: 2 hours
---

# Task 4.1: Implement Distribution Job Queueing

## Context

Platform distribution (posting to X, LinkedIn, Instagram, Reddit, Email) is also long-running and asynchronous. This task creates the distribution job queuing infrastructure. Similar to content generation, we queue jobs and poll status.

## Acceptance Criteria

- [ ] `app/schemas/distribution.py` created with request/response models
- [ ] `app/services/distribution_service.py` created with queue_distribution method
- [ ] `app/api/routes/distribution.py` created with POST /platform-distribution endpoint
- [ ] POST /platform-distribution validates content_id, queues job, returns 202 Accepted
- [ ] Response includes job_id and status="pending"
- [ ] GET /jobs/{job_id} returns distribution job status with per-platform results
- [ ] Distribution job queued to CloudMQ "platform_distribution" queue
- [ ] Invalid content_id returns 404
- [ ] Cross-workspace access returns 404

## Files to Create

1. **app/schemas/distribution.py** — Request/response models
2. **app/services/distribution_service.py** — Distribution service
3. **app/api/routes/distribution.py** — Distribution endpoints

## Files to Modify

1. **app/main.py** — Register router

## Implementation Steps

### Step 1: Create app/schemas/distribution.py

```python
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any


class DistributionRequest(BaseModel):
    """Distribute content request."""
    content_id: str
    platforms: Optional[List[str]] = Field(
        default=["x", "linkedin", "instagram", "reddit", "email"],
        description="List of platforms to post to"
    )
```

### Step 2: Create app/services/distribution_service.py

```python
from sqlalchemy.orm import Session
from app.models import GeneratedContent
from app.services.job_service import JobService
from app.core.cloudmq import cloudmq_client
from app.core.errors import NotFoundError
from sqlalchemy import and_
import logging

logger = logging.getLogger(__name__)


class DistributionService:
    """Content distribution to multiple platforms."""
    
    def __init__(self, db: Session):
        self.db = db
        self.job_service = JobService(db)
    
    def queue_distribution(
        self,
        workspace_id: str,
        content_id: str,
        platforms: List[str]
    ) -> dict:
        """Queue content distribution job."""
        
        # Validate content exists in workspace
        content = self.db.query(GeneratedContent).filter(
            and_(
                GeneratedContent.id == content_id,
                GeneratedContent.workspace_id == workspace_id
            )
        ).first()
        
        if not content:
            raise NotFoundError("Generated content")
        
        # Create job record
        payload = {
            "content_id": content_id,
            "platforms": platforms
        }
        
        job = self.job_service.create_job(
            workspace_id,
            "platform_distribution",
            payload
        )
        
        # Queue to CloudMQ
        cloudmq_job = cloudmq_client.queue(
            "platform_distribution",
            {**payload, "job_id": job.id},
            metadata={"workspace_id": workspace_id}
        )
        
        job.cloudmq_job_id = cloudmq_job["id"]
        self.db.commit()
        
        logger.info(f"Queued distribution job {job.id} for platforms {platforms}")
        
        return {
            "job_id": job.id,
            "status": job.status
        }
```

### Step 3: Create app/api/routes/distribution.py

```python
from fastapi import APIRouter, Depends, Request, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.services.distribution_service import DistributionService
from app.schemas.distribution import DistributionRequest

router = APIRouter(prefix="/distribution", tags=["distribution"])


@router.post("/platform-distribution", status_code=status.HTTP_202_ACCEPTED)
async def distribute_content(
    request: Request,
    data: DistributionRequest,
    db: Session = Depends(get_db)
) -> dict:
    """Queue content distribution to platforms."""
    workspace_id = request.state.workspace_id
    
    service = DistributionService(db)
    result = service.queue_distribution(
        workspace_id,
        data.content_id,
        data.platforms
    )
    
    return {
        "status": "pending",
        "data": result
    }


@router.get("/platform-distribution/{content_id}")
async def get_distribution_status(
    request: Request,
    content_id: str,
    db: Session = Depends(get_db)
) -> dict:
    """Get distribution status per platform."""
    workspace_id = request.state.workspace_id
    
    from app.services.job_service import JobService
    service = JobService(db)
    
    # Find distribution job for this content
    job = db.query(Job).filter(
        and_(
            Job.workspace_id == workspace_id,
            Job.job_type == "platform_distribution"
        )
    ).order_by(Job.created_at.desc()).first()
    
    if not job:
        raise NotFoundError("Distribution job")
    
    return {
        "status": "success",
        "data": {
            "job_id": job.id,
            "status": job.status,
            "per_platform": job.result or {}
        }
    }
```

### Step 4: Modify app/main.py

```python
from app.api.routes import distribution

app.include_router(distribution.router)
```

## Verification Checklist

- [ ] Distribution job queued to CloudMQ
- [ ] POST returns 202 Accepted
- [ ] GET /jobs/{job_id} returns job status
- [ ] Invalid content_id returns 404
- [ ] Cross-workspace access blocked

## Commit Message

```
feat: implement platform distribution job queuing infrastructure
```

## Notes

- Supports distributing to subset of platforms via platforms parameter
- Background worker (Task 4.2) processes actual posting
- Job stores per-platform results (posted, failed, pending)
