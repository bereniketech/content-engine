---
task: 002
feature: brand-kit-newsjacking
status: pending
model: haiku
supervisor: software-cto
agent: web-backend-expert
depends_on: [001]
---

# Task 002: Build Brand Kit Service — CRUD API (Read/Write/List)

## Skills
- .kit/skills/development/api-design/SKILL.md
- .kit/skills/frameworks-backend/fastapi-patterns/SKILL.md
- .kit/skills/development/code-writing-software-development/SKILL.md

## Agents
- @web-backend-expert

## Commands
- /verify

> Load the skills listed above before reading anything else. Do not load context not listed here.

---

## Objective

Implement FastAPI endpoints for brand kit CRUD operations: create, read, list, update individual sections (visual identity, content identity, platform overrides, performance benchmarks). All endpoints validate input and return correct status codes.

---

## Files

### Create

| File | Purpose |
|------|---------|
| `app/services/brand_kit_service.py` | Business logic for brand kit CRUD |
| `app/models/brand_kit_models.py` | Pydantic models for request/response validation |
| `app/routes/brand_kits.py` | FastAPI endpoints for brand kit CRUD |
| `tests/integration/test_brand_kit_api.py` | Integration tests for CRUD endpoints |

---

## Dependencies

```bash
# Install (skip if already in requirements.txt):
pip install fastapi pydantic sqlalchemy psycopg2-binary
```

**Env vars this task introduces:**
- `DATABASE_URL=postgresql://user:pass@localhost/content_engine`

---

## API Contracts

```
POST /workspaces/{workspace_id}/brand-kits
  Headers: Authorization: Bearer {token}
  Request:  { name: string }
  Response 201: { id, workspace_id, name, version: 1, is_active: false, created_at }
  Response 400: { error: 'bad_request', message: 'name is required' }
  Response 401: { error: 'unauthorized' }
  Response 403: { error: 'forbidden', message: 'no access to workspace' }

GET /workspaces/{workspace_id}/brand-kits
  Headers: Authorization: Bearer {token}
  Response 200: [ { id, name, version, is_active, approved_at, created_at }, ... ]
  Response 401: { error: 'unauthorized' }
  Response 403: { error: 'forbidden' }

GET /workspaces/{workspace_id}/brand-kits/{brand_kit_id}
  Headers: Authorization: Bearer {token}
  Response 200: { id, workspace_id, name, version, visual_identity, content_identity, platform_overrides, performance_benchmarks, is_active, created_at, updated_at }
  Response 401: { error: 'unauthorized' }
  Response 403: { error: 'forbidden' }
  Response 404: { error: 'not_found', message: 'brand kit not found' }

PATCH /workspaces/{workspace_id}/brand-kits/{brand_kit_id}
  Headers: Authorization: Bearer {token}
  Request:  { 
    visual_identity?: VisualIdentityRequest,
    content_identity?: ContentIdentityRequest,
    platform_overrides?: Record<platform, PlatformOverrideRequest>,
    performance_benchmarks?: Record<platform, PerformanceBenchmarkRequest>
  }
  Response 200: { id, ..., updated_at }
  Response 400: { error: 'validation_error', message: 'invalid color code', details: { field: 'color_palette.primary' } }
  Response 401: { error: 'unauthorized' }
  Response 403: { error: 'forbidden' }
  Response 404: { error: 'not_found' }
```

---

## Code Templates

### `app/models/brand_kit_models.py`

```python
from pydantic import BaseModel, field_validator, constr
from typing import Optional, Dict, List
from datetime import datetime
from uuid import UUID

class ColorPalette(BaseModel):
    primary: constr(regex=r'^#[0-9A-Fa-f]{6}$')
    secondary: constr(regex=r'^#[0-9A-Fa-f]{6}$')
    accent: constr(regex=r'^#[0-9A-Fa-f]{6}$')
    neutral: constr(regex=r'^#[0-9A-Fa-f]{6}$')

class Typography(BaseModel):
    heading_font: str
    body_font: str
    size_scale: str

class VisualIdentityRequest(BaseModel):
    color_palette: ColorPalette
    typography: Typography
    logo_url: Optional[str] = None
    imagery_style: Optional[str] = None
    spacing_system: Optional[Dict] = None

class ContentIdentityRequest(BaseModel):
    positioning_statement: constr(min_length=1, max_length=500)
    tone_descriptors: List[str]
    content_pillars: List[constr(min_length=1)]
    audience_icp: Dict
    key_messages: List[constr(min_length=1)]
    banned_words: Optional[List[str]] = None
    writing_rules: Optional[Dict] = None
    
    @field_validator('content_pillars')
    def validate_pillars(cls, v):
        if len(v) < 3 or len(v) > 5:
            raise ValueError('Must have 3–5 content pillars')
        return v
    
    @field_validator('key_messages')
    def validate_messages(cls, v):
        if len(v) < 5 or len(v) > 7:
            raise ValueError('Must have 5–7 key messages')
        return v

class PlatformOverrideRequest(BaseModel):
    voice_variation: Optional[str] = None
    content_rules: Dict
    format_preferences: Optional[Dict] = None
    posting_window: Optional[str] = None
    frequency_targets: Optional[Dict] = None

class PerformanceBenchmarkRequest(BaseModel):
    historical_best_format: Optional[str] = None
    historical_best_topics: Optional[List[str]] = None
    current_follower_count: Optional[int] = None
    target_metrics: Optional[Dict] = None

class BrandKitCreateRequest(BaseModel):
    name: constr(min_length=1, max_length=255)

class BrandKitUpdateRequest(BaseModel):
    visual_identity: Optional[VisualIdentityRequest] = None
    content_identity: Optional[ContentIdentityRequest] = None
    platform_overrides: Optional[Dict[str, PlatformOverrideRequest]] = None
    performance_benchmarks: Optional[Dict[str, PerformanceBenchmarkRequest]] = None

class BrandKitResponse(BaseModel):
    id: UUID
    workspace_id: UUID
    name: str
    version: int
    is_active: bool
    approved_at: Optional[datetime] = None
    created_at: datetime
    updated_at: Optional[datetime] = None
    visual_identity: Optional[Dict] = None
    content_identity: Optional[Dict] = None
    platform_overrides: Optional[Dict] = None
    performance_benchmarks: Optional[Dict] = None

    class Config:
        from_attributes = True
```

### `app/services/brand_kit_service.py`

```python
from sqlalchemy.orm import Session
from sqlalchemy import and_
from uuid import UUID
import json
from datetime import datetime
from app.models.orm import BrandKit, BrandVisualIdentity, BrandContentIdentity, BrandPlatformOverride, BrandPerformanceBenchmark

class BrandKitService:
    def __init__(self, db: Session):
        self.db = db
    
    def create_brand_kit(self, workspace_id: UUID, name: str) -> BrandKit:
        """Create a new brand kit with version=1, is_active=false."""
        kit = BrandKit(
            workspace_id=workspace_id,
            name=name,
            version=1,
            is_active=False
        )
        self.db.add(kit)
        self.db.commit()
        self.db.refresh(kit)
        return kit
    
    def list_brand_kits(self, workspace_id: UUID) -> list[BrandKit]:
        """List all brand kits for a workspace."""
        return self.db.query(BrandKit).filter(
            BrandKit.workspace_id == workspace_id
        ).order_by(BrandKit.created_at.desc()).all()
    
    def get_brand_kit(self, workspace_id: UUID, brand_kit_id: UUID) -> BrandKit:
        """Get a specific brand kit with all related data."""
        return self.db.query(BrandKit).filter(
            and_(
                BrandKit.workspace_id == workspace_id,
                BrandKit.id == brand_kit_id
            )
        ).first()
    
    def update_visual_identity(self, brand_kit_id: UUID, data: dict) -> BrandKit:
        """Update visual identity section of brand kit."""
        kit = self.db.query(BrandKit).filter(BrandKit.id == brand_kit_id).first()
        if not kit:
            return None
        
        vis = self.db.query(BrandVisualIdentity).filter(
            BrandVisualIdentity.brand_kit_id == brand_kit_id
        ).first()
        
        if vis:
            vis.color_palette = data.get('color_palette', vis.color_palette)
            vis.typography = data.get('typography', vis.typography)
            vis.logo_url = data.get('logo_url', vis.logo_url)
            vis.imagery_style = data.get('imagery_style', vis.imagery_style)
            vis.spacing_system = data.get('spacing_system', vis.spacing_system)
        else:
            vis = BrandVisualIdentity(
                brand_kit_id=brand_kit_id,
                color_palette=data['color_palette'],
                typography=data['typography'],
                logo_url=data.get('logo_url'),
                imagery_style=data.get('imagery_style'),
                spacing_system=data.get('spacing_system')
            )
            self.db.add(vis)
        
        kit.updated_at = datetime.utcnow()
        self.db.commit()
        self.db.refresh(kit)
        return kit
    
    def update_content_identity(self, brand_kit_id: UUID, data: dict) -> BrandKit:
        """Update content identity section of brand kit."""
        kit = self.db.query(BrandKit).filter(BrandKit.id == brand_kit_id).first()
        if not kit:
            return None
        
        cont = self.db.query(BrandContentIdentity).filter(
            BrandContentIdentity.brand_kit_id == brand_kit_id
        ).first()
        
        if cont:
            cont.positioning_statement = data.get('positioning_statement', cont.positioning_statement)
            cont.tone_descriptors = data.get('tone_descriptors', cont.tone_descriptors)
            cont.content_pillars = data.get('content_pillars', cont.content_pillars)
            cont.audience_icp = data.get('audience_icp', cont.audience_icp)
            cont.key_messages = data.get('key_messages', cont.key_messages)
            cont.banned_words = data.get('banned_words', cont.banned_words)
            cont.writing_rules = data.get('writing_rules', cont.writing_rules)
        else:
            cont = BrandContentIdentity(
                brand_kit_id=brand_kit_id,
                positioning_statement=data['positioning_statement'],
                tone_descriptors=data['tone_descriptors'],
                content_pillars=data['content_pillars'],
                audience_icp=data['audience_icp'],
                key_messages=data['key_messages'],
                banned_words=data.get('banned_words'),
                writing_rules=data.get('writing_rules')
            )
            self.db.add(cont)
        
        kit.updated_at = datetime.utcnow()
        self.db.commit()
        self.db.refresh(kit)
        return kit
    
    def update_platform_overrides(self, brand_kit_id: UUID, platform: str, data: dict) -> BrandKit:
        """Update platform-specific overrides."""
        kit = self.db.query(BrandKit).filter(BrandKit.id == brand_kit_id).first()
        if not kit:
            return None
        
        override = self.db.query(BrandPlatformOverride).filter(
            and_(
                BrandPlatformOverride.brand_kit_id == brand_kit_id,
                BrandPlatformOverride.platform == platform
            )
        ).first()
        
        if override:
            override.voice_variation = data.get('voice_variation', override.voice_variation)
            override.content_rules = data['content_rules']
            override.format_preferences = data.get('format_preferences', override.format_preferences)
            override.posting_window = data.get('posting_window', override.posting_window)
            override.frequency_targets = data.get('frequency_targets', override.frequency_targets)
        else:
            override = BrandPlatformOverride(
                brand_kit_id=brand_kit_id,
                platform=platform,
                voice_variation=data.get('voice_variation'),
                content_rules=data['content_rules'],
                format_preferences=data.get('format_preferences'),
                posting_window=data.get('posting_window'),
                frequency_targets=data.get('frequency_targets')
            )
            self.db.add(override)
        
        kit.updated_at = datetime.utcnow()
        self.db.commit()
        self.db.refresh(kit)
        return kit
    
    def update_performance_benchmark(self, brand_kit_id: UUID, platform: str, data: dict) -> BrandKit:
        """Update performance benchmarks."""
        kit = self.db.query(BrandKit).filter(BrandKit.id == brand_kit_id).first()
        if not kit:
            return None
        
        bench = self.db.query(BrandPerformanceBenchmark).filter(
            and_(
                BrandPerformanceBenchmark.brand_kit_id == brand_kit_id,
                BrandPerformanceBenchmark.platform == platform
            )
        ).first()
        
        if bench:
            bench.historical_best_format = data.get('historical_best_format', bench.historical_best_format)
            bench.historical_best_topics = data.get('historical_best_topics', bench.historical_best_topics)
            bench.current_follower_count = data.get('current_follower_count', bench.current_follower_count)
            bench.target_metrics = data.get('target_metrics', bench.target_metrics)
            bench.last_updated = datetime.utcnow()
        else:
            bench = BrandPerformanceBenchmark(
                brand_kit_id=brand_kit_id,
                platform=platform,
                historical_best_format=data.get('historical_best_format'),
                historical_best_topics=data.get('historical_best_topics'),
                current_follower_count=data.get('current_follower_count'),
                target_metrics=data.get('target_metrics'),
                last_updated=datetime.utcnow()
            )
            self.db.add(bench)
        
        kit.updated_at = datetime.utcnow()
        self.db.commit()
        self.db.refresh(kit)
        return kit
```

### `app/routes/brand_kits.py`

```python
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from uuid import UUID
from app.models.brand_kit_models import (
    BrandKitCreateRequest, BrandKitUpdateRequest, BrandKitResponse, 
    VisualIdentityRequest, ContentIdentityRequest
)
from app.services.brand_kit_service import BrandKitService
from app.dependencies import get_db, get_current_user, verify_workspace_access

router = APIRouter(prefix="/workspaces/{workspace_id}/brand-kits", tags=["brand-kits"])

@router.post("", status_code=status.HTTP_201_CREATED)
async def create_brand_kit(
    workspace_id: UUID,
    req: BrandKitCreateRequest,
    db: Session = Depends(get_db),
    user = Depends(get_current_user)
):
    """Create a new brand kit."""
    await verify_workspace_access(workspace_id, user, db)
    
    service = BrandKitService(db)
    kit = service.create_brand_kit(workspace_id, req.name)
    
    return {
        "id": kit.id,
        "workspace_id": kit.workspace_id,
        "name": kit.name,
        "version": kit.version,
        "is_active": kit.is_active,
        "created_at": kit.created_at
    }

@router.get("", status_code=status.HTTP_200_OK)
async def list_brand_kits(
    workspace_id: UUID,
    db: Session = Depends(get_db),
    user = Depends(get_current_user)
):
    """List all brand kits for a workspace."""
    await verify_workspace_access(workspace_id, user, db)
    
    service = BrandKitService(db)
    kits = service.list_brand_kits(workspace_id)
    
    return [
        {
            "id": kit.id,
            "name": kit.name,
            "version": kit.version,
            "is_active": kit.is_active,
            "approved_at": kit.approved_at,
            "created_at": kit.created_at
        }
        for kit in kits
    ]

@router.get("/{brand_kit_id}", status_code=status.HTTP_200_OK)
async def get_brand_kit(
    workspace_id: UUID,
    brand_kit_id: UUID,
    db: Session = Depends(get_db),
    user = Depends(get_current_user)
):
    """Get a specific brand kit with all related data."""
    await verify_workspace_access(workspace_id, user, db)
    
    service = BrandKitService(db)
    kit = service.get_brand_kit(workspace_id, brand_kit_id)
    
    if not kit:
        raise HTTPException(status_code=404, detail="Brand kit not found")
    
    # Fetch related data
    # TODO: Implement eager loading of visual_identity, content_identity, platform_overrides, performance_benchmarks
    
    return {
        "id": kit.id,
        "workspace_id": kit.workspace_id,
        "name": kit.name,
        "version": kit.version,
        "is_active": kit.is_active,
        "created_at": kit.created_at,
        "updated_at": kit.updated_at
    }

@router.patch("/{brand_kit_id}", status_code=status.HTTP_200_OK)
async def update_brand_kit(
    workspace_id: UUID,
    brand_kit_id: UUID,
    req: BrandKitUpdateRequest,
    db: Session = Depends(get_db),
    user = Depends(get_current_user)
):
    """Update sections of a brand kit (visual, content, platforms, benchmarks)."""
    await verify_workspace_access(workspace_id, user, db)
    
    service = BrandKitService(db)
    kit = service.get_brand_kit(workspace_id, brand_kit_id)
    
    if not kit:
        raise HTTPException(status_code=404, detail="Brand kit not found")
    
    if req.visual_identity:
        kit = service.update_visual_identity(brand_kit_id, req.visual_identity.dict())
    
    if req.content_identity:
        kit = service.update_content_identity(brand_kit_id, req.content_identity.dict())
    
    if req.platform_overrides:
        for platform, override in req.platform_overrides.items():
            kit = service.update_platform_overrides(brand_kit_id, platform, override.dict())
    
    if req.performance_benchmarks:
        for platform, benchmark in req.performance_benchmarks.items():
            kit = service.update_performance_benchmark(brand_kit_id, platform, benchmark.dict())
    
    return {
        "id": kit.id,
        "workspace_id": kit.workspace_id,
        "name": kit.name,
        "version": kit.version,
        "is_active": kit.is_active,
        "updated_at": kit.updated_at
    }
```

### `tests/integration/test_brand_kit_api.py`

```python
import pytest
from uuid import uuid4
from app.main import app
from app.dependencies import get_db

@pytest.fixture
def client():
    return app.test_client()

@pytest.fixture
def workspace_id():
    return uuid4()

@pytest.fixture
def auth_header():
    return {"Authorization": "Bearer test-token"}

def test_create_brand_kit(client, workspace_id, auth_header):
    response = client.post(
        f"/workspaces/{workspace_id}/brand-kits",
        json={"name": "My Brand Kit"},
        headers=auth_header
    )
    assert response.status_code == 201
    data = response.json()
    assert data["name"] == "My Brand Kit"
    assert data["version"] == 1
    assert data["is_active"] == False

def test_create_brand_kit_missing_name(client, workspace_id, auth_header):
    response = client.post(
        f"/workspaces/{workspace_id}/brand-kits",
        json={},
        headers=auth_header
    )
    assert response.status_code == 400

def test_list_brand_kits(client, workspace_id, auth_header):
    # Create two kits
    client.post(f"/workspaces/{workspace_id}/brand-kits", json={"name": "Kit1"}, headers=auth_header)
    client.post(f"/workspaces/{workspace_id}/brand-kits", json={"name": "Kit2"}, headers=auth_header)
    
    response = client.get(f"/workspaces/{workspace_id}/brand-kits", headers=auth_header)
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 2

def test_get_brand_kit(client, workspace_id, auth_header):
    create_resp = client.post(
        f"/workspaces/{workspace_id}/brand-kits",
        json={"name": "My Kit"},
        headers=auth_header
    )
    kit_id = create_resp.json()["id"]
    
    response = client.get(f"/workspaces/{workspace_id}/brand-kits/{kit_id}", headers=auth_header)
    assert response.status_code == 200
    assert response.json()["id"] == kit_id

def test_get_brand_kit_not_found(client, workspace_id, auth_header):
    response = client.get(f"/workspaces/{workspace_id}/brand-kits/{uuid4()}", headers=auth_header)
    assert response.status_code == 404

def test_update_visual_identity(client, workspace_id, auth_header):
    create_resp = client.post(
        f"/workspaces/{workspace_id}/brand-kits",
        json={"name": "My Kit"},
        headers=auth_header
    )
    kit_id = create_resp.json()["id"]
    
    update_resp = client.patch(
        f"/workspaces/{workspace_id}/brand-kits/{kit_id}",
        json={
            "visual_identity": {
                "color_palette": {
                    "primary": "#000000",
                    "secondary": "#FFFFFF",
                    "accent": "#0084FF",
                    "neutral": "#CCCCCC"
                },
                "typography": {
                    "heading_font": "Arial",
                    "body_font": "Georgia",
                    "size_scale": "standard"
                }
            }
        },
        headers=auth_header
    )
    assert update_resp.status_code == 200

def test_update_visual_identity_invalid_color(client, workspace_id, auth_header):
    create_resp = client.post(
        f"/workspaces/{workspace_id}/brand-kits",
        json={"name": "My Kit"},
        headers=auth_header
    )
    kit_id = create_resp.json()["id"]
    
    update_resp = client.patch(
        f"/workspaces/{workspace_id}/brand-kits/{kit_id}",
        json={
            "visual_identity": {
                "color_palette": {
                    "primary": "invalid-color",
                    "secondary": "#FFFFFF",
                    "accent": "#0084FF",
                    "neutral": "#CCCCCC"
                },
                "typography": {"heading_font": "Arial", "body_font": "Georgia", "size_scale": "standard"}
            }
        },
        headers=auth_header
    )
    assert update_resp.status_code == 400
```

---

## Codebase Context

**Database schema:** From Task 001 (brand_kits, brand_visual_identity, brand_content_identity, brand_platform_overrides, brand_performance_benchmarks tables exist)

**Key Code Snippets:**

```python
# ORM Models (from app/models/orm.py)
class BrandKit(Base):
    __tablename__ = "brand_kits"
    id = Column(UUID, primary_key=True, default=uuid4)
    workspace_id = Column(UUID, ForeignKey("workspaces.id"), nullable=False)
    name = Column(String(255), nullable=False)
    version = Column(Integer, default=1)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, onupdate=datetime.utcnow)
    approved_at = Column(DateTime, nullable=True)
    is_active = Column(Boolean, default=False)
    # Relationships
    visual_identity = relationship("BrandVisualIdentity", uselist=False, back_populates="brand_kit")
    content_identity = relationship("BrandContentIdentity", uselist=False, back_populates="brand_kit")
    platform_overrides = relationship("BrandPlatformOverride", back_populates="brand_kit")
    performance_benchmarks = relationship("BrandPerformanceBenchmark", back_populates="brand_kit")

# Auth middleware (from app/dependencies.py)
async def get_current_user(token: str = Depends(HTTPBearer())) -> dict:
    # Decode JWT token, return user info
    pass

async def verify_workspace_access(workspace_id: UUID, user: dict, db: Session) -> None:
    # Check if user has access to workspace
    # Return 403 if not
    pass
```

**Key Patterns:**
- Validate all input at Pydantic layer (ColorPalette regex validates hex codes)
- Every API endpoint checks workspace_id authorization (verify_workspace_access)
- Service layer handles business logic; routes handle HTTP concerns
- Return 400 for validation errors, 404 for not found, 403 for forbidden

---

## Implementation Steps

1. Create `app/models/brand_kit_models.py` with Pydantic models (copy Code Template exactly)
2. Create `app/services/brand_kit_service.py` with BrandKitService class (copy template)
3. Create `app/routes/brand_kits.py` with FastAPI endpoints (copy template)
4. Create ORM models in `app/models/orm.py` (if not existing) — use SQLAlchemy declarative base
5. Create `app/dependencies.py` with `get_db()`, `get_current_user()`, `verify_workspace_access()` (stub implementations for now)
6. Register routes in `app/main.py`: `app.include_router(router)`
7. Create `tests/integration/test_brand_kit_api.py` with test cases (copy template)
8. Run: `pytest tests/integration/test_brand_kit_api.py -v`
9. Run: `/verify`

---

## Test Cases

_See Code Template above (`tests/integration/test_brand_kit_api.py`)_

---

## Decision Rules

| Scenario | Action |
|----------|--------|
| Invalid color code (not hex) | Return 400 with validation error |
| Content pillars < 3 or > 5 | Return 400 with validation error |
| Workspace access denied | Return 403 forbidden |
| Brand kit not found | Return 404 not found |
| Database error | Return 500 with generic error message |

---

## Acceptance Criteria

- [ ] WHEN POST /brand-kits with name THEN 201 created with version=1, is_active=false
- [ ] WHEN POST /brand-kits without name THEN 400 bad request
- [ ] WHEN GET /brand-kits THEN 200 with list of all kits for workspace
- [ ] WHEN GET /brand-kits/{id} THEN 200 with full kit data (visual, content, platforms, benchmarks)
- [ ] WHEN GET /brand-kits/{invalid_id} THEN 404 not found
- [ ] WHEN PATCH /brand-kits/{id} with visual_identity THEN 200 with updated_at timestamp
- [ ] WHEN PATCH with invalid color code THEN 400 validation error
- [ ] WHEN PATCH with < 3 or > 5 content pillars THEN 400 validation error
- [ ] WHEN PATCH with different workspace_id THEN 403 forbidden
- [ ] All integration tests pass
- [ ] `/verify` passes

---

## Handoff to Next Task

> Fill via `/task-handoff` after completing this task.

**Files changed:** _(fill via /task-handoff)_  
**Decisions made:** _(fill via /task-handoff)_  
**Context for next task:** _(fill via /task-handoff)_  
**Open questions:** _(fill via /task-handoff)_
