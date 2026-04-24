---
phase: 3
task_number: 3.1
title: Create Content Generation Job Queuing
description: Queue content generation jobs to CloudMQ, return 202 Accepted with job_id
dependencies: [2.1, 1.3]
parallel: false
estimated_time: 2 hours
---

# Task 3.1: Create Content Generation Job Queuing

## Context

Content generation is long-running (calls Claude API, ~5-30 seconds). Rather than block the API, we queue jobs to CloudMQ and return 202 Accepted immediately with a job_id. Clients poll GET /jobs/{job_id} to check status. This task creates the job queuing infrastructure.

## Acceptance Criteria

- [ ] `app/schemas/content.py` created with request/response models
- [ ] `app/services/content_generation_service.py` created with queue_generation method
- [ ] `app/services/job_service.py` created for job management
- [ ] `app/core/cloudmq.py` created with CloudMQ client wrapper
- [ ] `app/api/routes/content.py` created with POST /generate-content endpoint
- [ ] `app/api/routes/jobs.py` created with GET /jobs/{job_id} endpoint
- [ ] POST /generate-content validates brand_kit_id exists, queues job, returns 202 Accepted
- [ ] Response includes job_id and status="pending"
- [ ] GET /jobs/{job_id} returns job status, payload (if completed), error (if failed)
- [ ] Job created in database with status="pending"
- [ ] Job queued to CloudMQ "content_generation" queue
- [ ] Invalid brand_kit_id returns 404
- [ ] Cross-workspace access returns 404 (implicit via brand_kit isolation)

## Files to Create

1. **app/schemas/content.py** — Request/response models
2. **app/services/content_generation_service.py** — Content generation service
3. **app/services/job_service.py** — Job management
4. **app/core/cloudmq.py** — CloudMQ wrapper
5. **app/api/routes/content.py** — Content endpoints
6. **app/api/routes/jobs.py** — Job status endpoints

## Files to Modify

1. **app/main.py** — Register routers

## Implementation Steps

### Step 1: Create app/schemas/content.py

```python
from pydantic import BaseModel, Field
from typing import Optional, Dict, Any
from datetime import datetime


class GenerateContentRequest(BaseModel):
    """Generate content request."""
    topic: str = Field(..., min_length=1, max_length=500)
    source_type: str = Field("standard", description="standard or newsjacking")
    brand_kit_id: str = Field(...)


class JobResponse(BaseModel):
    """Job status response."""
    job_id: str
    status: str  # pending, processing, completed, failed
    result: Optional[Dict[str, Any]] = None
    error_message: Optional[str] = None
    created_at: datetime
    updated_at: datetime
```

### Step 2: Create app/core/cloudmq.py

```python
from app.core.config import settings
import logging
from typing import Dict, Any, Optional

logger = logging.getLogger(__name__)


class CloudMQClient:
    """CloudMQ job queue client."""
    
    def __init__(self, connection_string: str):
        self.connection_string = connection_string
        # Initialize actual CloudMQ client here
        # For now, mock implementation
        logger.info("CloudMQ client initialized")
    
    def queue(
        self,
        queue_name: str,
        payload: Dict[str, Any],
        metadata: Optional[Dict[str, str]] = None
    ) -> Dict[str, str]:
        """Queue job to CloudMQ."""
        # TODO: Implement actual CloudMQ queueing
        # For now, return mock response
        logger.info(f"Queued job to {queue_name}: {payload}")
        return {
            "id": f"cloudmq-{payload.get('job_id', 'unknown')}",
            "status": "queued"
        }
    
    def get_status(self, cloudmq_job_id: str) -> str:
        """Get job status from CloudMQ."""
        # TODO: Implement actual status check
        return "pending"


cloudmq_client = CloudMQClient(settings.CLOUDMQ_CONNECTION_STRING or "")
```

### Step 3: Create app/services/job_service.py

```python
from sqlalchemy.orm import Session
from app.models import Job, JobLog
from sqlalchemy import and_
from typing import Optional, Dict, Any
import logging

logger = logging.getLogger(__name__)


class JobService:
    """Job queue management."""
    
    def __init__(self, db: Session):
        self.db = db
    
    def create_job(
        self,
        workspace_id: str,
        job_type: str,
        payload: Dict[str, Any]
    ) -> Job:
        """Create new job record."""
        job = Job(
            workspace_id=workspace_id,
            job_type=job_type,
            status="pending",
            payload=payload
        )
        self.db.add(job)
        self.db.commit()
        self.db.refresh(job)
        return job
    
    def get_job(self, job_id: str, workspace_id: str) -> Optional[Job]:
        """Get job by ID with workspace isolation."""
        return self.db.query(Job).filter(
            and_(
                Job.id == job_id,
                Job.workspace_id == workspace_id
            )
        ).first()
    
    def update_status(
        self,
        job_id: str,
        status: str,
        result: Optional[Dict[str, Any]] = None,
        error_message: Optional[str] = None
    ) -> Job:
        """Update job status."""
        job = self.db.query(Job).filter(Job.id == job_id).first()
        if job:
            job.status = status
            if result:
                job.result = result
            if error_message:
                job.error_message = error_message
            self.db.commit()
            self.db.refresh(job)
        return job
    
    def add_log(self, job_id: str, level: str, message: str) -> JobLog:
        """Add log entry for job."""
        log = JobLog(
            workspace_id="",  # Set by parent
            job_id=job_id,
            log_level=level,
            message=message
        )
        self.db.add(log)
        self.db.commit()
        return log
```

### Step 4: Create app/services/content_generation_service.py

```python
from sqlalchemy.orm import Session
from app.models import BrandKit
from app.services.job_service import JobService
from app.core.cloudmq import cloudmq_client
from app.core.errors import NotFoundError
from sqlalchemy import and_
from typing import Optional
import logging

logger = logging.getLogger(__name__)


class ContentGenerationService:
    """Content generation via Claude API."""
    
    def __init__(self, db: Session):
        self.db = db
        self.job_service = JobService(db)
    
    def queue_generation(
        self,
        workspace_id: str,
        topic: str,
        source_type: str,
        brand_kit_id: str
    ) -> dict:
        """Queue content generation job."""
        
        # Validate brand kit exists in workspace
        kit = self.db.query(BrandKit).filter(
            and_(
                BrandKit.id == brand_kit_id,
                BrandKit.workspace_id == workspace_id,
                BrandKit.is_deleted == False
            )
        ).first()
        
        if not kit:
            raise NotFoundError("Brand kit")
        
        # Create job record
        payload = {
            "topic": topic,
            "source_type": source_type,
            "brand_kit_id": brand_kit_id
        }
        
        job = self.job_service.create_job(
            workspace_id,
            "content_generation",
            payload
        )
        
        # Queue to CloudMQ
        cloudmq_job = cloudmq_client.queue(
            "content_generation",
            {**payload, "job_id": job.id},
            metadata={"workspace_id": workspace_id}
        )
        
        # Store CloudMQ job ID
        job.cloudmq_job_id = cloudmq_job["id"]
        self.db.commit()
        
        logger.info(f"Queued content generation job {job.id}")
        
        return {
            "job_id": job.id,
            "status": job.status
        }
```

### Step 5: Create app/api/routes/content.py

```python
from fastapi import APIRouter, Depends, Request, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.services.content_generation_service import ContentGenerationService
from app.schemas.content import GenerateContentRequest

router = APIRouter(prefix="/content", tags=["content"])


@router.post("/generate-content", status_code=status.HTTP_202_ACCEPTED)
async def generate_content(
    request: Request,
    data: GenerateContentRequest,
    db: Session = Depends(get_db)
) -> dict:
    """Queue content generation job."""
    workspace_id = request.state.workspace_id
    
    service = ContentGenerationService(db)
    result = service.queue_generation(
        workspace_id,
        data.topic,
        data.source_type,
        data.brand_kit_id
    )
    
    return {
        "status": "pending",
        "data": result
    }
```

### Step 6: Create app/api/routes/jobs.py

```python
from fastapi import APIRouter, Depends, Request
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.services.job_service import JobService
from app.core.errors import NotFoundError

router = APIRouter(prefix="/jobs", tags=["jobs"])


@router.get("/{job_id}")
async def get_job_status(
    request: Request,
    job_id: str,
    db: Session = Depends(get_db)
) -> dict:
    """Get async job status and result."""
    workspace_id = request.state.workspace_id
    
    service = JobService(db)
    job = service.get_job(job_id, workspace_id)
    
    if not job:
        raise NotFoundError("Job")
    
    return {
        "status": "success",
        "data": {
            "job_id": job.id,
            "status": job.status,
            "result": job.result,
            "error_message": job.error_message,
            "created_at": job.created_at.isoformat(),
            "updated_at": job.updated_at.isoformat(),
        }
    }
```

### Step 7: Modify app/main.py

```python
from app.api.routes import brand_kits, content, jobs

# ... existing code ...

app.include_router(brand_kits.router)
app.include_router(content.router)
app.include_router(jobs.router)
```

## Test Cases

### Test 1: Queue Content Generation

```bash
curl -X POST http://localhost:8000/content/generate-content \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{"topic": "AI trends", "source_type": "standard", "brand_kit_id": "{kit_id}"}'
# Expected: 202 Accepted, {"status": "pending", "data": {"job_id": "...", "status": "pending"}}
```

### Test 2: Check Job Status

```bash
curl http://localhost:8000/jobs/{job_id} \
  -H "Authorization: Bearer {token}"
# Expected: 200 OK, {"status": "success", "data": {"job_id": "...", "status": "pending", ...}}
```

### Test 3: Invalid Brand Kit

```bash
curl -X POST http://localhost:8000/content/generate-content \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{"topic": "AI trends", "source_type": "standard", "brand_kit_id": "nonexistent"}'
# Expected: 404 Not Found
```

## Verification Checklist

- [ ] Job record created in database
- [ ] Job status="pending"
- [ ] CloudMQ job queued successfully
- [ ] Response includes job_id
- [ ] POST returns 202 Accepted (not 200)
- [ ] GET /jobs/{job_id} returns job status
- [ ] Cross-workspace access blocked (404)
- [ ] Invalid brand_kit_id returns 404

## Commit Message

```
feat: implement content generation job queuing with CloudMQ
```

## Notes

- 202 Accepted indicates async job queued, not completed
- Job polling interval: client uses 2-5 second intervals
- CloudMQ integration is stubbed (TODO for actual implementation)
- job_id used by client to poll status until completion
