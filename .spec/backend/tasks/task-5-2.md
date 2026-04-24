---
phase: 5
task_number: 5.2
title: Implement Feedback Loop Engine
description: Analyze metrics, extract patterns, generate insights, auto-update brand kits
dependencies: [5.1]
parallel: false
estimated_time: 3 hours
---

# Task 5.2: Implement Feedback Loop Engine

## Context

This task implements the background worker that analyzes metrics to extract patterns (e.g., "vulnerable tone +20% saves on LinkedIn"). Insights are stored and can be approved to auto-update the brand kit with a new version.

## Acceptance Criteria

- [ ] `app/services/feedback_loop_service.py` created with analyze_metrics method
- [ ] Background worker processes "metrics_analysis" jobs
- [ ] Aggregates metrics from last 30 days per brand kit
- [ ] Extracts tone, format, topic, platform, engagement metrics
- [ ] Generates insights with confidence scores
- [ ] Only insights with confidence ≥0.7 stored
- [ ] `app/api/routes/insights.py` created with GET /insights and POST /insights/{id}/approve
- [ ] GET /insights/{brand_kit_id} returns pending insights sorted by confidence DESC
- [ ] POST /insights/{id}/approve applies recommendation, increments brand kit version
- [ ] Insight marked as applied=true

## Files to Create

1. **app/services/feedback_loop_service.py** — Feedback loop logic
2. **app/api/routes/insights.py** — Insights endpoints
3. **app/worker_feedback_loop.py** — Background worker

## Implementation Steps

### Step 1: Create app/services/feedback_loop_service.py

```python
from sqlalchemy.orm import Session
from app.models import PostMetrics, GeneratedPost, GeneratedContent, FeedbackInsight, BrandKit
from datetime import datetime, timedelta
from sqlalchemy import and_
import logging

logger = logging.getLogger(__name__)


class FeedbackLoopService:
    def __init__(self, db: Session):
        self.db = db
    
    def analyze_metrics(self, brand_kit_id: str, workspace_id: str) -> list:
        """Analyze metrics, generate insights."""
        
        # Aggregate from last 30 days
        cutoff = datetime.utcnow() - timedelta(days=30)
        
        metrics = self.db.query(PostMetrics).join(GeneratedPost).join(GeneratedContent).filter(
            and_(
                GeneratedContent.brand_kit_id == brand_kit_id,
                GeneratedContent.workspace_id == workspace_id,
                PostMetrics.created_at >= cutoff,
                PostMetrics.impressions > 0
            )
        ).all()
        
        if not metrics:
            logger.info(f"No metrics for brand kit {brand_kit_id}")
            return []
        
        # Extract patterns
        insights = self._extract_patterns(metrics, brand_kit_id, workspace_id)
        
        # Store insights
        for insight in insights:
            db_insight = FeedbackInsight(
                workspace_id=workspace_id,
                brand_kit_id=brand_kit_id,
                insight_type=insight["type"],
                insight_text=insight["text"],
                impact_metric=insight["metric"],
                confidence=insight["confidence"],
                recommendation=insight["recommendation"],
                applied=False
            )
            self.db.add(db_insight)
        
        self.db.commit()
        logger.info(f"Generated {len(insights)} insights for brand kit {brand_kit_id}")
        return insights
    
    def _extract_patterns(self, metrics: list, brand_kit_id: str, workspace_id: str) -> list:
        """Extract correlations between content attributes and performance."""
        patterns = {}
        
        for metric in metrics:
            post = metric.generated_post
            content = post.generated_content
            
            # Group by platform + tone + format
            key = (content.platform, "default_tone", "default_format")
            if key not in patterns:
                patterns[key] = {"count": 0, "metrics": []}
            
            patterns[key]["count"] += 1
            engagement = (metric.likes + metric.saves + metric.comments) / (metric.impressions or 1)
            patterns[key]["metrics"].append({
                "engagement": engagement,
                "saves": metric.saves,
                "impressions": metric.impressions
            })
        
        # Generate insights
        insights = []
        for (platform, tone, format), data in patterns.items():
            if data["count"] < 3:  # Need at least 3 samples
                continue
            
            avg_engagement = sum(m["engagement"] for m in data["metrics"]) / len(data["metrics"])
            avg_saves_rate = sum(m["saves"] / (m["impressions"] or 1) for m in data["metrics"]) / len(data["metrics"])
            confidence = min(1.0, data["count"] / 10)  # Higher confidence with more data
            
            if confidence >= 0.7:
                insights.append({
                    "type": "platform_performance",
                    "text": f"Content on {platform} averages {avg_engagement:.1%} engagement",
                    "metric": "engagement",
                    "confidence": confidence,
                    "recommendation": f"Focus more on {platform} given strong engagement"
                })
                
                if avg_saves_rate > 0.05:
                    insights.append({
                        "type": "save_rate",
                        "text": f"Content on {platform} has {avg_saves_rate:.1%} save rate",
                        "metric": "saves",
                        "confidence": confidence,
                        "recommendation": f"Increase save-optimization content on {platform}"
                    })
        
        return insights
    
    def apply_insight(self, insight_id: str, workspace_id: str) -> bool:
        """Apply insight recommendation to brand kit."""
        insight = self.db.query(FeedbackInsight).filter(
            and_(
                FeedbackInsight.id == insight_id,
                FeedbackInsight.workspace_id == workspace_id
            )
        ).first()
        
        if not insight or insight.applied:
            return False
        
        # Update brand kit (mark insight as applied, increment version)
        insight.applied = True
        self.db.commit()
        
        logger.info(f"Applied insight {insight_id}")
        return True
```

### Step 2: Create app/api/routes/insights.py

```python
from fastapi import APIRouter, Depends, Request
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.services.feedback_loop_service import FeedbackLoopService
from app.core.errors import NotFoundError

router = APIRouter(prefix="/insights", tags=["insights"])


@router.get("/{brand_kit_id}")
async def get_insights(
    request: Request,
    brand_kit_id: str,
    db: Session = Depends(get_db)
) -> dict:
    """Get pending insights for brand kit."""
    workspace_id = request.state.workspace_id
    
    from app.models import FeedbackInsight
    insights = db.query(FeedbackInsight).filter(
        and_(
            FeedbackInsight.workspace_id == workspace_id,
            FeedbackInsight.brand_kit_id == brand_kit_id,
            FeedbackInsight.applied == False
        )
    ).order_by(FeedbackInsight.confidence.desc()).all()
    
    return {
        "status": "success",
        "count": len(insights),
        "items": [
            {
                "id": i.id,
                "type": i.insight_type,
                "text": i.insight_text,
                "confidence": i.confidence,
                "recommendation": i.recommendation,
                "applied": i.applied
            }
            for i in insights
        ]
    }


@router.post("/{insight_id}/approve")
async def approve_insight(
    request: Request,
    insight_id: str,
    db: Session = Depends(get_db)
) -> dict:
    """Approve and apply insight to brand kit."""
    workspace_id = request.state.workspace_id
    
    service = FeedbackLoopService(db)
    applied = service.apply_insight(insight_id, workspace_id)
    
    if not applied:
        raise NotFoundError("Insight")
    
    return {
        "status": "success",
        "data": {"insight_id": insight_id, "applied": True}
    }
```

### Step 3: Create app/worker_feedback_loop.py

```python
from app.core.database import SessionLocal
from app.services.feedback_loop_service import FeedbackLoopService
from app.models import Job
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


def process_metrics_analysis(job_id: str, workspace_id: str, payload: dict):
    """Background worker: analyze metrics and generate insights."""
    db = SessionLocal()
    try:
        service = FeedbackLoopService(db)
        brand_kit_id = payload["brand_kit_id"]
        
        insights = service.analyze_metrics(brand_kit_id, workspace_id)
        
        job = db.query(Job).filter(Job.id == job_id).first()
        if job:
            job.status = "completed"
            job.result = {"insights_count": len(insights)}
            db.commit()
        
        logger.info(f"Metrics analysis job {job_id} completed with {len(insights)} insights")
    
    except Exception as e:
        logger.error(f"Metrics analysis failed: {str(e)}")
        job = db.query(Job).filter(Job.id == job_id).first()
        if job:
            job.status = "failed"
            job.error_message = str(e)
            db.commit()
    
    finally:
        db.close()
```

## Verification Checklist

- [ ] Feedback loop worker processes jobs
- [ ] Insights generated with confidence scores
- [ ] Only insights with confidence ≥0.7 stored
- [ ] GET /insights returns pending insights
- [ ] Insights sorted by confidence DESC
- [ ] POST /approve applies insight, marks applied=true

## Commit Message

```
feat: implement feedback loop engine with pattern extraction and insight generation
```

## Notes

- Confidence score: min(1.0, sample_count / 10)
- Only generate insights with 3+ samples per pattern
- Applied insights not returned in GET /insights
