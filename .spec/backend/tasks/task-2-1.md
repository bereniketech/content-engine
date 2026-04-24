---
phase: 2
task_number: 2.1
title: Create Brand Kit CRUD Endpoints
description: Implement POST/GET/PATCH/DELETE brand kit endpoints with workspace isolation
dependencies: [1.1, 1.2, 1.3, 1.4, 1.5]
parallel: false
estimated_time: 3 hours
---

# Task 2.1: Create Brand Kit CRUD Endpoints

## Context

Phase 2 begins brand kit service implementation. This task creates the REST API endpoints for managing brand kits: create, list, retrieve, update, and soft delete. All endpoints enforce workspace isolation via request.state.workspace_id. This forms the foundation for versioning (Task 2.2) and all downstream features.

## Acceptance Criteria

- [ ] `app/schemas/brand_kit.py` created with request/response Pydantic models
- [ ] `app/services/brand_kit_service.py` created with BrandKitService business logic
- [ ] `app/api/__init__.py` created (module marker)
- [ ] `app/api/routes/__init__.py` created (routes module marker)
- [ ] `app/api/routes/brand_kits.py` created with 5 endpoints
- [ ] `app/main.py` updated to include router
- [ ] POST /brand-kits creates new kit, returns id, name, version=1, is_active=false
- [ ] GET /brand-kits lists all kits in workspace (paginated)
- [ ] GET /brand-kits/{id} returns full kit with visual_identity, content_identity, platform_overrides, performance_benchmarks
- [ ] PATCH /brand-kits/{id} updates provided fields only, sets updated_at
- [ ] DELETE /brand-kits/{id} soft-deletes (sets is_deleted=true)
- [ ] Cross-workspace access returns 403 Forbidden
- [ ] Invalid kit_id returns 404 Not Found
- [ ] All endpoints return standardized JSON response with status field
- [ ] Integration tests pass for all 5 endpoints

## Files to Create

1. **app/schemas/brand_kit.py** — Request/response models
2. **app/services/brand_kit_service.py** — Business logic layer
3. **app/api/__init__.py** — API module marker
4. **app/api/routes/__init__.py** — Routes module marker
5. **app/api/routes/brand_kits.py** — Brand kit endpoints

## Files to Modify

1. **app/main.py** — Register router

## Implementation Steps

### Step 1: Create app/schemas/brand_kit.py

```python
from pydantic import BaseModel, Field
from typing import Optional, Dict, Any, List
from datetime import datetime


class CreateBrandKitRequest(BaseModel):
    """Create brand kit request."""
    name: str = Field(..., min_length=1, max_length=255)


class UpdateBrandKitRequest(BaseModel):
    """Update brand kit request (all fields optional)."""
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    visual_identity: Optional[Dict[str, Any]] = None
    content_identity: Optional[Dict[str, Any]] = None
    platform_overrides: Optional[Dict[str, Any]] = None
    performance_benchmarks: Optional[Dict[str, Any]] = None


class BrandKitResponse(BaseModel):
    """Brand kit response."""
    id: str
    workspace_id: str
    name: str
    version: int
    is_active: bool
    is_deleted: bool
    approved_at: Optional[datetime] = None
    created_by: Optional[str] = None
    visual_identity: Dict[str, Any]
    content_identity: Dict[str, Any]
    platform_overrides: Dict[str, Any]
    performance_benchmarks: Dict[str, Any]
    created_at: datetime
    updated_at: datetime


class BrandKitListResponse(BaseModel):
    """Brand kit list item (minimal fields)."""
    id: str
    name: str
    version: int
    is_active: bool
    created_at: datetime
    updated_at: datetime


class BrandKitListRequest(BaseModel):
    """List brand kits query parameters."""
    skip: int = 0
    limit: int = 50
    is_active: Optional[bool] = None
```

### Step 2: Create app/services/brand_kit_service.py

```python
from sqlalchemy.orm import Session
from sqlalchemy import and_
from app.models import BrandKit
from app.core.errors import NotFoundError, ForbiddenError, ConflictError
from typing import List, Optional, Dict, Any
import logging

logger = logging.getLogger(__name__)


class BrandKitService:
    """Business logic for brand kit management."""
    
    def __init__(self, db: Session):
        self.db = db
    
    def create_kit(self, workspace_id: str, name: str, created_by: Optional[str] = None) -> BrandKit:
        """Create new brand kit in workspace."""
        kit = BrandKit(
            workspace_id=workspace_id,
            name=name,
            version=1,
            is_active=False,
            is_deleted=False,
            created_by=created_by
        )
        self.db.add(kit)
        self.db.commit()
        self.db.refresh(kit)
        logger.info(f"Created brand kit {kit.id} in workspace {workspace_id}")
        return kit
    
    def list_kits(
        self,
        workspace_id: str,
        skip: int = 0,
        limit: int = 50,
        is_active: Optional[bool] = None
    ) -> tuple[List[BrandKit], int]:
        """List brand kits in workspace."""
        query = self.db.query(BrandKit).filter(
            and_(
                BrandKit.workspace_id == workspace_id,
                BrandKit.is_deleted == False
            )
        )
        
        if is_active is not None:
            query = query.filter(BrandKit.is_active == is_active)
        
        total = query.count()
        kits = query.order_by(BrandKit.created_at.desc()).offset(skip).limit(limit).all()
        
        return kits, total
    
    def get_kit(self, kit_id: str, workspace_id: str) -> BrandKit:
        """Get brand kit by ID (with workspace isolation)."""
        kit = self.db.query(BrandKit).filter(
            and_(
                BrandKit.id == kit_id,
                BrandKit.workspace_id == workspace_id,
                BrandKit.is_deleted == False
            )
        ).first()
        
        if not kit:
            raise NotFoundError("Brand kit")
        
        return kit
    
    def update_kit(
        self,
        kit_id: str,
        workspace_id: str,
        updates: Dict[str, Any]
    ) -> BrandKit:
        """Update brand kit (cannot modify approved kit)."""
        kit = self.get_kit(kit_id, workspace_id)
        
        # Cannot update approved kit (must create new version)
        if kit.approved_at:
            raise ConflictError("Cannot modify approved brand kit. Create a new version instead.")
        
        # Update provided fields
        for field, value in updates.items():
            if hasattr(kit, field) and field not in ["id", "workspace_id", "created_at", "created_by"]:
                setattr(kit, field, value)
        
        self.db.commit()
        self.db.refresh(kit)
        logger.info(f"Updated brand kit {kit_id}")
        
        return kit
    
    def delete_kit(self, kit_id: str, workspace_id: str) -> None:
        """Soft delete brand kit."""
        kit = self.get_kit(kit_id, workspace_id)
        kit.is_deleted = True
        self.db.commit()
        logger.info(f"Deleted brand kit {kit_id}")
```

### Step 3: Create app/api/__init__.py

Empty file (module marker).

### Step 4: Create app/api/routes/__init__.py

Empty file (module marker).

### Step 5: Create app/api/routes/brand_kits.py

```python
from fastapi import APIRouter, Depends, Request, Query
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.services.brand_kit_service import BrandKitService
from app.schemas.brand_kit import (
    CreateBrandKitRequest,
    UpdateBrandKitRequest,
    BrandKitResponse,
    BrandKitListResponse,
)
from app.core.errors import ForbiddenError
from typing import List

router = APIRouter(prefix="/brand-kits", tags=["brand-kits"])


@router.post("", status_code=201)
async def create_brand_kit(
    request: Request,
    data: CreateBrandKitRequest,
    db: Session = Depends(get_db)
) -> dict:
    """Create new brand kit in workspace."""
    workspace_id = request.state.workspace_id
    user_id = request.state.user_id
    
    service = BrandKitService(db)
    kit = service.create_kit(workspace_id, data.name, created_by=user_id)
    
    return {
        "status": "success",
        "data": {
            "id": kit.id,
            "name": kit.name,
            "version": kit.version,
            "is_active": kit.is_active
        }
    }


@router.get("")
async def list_brand_kits(
    request: Request,
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    is_active: bool = Query(None),
    db: Session = Depends(get_db)
) -> dict:
    """List brand kits in workspace."""
    workspace_id = request.state.workspace_id
    
    service = BrandKitService(db)
    kits, total = service.list_kits(workspace_id, skip, limit, is_active)
    
    return {
        "status": "success",
        "count": len(kits),
        "total": total,
        "items": [
            {
                "id": kit.id,
                "name": kit.name,
                "version": kit.version,
                "is_active": kit.is_active,
                "created_at": kit.created_at.isoformat(),
                "updated_at": kit.updated_at.isoformat(),
            }
            for kit in kits
        ]
    }


@router.get("/{kit_id}")
async def get_brand_kit(
    request: Request,
    kit_id: str,
    db: Session = Depends(get_db)
) -> dict:
    """Get brand kit by ID."""
    workspace_id = request.state.workspace_id
    
    service = BrandKitService(db)
    kit = service.get_kit(kit_id, workspace_id)
    
    return {
        "status": "success",
        "data": {
            "id": kit.id,
            "workspace_id": kit.workspace_id,
            "name": kit.name,
            "version": kit.version,
            "is_active": kit.is_active,
            "approved_at": kit.approved_at.isoformat() if kit.approved_at else None,
            "visual_identity": kit.visual_identity,
            "content_identity": kit.content_identity,
            "platform_overrides": kit.platform_overrides,
            "performance_benchmarks": kit.performance_benchmarks,
            "created_at": kit.created_at.isoformat(),
            "updated_at": kit.updated_at.isoformat(),
        }
    }


@router.patch("/{kit_id}")
async def update_brand_kit(
    request: Request,
    kit_id: str,
    data: UpdateBrandKitRequest,
    db: Session = Depends(get_db)
) -> dict:
    """Update brand kit (only unapproved kits)."""
    workspace_id = request.state.workspace_id
    
    service = BrandKitService(db)
    updates = {k: v for k, v in data.dict().items() if v is not None}
    kit = service.update_kit(kit_id, workspace_id, updates)
    
    return {
        "status": "success",
        "data": {
            "id": kit.id,
            "name": kit.name,
            "version": kit.version,
            "updated_at": kit.updated_at.isoformat(),
        }
    }


@router.delete("/{kit_id}", status_code=204)
async def delete_brand_kit(
    request: Request,
    kit_id: str,
    db: Session = Depends(get_db)
) -> None:
    """Soft delete brand kit."""
    workspace_id = request.state.workspace_id
    
    service = BrandKitService(db)
    service.delete_kit(kit_id, workspace_id)
```

### Step 6: Modify app/main.py

Add router registration:

```python
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.middleware.auth import auth_middleware
from app.middleware.error_handler import global_exception_handler
from app.api.routes import brand_kits
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="Content Engine Backend API",
    description="FastAPI microservice for brand kit management, content generation, and distribution",
    version="0.1.0",
)

# ... middleware setup ...

# Include routers
app.include_router(brand_kits.router)

# ... endpoints ...
```

## Test Cases

### Test 1: Create Brand Kit

```bash
curl -X POST http://localhost:8000/brand-kits \
  -H "Authorization: Bearer {valid_token}" \
  -H "Content-Type: application/json" \
  -d '{"name": "My Brand Kit"}'
# Expected: 201 Created, {"status": "success", "data": {"id": "...", "name": "My Brand Kit", "version": 1, "is_active": false}}
```

### Test 2: List Brand Kits

```bash
curl http://localhost:8000/brand-kits \
  -H "Authorization: Bearer {valid_token}"
# Expected: 200 OK, {"status": "success", "count": N, "total": N, "items": [...]}
```

### Test 3: Get Brand Kit

```bash
curl http://localhost:8000/brand-kits/{kit_id} \
  -H "Authorization: Bearer {valid_token}"
# Expected: 200 OK, {"status": "success", "data": {...full kit...}}
```

### Test 4: Update Brand Kit

```bash
curl -X PATCH http://localhost:8000/brand-kits/{kit_id} \
  -H "Authorization: Bearer {valid_token}" \
  -H "Content-Type: application/json" \
  -d '{"name": "Updated Name"}'
# Expected: 200 OK, {"status": "success", "data": {...}}
```

### Test 5: Delete Brand Kit

```bash
curl -X DELETE http://localhost:8000/brand-kits/{kit_id} \
  -H "Authorization: Bearer {valid_token}"
# Expected: 204 No Content
```

### Test 6: Cross-Workspace Access

```bash
# Try to access kit from different workspace
curl http://localhost:8000/brand-kits/{other_workspace_kit_id} \
  -H "Authorization: Bearer {token_from_different_workspace}"
# Expected: 404 Not Found
```

## Verification Checklist

- [ ] All schema models import without error
- [ ] BrandKitService instantiates and methods callable
- [ ] Router includes all 5 endpoints
- [ ] POST /brand-kits creates kit with version=1, is_active=false
- [ ] GET /brand-kits returns paginated list
- [ ] GET /brand-kits/{id} returns full kit
- [ ] PATCH /brand-kits/{id} updates fields
- [ ] DELETE /brand-kits/{id} soft-deletes
- [ ] Cross-workspace access blocked (404 or 403)
- [ ] All responses have status field
- [ ] Request state isolation enforced (workspace_id checked)
- [ ] Timestamps (created_at, updated_at) present and correct

## Commit Message

```
feat: implement brand kit CRUD endpoints with workspace isolation
```

## Notes

- All endpoints enforce `workspace_id == request.state.workspace_id` for isolation
- Soft delete via `is_deleted=true` preserves audit trail
- Cannot update approved kits (returns 409 Conflict)
- Pagination defaults: skip=0, limit=50, max_limit=100
- All responses include `status: "success"` field for consistency
- JSON columns (visual_identity, etc.) accept arbitrary dictionaries for flexibility
