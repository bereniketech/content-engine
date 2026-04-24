---
phase: 2
task_number: 2.2
title: Implement Brand Kit Versioning
description: Add approve, activate, revert, and version history endpoints for brand kits
dependencies: [2.1]
parallel: false
estimated_time: 2 hours
---

# Task 2.2: Implement Brand Kit Versioning

## Context

Brand kits are versioned for audit trail and rollback capability. Users approve changes to create new versions, activate versions, and revert to old versions. This task adds 4 endpoints to manage versioning. The BrandKitVersion table tracks all approvals with timestamps, reasons, and change diffs.

## Acceptance Criteria

- [ ] `app/services/brand_kit_service.py` extended with approve, activate, revert, get_versions methods
- [ ] `app/schemas/brand_kit.py` extended with version-related request/response models
- [ ] `app/api/routes/brand_kits.py` extended with 4 versioning endpoints
- [ ] POST /brand-kits/{id}/approve increments version, sets approved_at, creates BrandKitVersion record
- [ ] POST /brand-kits/{id}/activate sets is_active=true, deactivates other versions in workspace
- [ ] GET /brand-kits/{id}/versions returns all versions with timestamps, approval status, change diffs
- [ ] POST /brand-kits/{id}/revert/{target_version} creates new unapproved version with old data
- [ ] Cannot approve already-approved kit (409 Conflict)
- [ ] Cannot revert to non-existent version (404 Not Found)
- [ ] All endpoints enforce workspace isolation
- [ ] Version records include created_by user_id
- [ ] Change diffs calculated and stored (JSON)

## Files to Modify

1. **app/services/brand_kit_service.py** — Add 4 methods
2. **app/schemas/brand_kit.py** — Add request/response models
3. **app/api/routes/brand_kits.py** — Add 4 endpoints

## Implementation Steps

### Step 1: Extend app/schemas/brand_kit.py

Add to end of file:

```python
class ApproveRequest(BaseModel):
    """Approve brand kit request."""
    reason: Optional[str] = Field(None, max_length=500)


class BrandKitVersionResponse(BaseModel):
    """Brand kit version response."""
    id: str
    brand_kit_id: str
    version: int
    approved_at: Optional[datetime]
    reason: Optional[str]
    changes: Dict[str, Any]
    created_by: Optional[str]
    created_at: datetime


class RevertRequest(BaseModel):
    """Revert to version request."""
    target_version: int = Field(..., ge=1)
```

### Step 2: Extend app/services/brand_kit_service.py

Add methods to BrandKitService class:

```python
from app.models import BrandKitVersion
from sqlalchemy import func
from datetime import datetime
import json


def approve_kit(
    self,
    kit_id: str,
    workspace_id: str,
    reason: Optional[str] = None,
    user_id: Optional[str] = None
) -> BrandKit:
    """Approve kit, increment version, create version record."""
    kit = self.get_kit(kit_id, workspace_id)
    
    # Cannot approve already-approved kit
    if kit.approved_at:
        raise ConflictError("Kit already approved. Create a new version instead.")
    
    # Calculate changes (diff against previous version)
    changes = self._compute_changes(kit)
    
    # Create version record
    version = BrandKitVersion(
        workspace_id=workspace_id,
        brand_kit_id=kit_id,
        version=kit.version,
        approved_at=datetime.utcnow(),
        reason=reason,
        changes=changes,
        created_by=user_id
    )
    
    # Update kit
    kit.version += 1
    kit.approved_at = datetime.utcnow()
    
    self.db.add(version)
    self.db.commit()
    self.db.refresh(kit)
    
    logger.info(f"Approved brand kit {kit_id}, new version {kit.version}")
    return kit


def activate_kit(self, kit_id: str, workspace_id: str) -> BrandKit:
    """Activate kit, deactivate all others in workspace."""
    kit = self.get_kit(kit_id, workspace_id)
    
    # Deactivate all others
    self.db.query(BrandKit).filter(
        and_(
            BrandKit.workspace_id == workspace_id,
            BrandKit.id != kit_id,
            BrandKit.is_active == True
        )
    ).update({BrandKit.is_active: False})
    
    # Activate this one
    kit.is_active = True
    self.db.commit()
    self.db.refresh(kit)
    
    logger.info(f"Activated brand kit {kit_id}")
    return kit


def get_versions(self, kit_id: str, workspace_id: str) -> List[BrandKitVersion]:
    """Get all versions of a kit."""
    # Verify workspace access
    kit = self.get_kit(kit_id, workspace_id)
    
    versions = self.db.query(BrandKitVersion).filter(
        and_(
            BrandKitVersion.brand_kit_id == kit_id,
            BrandKitVersion.workspace_id == workspace_id
        )
    ).order_by(BrandKitVersion.version.desc()).all()
    
    return versions


def revert_kit(
    self,
    kit_id: str,
    workspace_id: str,
    target_version: int,
    user_id: Optional[str] = None
) -> BrandKit:
    """Revert to old version (creates new unapproved version)."""
    kit = self.get_kit(kit_id, workspace_id)
    
    # Get target version
    target = self.db.query(BrandKitVersion).filter(
        and_(
            BrandKitVersion.brand_kit_id == kit_id,
            BrandKitVersion.version == target_version
        )
    ).first()
    
    if not target:
        raise NotFoundError(f"Brand kit version {target_version}")
    
    # Copy old version data to new version
    kit.visual_identity = target.changes.get("visual_identity", {})
    kit.content_identity = target.changes.get("content_identity", {})
    kit.platform_overrides = target.changes.get("platform_overrides", {})
    kit.performance_benchmarks = target.changes.get("performance_benchmarks", {})
    kit.approved_at = None  # New version is unapproved
    
    self.db.commit()
    self.db.refresh(kit)
    
    logger.info(f"Reverted brand kit {kit_id} to version {target_version}")
    return kit


def _compute_changes(self, kit: BrandKit) -> Dict[str, Any]:
    """Compute changes (current state snapshot)."""
    return {
        "visual_identity": kit.visual_identity,
        "content_identity": kit.content_identity,
        "platform_overrides": kit.platform_overrides,
        "performance_benchmarks": kit.performance_benchmarks,
    }
```

### Step 3: Extend app/api/routes/brand_kits.py

Add 4 endpoints to end of file:

```python
from app.schemas.brand_kit import ApproveRequest, RevertRequest, BrandKitVersionResponse


@router.post("/{kit_id}/approve", status_code=200)
async def approve_brand_kit(
    request: Request,
    kit_id: str,
    data: ApproveRequest,
    db: Session = Depends(get_db)
) -> dict:
    """Approve brand kit, increment version."""
    workspace_id = request.state.workspace_id
    user_id = request.state.user_id
    
    service = BrandKitService(db)
    kit = service.approve_kit(kit_id, workspace_id, data.reason, user_id)
    
    return {
        "status": "success",
        "data": {
            "id": kit.id,
            "version": kit.version,
            "approved_at": kit.approved_at.isoformat() if kit.approved_at else None,
        }
    }


@router.post("/{kit_id}/activate", status_code=200)
async def activate_brand_kit(
    request: Request,
    kit_id: str,
    db: Session = Depends(get_db)
) -> dict:
    """Activate brand kit (deactivate others in workspace)."""
    workspace_id = request.state.workspace_id
    
    service = BrandKitService(db)
    kit = service.activate_kit(kit_id, workspace_id)
    
    return {
        "status": "success",
        "data": {
            "id": kit.id,
            "is_active": kit.is_active,
        }
    }


@router.get("/{kit_id}/versions")
async def get_brand_kit_versions(
    request: Request,
    kit_id: str,
    db: Session = Depends(get_db)
) -> dict:
    """Get all versions of a brand kit."""
    workspace_id = request.state.workspace_id
    
    service = BrandKitService(db)
    versions = service.get_versions(kit_id, workspace_id)
    
    return {
        "status": "success",
        "count": len(versions),
        "items": [
            {
                "id": v.id,
                "version": v.version,
                "approved_at": v.approved_at.isoformat() if v.approved_at else None,
                "reason": v.reason,
                "changes": v.changes,
                "created_by": v.created_by,
                "created_at": v.created_at.isoformat(),
            }
            for v in versions
        ]
    }


@router.post("/{kit_id}/revert")
async def revert_brand_kit(
    request: Request,
    kit_id: str,
    data: RevertRequest,
    db: Session = Depends(get_db)
) -> dict:
    """Revert kit to old version (creates new unapproved version)."""
    workspace_id = request.state.workspace_id
    user_id = request.state.user_id
    
    service = BrandKitService(db)
    kit = service.revert_kit(kit_id, workspace_id, data.target_version, user_id)
    
    return {
        "status": "success",
        "data": {
            "id": kit.id,
            "version": kit.version,
            "approved_at": kit.approved_at,
            "message": f"Reverted to version {data.target_version}. New version is unapproved.",
        }
    }
```

## Test Cases

### Test 1: Approve Brand Kit

```bash
curl -X POST http://localhost:8000/brand-kits/{kit_id}/approve \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{"reason": "Initial brand approval"}'
# Expected: 200 OK, version incremented, approved_at set
```

### Test 2: Activate Brand Kit

```bash
curl -X POST http://localhost:8000/brand-kits/{kit_id}/activate \
  -H "Authorization: Bearer {token}"
# Expected: 200 OK, is_active=true
```

### Test 3: Get Versions

```bash
curl http://localhost:8000/brand-kits/{kit_id}/versions \
  -H "Authorization: Bearer {token}"
# Expected: 200 OK, list of all versions with changes
```

### Test 4: Revert to Version

```bash
curl -X POST http://localhost:8000/brand-kits/{kit_id}/revert \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{"target_version": 1}'
# Expected: 200 OK, kit reverted to version 1, new unapproved version created
```

## Verification Checklist

- [ ] BrandKitVersion table has records after approve
- [ ] Version number increments on approve
- [ ] approved_at timestamp set on approve
- [ ] Cannot approve already-approved kit (409 Conflict)
- [ ] activate_kit sets is_active=true for one kit, false for others
- [ ] get_versions returns all versions in order
- [ ] revert_kit creates new unapproved version
- [ ] Cannot revert to non-existent version (404)
- [ ] All endpoints enforce workspace isolation
- [ ] Change diffs calculated correctly

## Commit Message

```
feat: implement brand kit versioning with approve, activate, revert, and history endpoints
```

## Notes

- approved_at prevents further edits (Task 2.1 checks this)
- Only one kit can be is_active=true per workspace at any time
- Reverting creates a new unapproved version (doesn't directly revert to old version)
- Change diffs stored as JSON snapshot of all identity fields
- Version history immutable (cannot edit past versions)
