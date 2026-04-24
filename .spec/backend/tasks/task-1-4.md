---
phase: 1
task_number: 1.4
title: Implement Auth Middleware (Supabase JWT)
description: Validate Supabase JWT tokens, extract workspace_id, enforce authentication on protected endpoints
dependencies: [1.1, 1.3]
parallel: false
estimated_time: 2 hours
---

# Task 1.4: Implement Auth Middleware (Supabase JWT)

## Context

This task implements Supabase JWT validation at the API layer. Every request to protected endpoints must include a valid `Authorization: Bearer {token}` header. The middleware extracts user_id and workspace_id from the JWT payload and attaches them to the request context. Subsequent tasks use request.state to enforce workspace isolation.

## Acceptance Criteria

- [ ] `app/core/auth.py` created with `verify_token()` function
- [ ] `app/middleware/__init__.py` created
- [ ] `app/middleware/auth.py` created with `auth_middleware()` function
- [ ] Middleware registered in `app/main.py` with `.add_middleware()`
- [ ] Valid JWT → payload extracted, user_id + workspace_id added to request.state
- [ ] Invalid JWT → 401 Unauthorized with error detail
- [ ] Expired JWT → 401 Unauthorized with "Token expired" detail
- [ ] Missing Authorization header → 401 Unauthorized
- [ ] Malformed Authorization header (not "Bearer ...") → 401 Unauthorized
- [ ] Health check endpoint (/health) skips auth
- [ ] Docs endpoint (/docs) skips auth
- [ ] OpenAPI endpoint (/openapi.json) skips auth
- [ ] Root endpoint (/) skips auth
- [ ] Subsequent tasks can access request.state.workspace_id without error
- [ ] JWT validation uses Supabase public key (offline validation, no API call)

## Files to Create

1. **app/core/auth.py** — JWT validation logic
2. **app/middleware/__init__.py** — Middleware module marker
3. **app/middleware/auth.py** — FastAPI middleware

## Files to Modify

1. **app/main.py** — Register middleware and import

## Implementation Steps

### Step 1: Create app/core/auth.py

```python
import jwt
from fastapi import HTTPException, status
from app.core.config import settings
from typing import Dict


def verify_token(token: str) -> Dict:
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
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token expired"
        )
    except jwt.InvalidTokenError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Invalid token: {str(e)}"
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Authentication failed: {str(e)}"
        )
```

### Step 2: Create app/middleware/__init__.py

Empty file (package marker).

### Step 3: Create app/middleware/auth.py

```python
from fastapi import Request, HTTPException, status
from app.core.auth import verify_token
import logging

logger = logging.getLogger(__name__)


async def auth_middleware(request: Request, call_next):
    """Extract JWT token, validate, add user_id and workspace_id to request.state."""
    
    # Skip auth for public endpoints
    public_paths = ["/health", "/docs", "/openapi.json", "/", "/redoc"]
    if request.url.path in public_paths:
        return await call_next(request)
    
    # Extract Authorization header
    auth_header = request.headers.get("Authorization")
    if not auth_header:
        logger.warning(f"Missing Authorization header for {request.url.path}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing Authorization header"
        )
    
    # Verify "Bearer " prefix
    if not auth_header.startswith("Bearer "):
        logger.warning(f"Invalid Authorization header format for {request.url.path}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid Authorization header format. Expected 'Bearer {token}'"
        )
    
    # Extract token
    token = auth_header[7:]  # Remove "Bearer " prefix
    
    # Verify token
    try:
        payload = verify_token(token)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Unexpected error during token verification: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token verification failed"
        )
    
    # Extract claims from payload
    user_id = payload.get("sub")
    workspace_id = payload.get("workspace_id")
    email = payload.get("email")
    
    if not user_id:
        logger.warning("Missing 'sub' claim in JWT")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token missing user ID"
        )
    
    if not workspace_id:
        logger.warning("Missing 'workspace_id' claim in JWT")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token missing workspace ID"
        )
    
    # Attach to request state
    request.state.user_id = user_id
    request.state.workspace_id = workspace_id
    request.state.email = email
    
    logger.info(f"Auth successful: user={user_id}, workspace={workspace_id}")
    
    return await call_next(request)
```

### Step 4: Modify app/main.py

Update the imports and middleware registration:

```python
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.middleware.auth import auth_middleware
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

# Auth middleware (must be after CORS)
app.add_middleware(middleware_class=type("AuthMiddleware", (), {
    "__call__": lambda self, scope: auth_middleware(
        Request(scope),
        lambda r: app.router(r)
    )
}))

# OR use the simpler approach:
app.middleware("http")(auth_middleware)


@app.get("/health")
async def health_check():
    """Health check endpoint for Render."""
    return {"status": "ok"}


@app.get("/")
async def root():
    """Root endpoint."""
    return {"message": "Content Engine Backend API"}
```

## Test Cases

### Test 1: Valid JWT

```python
# Create a valid JWT using PyJWT
import jwt
from datetime import datetime, timedelta

secret = "test-secret"
payload = {
    "sub": "user123",
    "workspace_id": "workspace456",
    "email": "test@example.com",
    "exp": datetime.utcnow() + timedelta(hours=1)
}
token = jwt.encode(payload, secret, algorithm="HS256")

# Test: GET /protected-endpoint with Authorization: Bearer {token}
# Expected: 200 OK, request.state.user_id = "user123"
```

### Test 2: Missing Authorization Header

```
GET /protected-endpoint
# No Authorization header
# Expected: 401 Unauthorized
```

### Test 3: Invalid Token

```
GET /protected-endpoint
Authorization: Bearer invalid.token.here
# Expected: 401 Unauthorized
```

### Test 4: Expired Token

```python
# Create an expired JWT
payload = {
    "sub": "user123",
    "workspace_id": "workspace456",
    "exp": datetime.utcnow() - timedelta(hours=1)  # Already expired
}
token = jwt.encode(payload, secret, algorithm="HS256")

# Test: GET /protected-endpoint with Authorization: Bearer {token}
# Expected: 401 Unauthorized, detail="Token expired"
```

### Test 5: Public Endpoints Skip Auth

```
GET /health
# No Authorization header
# Expected: 200 OK, {"status": "ok"}

GET /docs
# No Authorization header
# Expected: 200 OK, Swagger UI HTML
```

## Verification Checklist

- [ ] `from app.core.auth import verify_token` imports successfully
- [ ] `from app.middleware.auth import auth_middleware` imports
- [ ] Middleware registered in app/main.py
- [ ] Valid JWT passes verification
- [ ] Invalid JWT raises 401 Unauthorized
- [ ] Expired JWT raises 401 Unauthorized with "Token expired" detail
- [ ] Missing Authorization header raises 401 Unauthorized
- [ ] request.state.user_id and request.state.workspace_id accessible in routes
- [ ] /health endpoint accessible without auth
- [ ] /docs endpoint accessible without auth
- [ ] /openapi.json endpoint accessible without auth
- [ ] All other endpoints require valid auth

## Commit Message

```
feat: implement Supabase JWT authentication middleware with workspace isolation
```

## Notes

- Supabase JWT_SECRET found in Project Settings → API
- JWT validation is done offline using the secret (no API call needed)
- workspace_id must be included in JWT payload by frontend during login
- Token expiry is checked automatically by PyJWT
- All subsequent routes use request.state.workspace_id for isolation
- Logger configured to track auth failures (security audit trail)
