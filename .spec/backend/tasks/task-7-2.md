---
phase: 7
task_number: 7.2
title: GitHub Actions CI/CD
description: Create CI/CD pipeline for testing and auto-deployment to Render
dependencies: [1.1, 7.1]
parallel: false
estimated_time: 2 hours
---

# Task 7.2: GitHub Actions CI/CD

## Context

GitHub Actions automates testing on every push and deployment on merge to main. This task creates two workflows: CI (tests, linting) and CD (deploy to Render).

## Acceptance Criteria

- [ ] `.github/workflows/ci.yml` created with test job
- [ ] `.github/workflows/deploy.yml` created with deploy job
- [ ] CI runs: install dependencies, lint (black, ruff), pytest
- [ ] CI requires PostgreSQL service for integration tests
- [ ] CI publishes coverage to codecov
- [ ] All tests must pass before merge
- [ ] Deploy job triggers only on merge to main
- [ ] Deploy calls Render webhook to trigger deploy
- [ ] Env variables (RENDER_SERVICE_ID, RENDER_API_KEY) set as secrets
- [ ] Linting failures block merge
- [ ] Test failures block merge

## Files to Create

1. **.github/workflows/ci.yml** — Test workflow
2. **.github/workflows/deploy.yml** — Deploy workflow

## Implementation Steps

### Step 1: Create .github/workflows/ci.yml

```yaml
name: Tests

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main ]

jobs:
  test:
    runs-on: ubuntu-latest
    
    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_USER: postgres
          POSTGRES_PASSWORD: postgres
          POSTGRES_DB: test_db
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
        ports:
          - 5432:5432
    
    steps:
    - name: Checkout code
      uses: actions/checkout@v4
    
    - name: Set up Python
      uses: actions/setup-python@v4
      with:
        python-version: '3.11'
        cache: 'pip'
    
    - name: Install dependencies
      run: |
        python -m pip install --upgrade pip
        pip install -r requirements.txt
    
    - name: Lint with black
      run: |
        black --check app/
    
    - name: Lint with ruff
      run: |
        ruff check app/
    
    - name: Run tests
      env:
        DATABASE_URL: postgresql://postgres:postgres@localhost:5432/test_db
        SUPABASE_URL: http://localhost:8000
        SUPABASE_JWT_SECRET: test-secret-key
        ANTHROPIC_API_KEY: test-key
        ENVIRONMENT: test
      run: |
        pytest --cov=app --cov-report=xml --cov-report=term-missing
    
    - name: Upload coverage to Codecov
      uses: codecov/codecov-action@v3
      with:
        file: ./coverage.xml
        flags: unittests
        name: codecov-umbrella

  security:
    runs-on: ubuntu-latest
    steps:
    - name: Checkout code
      uses: actions/checkout@v4
    
    - name: Run Bandit security check
      uses: gaurav-nelson/github-action-bandit@v1
      with:
        path: "app"
```

### Step 2: Create .github/workflows/deploy.yml

```yaml
name: Deploy to Production

on:
  push:
    branches: [ main ]

jobs:
  deploy:
    runs-on: ubuntu-latest
    needs: test
    
    steps:
    - name: Checkout code
      uses: actions/checkout@v4
    
    - name: Trigger Render deploy
      run: |
        curl -X POST "https://api.render.com/deploy/srv-${{ secrets.RENDER_SERVICE_ID }}?key=${{ secrets.RENDER_API_KEY }}"
    
    - name: Wait for deployment
      run: |
        echo "Deployment triggered. Monitor progress at https://dashboard.render.com"
        sleep 10
```

## Verification Checklist

- [ ] CI workflow file created with test job
- [ ] Deploy workflow file created
- [ ] CI runs on push to main and develop
- [ ] CI runs on PR to main
- [ ] PostgreSQL service configured
- [ ] black and ruff linting configured
- [ ] pytest runs with coverage
- [ ] Coverage uploaded to codecov
- [ ] Deploy workflow triggers on main merge only
- [ ] Render webhook configured
- [ ] RENDER_SERVICE_ID and RENDER_API_KEY set as secrets

## Setup Instructions

1. Add secrets to GitHub repo:
   - Go to Settings → Secrets and variables → Actions
   - Add `RENDER_SERVICE_ID` (from Render dashboard)
   - Add `RENDER_API_KEY` (from Render API tokens)

2. Verify workflows appear in Actions tab after push

## Commit Message

```
ci: add GitHub Actions CI/CD pipeline with testing and auto-deployment
```

## Notes

- PostgreSQL service runs in-memory for tests (no persistence needed)
- Coverage results published to codecov.io
- Bandit runs security checks (fails on common vulnerabilities)
- Render API key enables automatic deployments
- Tests must pass before deploy job runs (needs: test)
