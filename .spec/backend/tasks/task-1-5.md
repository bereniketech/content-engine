---
phase: 1
task_number: 1.5
title: Add Error Handling & Response Models
description: Standardize error responses, create Pydantic request/response models, implement global error handler
dependencies: [1.1, 1.4]
parallel: false
estimated_time: 2 hours
---

# Task 1.5: Add Error Handling & Response Models

## Context

This task creates the standardized response format for the entire API. All endpoints return consistent JSON structures for success and error cases. Pydantic models define the contract for request validation and response serialization. A global exception handler catches errors and returns properly formatted responses without exposing stack traces.

## Acceptance Criteria

- [ ] `app/core/errors.py` created with custom exception classes
- [ ] `app/schemas/__init__.py` created with base response models
- [ ] `app/schemas/common.py` created with standardized error/success responses
- [ ] `app/middleware/error_handler.py` created with global error handler
- [ ] Global error handler registered in `app/main.py`
- [ ] 400 Validation errors return: `{"error": "validation_error", "message": "...", "details": {...}}`
- [ ] 401 Unauthorized returns: `{"error": "unauthorized", "message": "..."}`
- [ ] 403 Forbidden returns: `{"error": "forbidden", "message": "..."}`
- [ ] 404 Not Found returns: `{"error": "not_found", "message": "..."}`
- [ ] 409 Conflict returns: `{"error": "conflict", "message": "..."}`
- [ ] 500 Server errors return: `{"error": "internal_error", "message": "..."}` (no stack trace)
- [ ] All 5xx errors log full stack trace (not returned to client)
- [ ] Pydantic validation errors caught and formatted
- [ ] All exception classes inherit from custom base or HTTPException
- [ ] Request/response models use consistent naming (Request, Response suffixes)

## Files to Create

1. **app/core/errors.py** — Custom exception classes
2. **app/schemas/__init__.py** — Schema module marker
3. **app/schemas/common.py** — Base request/response models
4. **app/middleware/error_handler.py** — Global error handler

## Files to Modify

1. **app/main.py** — Register error handler

## Implementation Steps

### Step 1: Create app/core/errors.py

```python
from fastapi import HTTPException, status
from typing import Optional, Dict, Any


class APIError(HTTPException):
    """Base exception for API errors."""
    
    def __init__(self, status_code: int, error_code: str, message: str, details: Optional[Dict[str, Any]] = None):
        self.error_code = error_code
        self.message = message
        self.details = details or {}
        detail = {
            "error": error_code,
            "message": message,
            "details": self.details
        }
        super().__init__(status_code=status_code, detail=detail)


class ValidationError(APIError):
    def __init__(self, message: str, details: Optional[Dict[str, Any]] = None):
        super().__init__(
            status_code=status.HTTP_400_BAD_REQUEST,
            error_code="validation_error",
            message=message,
            details=details
        )


class UnauthorizedError(APIError):
    def __init__(self, message: str = "Unauthorized"):
        super().__init__(
            status_code=status.HTTP_401_UNAUTHORIZED,
            error_code="unauthorized",
            message=message
        )


class ForbiddenError(APIError):
    def __init__(self, message: str = "Access denied"):
        super().__init__(
            status_code=status.HTTP_403_FORBIDDEN,
            error_code="forbidden",
            message=message
        )


class NotFoundError(APIError):
    def __init__(self, resource: str):
        super().__init__(
            status_code=status.HTTP_404_NOT_FOUND,
            error_code="not_found",
            message=f"{resource} not found"
        )


class ConflictError(APIError):
    def __init__(self, message: str):
        super().__init__(
            status_code=status.HTTP_409_CONFLICT,
            error_code="conflict",
            message=message
        )


class InternalError(APIError):
    def __init__(self, message: str = "Internal server error"):
        super().__init__(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            error_code="internal_error",
            message=message
        )
```

### Step 2: Create app/schemas/__init__.py

Empty file (package marker).

### Step 3: Create app/schemas/common.py

```python
from pydantic import BaseModel
from typing import Optional, Dict, Any, List


class ErrorResponse(BaseModel):
    """Standard error response."""
    error: str
    message: str
    details: Optional[Dict[str, Any]] = None


class SuccessResponse(BaseModel):
    """Standard success response wrapper."""
    status: str = "success"
    data: Dict[str, Any]


class PaginatedResponse(BaseModel):
    """Standard paginated response."""
    status: str = "success"
    data: List[Dict[str, Any]]
    total: int
    page: int
    page_size: int
    total_pages: int


class HealthCheckResponse(BaseModel):
    """Health check endpoint response."""
    status: str


class CreatedResponse(BaseModel):
    """Resource creation response."""
    status: str = "success"
    id: str
    created_at: str


class ListResponse(BaseModel):
    """List of resources response."""
    status: str = "success"
    count: int
    items: List[Dict[str, Any]]


class JobStatusResponse(BaseModel):
    """Async job status response."""
    job_id: str
    status: str  # pending, processing, completed, failed
    result: Optional[Dict[str, Any]] = None
    error: Optional[str] = None


class ValidationErrorDetail(BaseModel):
    """Single validation error detail."""
    field: str
    message: str
    value: Optional[Any] = None
```

### Step 4: Create app/middleware/error_handler.py

```python
from fastapi import Request, status
from fastapi.responses import JSONResponse
from app.core.errors import APIError
from pydantic import ValidationError as PydanticValidationError
import logging

logger = logging.getLogger(__name__)


async def global_exception_handler(request: Request, exc: Exception):
    """Global exception handler for all unhandled errors."""
    
    # Handle APIError (custom exceptions)
    if isinstance(exc, APIError):
        return JSONResponse(
            status_code=exc.status_code,
            content=exc.detail
        )
    
    # Handle Pydantic validation errors
    if isinstance(exc, PydanticValidationError):
        details = []
        for error in exc.errors():
            field = ".".join(str(x) for x in error["loc"])
            details.append({
                "field": field,
                "message": error["msg"],
                "type": error["type"]
            })
        
        return JSONResponse(
            status_code=status.HTTP_400_BAD_REQUEST,
            content={
                "error": "validation_error",
                "message": "Request validation failed",
                "details": details
            }
        )
    
    # Handle unexpected errors
    logger.exception(f"Unhandled exception for {request.url.path}: {str(exc)}")
    
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "error": "internal_error",
            "message": "An unexpected error occurred",
            "details": {}
        }
    )
```

### Step 5: Modify app/main.py

Update to register the global error handler:

```python
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.exceptions import RequestValidationError
from app.middleware.auth import auth_middleware
from app.middleware.error_handler import global_exception_handler
from app.core.errors import APIError
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="Content Engine Backend API",
    description="FastAPI microservice for brand kit management, content generation, and distribution",
    version="0.1.0",
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "https://content-engine.onrender.com"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Auth middleware
app.middleware("http")(auth_middleware)

# Register exception handlers
app.add_exception_handler(APIError, global_exception_handler)
app.add_exception_handler(RequestValidationError, global_exception_handler)
app.add_exception_handler(Exception, global_exception_handler)


@app.get("/health")
async def health_check():
    """Health check endpoint for Render."""
    return {"status": "ok"}


@app.get("/")
async def root():
    """Root endpoint."""
    return {"message": "Content Engine Backend API"}
```

## Usage Examples

### Raising Validation Error

```python
from app.core.errors import ValidationError

@router.post("/brand-kits")
async def create_brand_kit(data: CreateBrandKitRequest):
    if not data.name or len(data.name) < 3:
        raise ValidationError(
            "Brand kit name must be at least 3 characters",
            details={"field": "name", "min_length": 3}
        )
    ...
```

### Raising Not Found Error

```python
from app.core.errors import NotFoundError

@router.get("/brand-kits/{kit_id}")
async def get_brand_kit(kit_id: str):
    kit = db.query(BrandKit).filter(BrandKit.id == kit_id).first()
    if not kit:
        raise NotFoundError("Brand kit")
    return kit
```

### Raising Forbidden Error

```python
from app.core.errors import ForbiddenError

@router.get("/brand-kits/{kit_id}")
async def get_brand_kit(kit_id: str, request: Request):
    kit = db.query(BrandKit).filter(
        BrandKit.id == kit_id,
        BrandKit.workspace_id == request.state.workspace_id
    ).first()
    if not kit:
        raise ForbiddenError("You do not have access to this resource")
    return kit
```

## Test Cases

### Test 1: Validation Error

```python
# POST /brand-kits with invalid data
# Expected: 400 Bad Request
# Response: {"error": "validation_error", "message": "...", "details": [...]}
```

### Test 2: Not Found Error

```python
# GET /brand-kits/nonexistent-id
# Expected: 404 Not Found
# Response: {"error": "not_found", "message": "Brand kit not found"}
```

### Test 3: Unauthorized Error

```python
# GET /protected-endpoint without Authorization header
# Expected: 401 Unauthorized
# Response: {"error": "unauthorized", "message": "..."}
```

### Test 4: Server Error (no stack trace)

```python
# Simulate an exception in a route
# Expected: 500 Internal Error
# Response: {"error": "internal_error", "message": "An unexpected error occurred", "details": {}}
# (Stack trace only in server logs, not returned)
```

## Verification Checklist

- [ ] `from app.core.errors import *` imports all exception classes
- [ ] `from app.schemas.common import *` imports all response models
- [ ] All exception classes inherit from APIError or HTTPException
- [ ] Global error handler registered in app/main.py
- [ ] Custom exceptions return proper JSON with error code, message, details
- [ ] Pydantic validation errors caught and formatted
- [ ] Server errors (500) don't expose stack trace to client
- [ ] Stack trace logged to server logs (via logger.exception)
- [ ] All error responses include "error" field with code (not HTTP status)

## Commit Message

```
feat: add standardized error handling and response models for all API endpoints
```

## Notes

- All error responses follow the same format: `{error, message, details?}`
- Success responses use `{status: "success", data: {...}}` wrapper
- Validation errors include details about which fields failed
- Server logs capture full stack traces for debugging
- Client receives only user-friendly error messages
