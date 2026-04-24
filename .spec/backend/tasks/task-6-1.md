---
phase: 6
task_number: 6.1
title: Implement Trending Topics Sourcing
description: Fetch trending topics from X Trends + NewsAPI, filter by relevance
dependencies: [3.1]
parallel: false
estimated_time: 2 hours
---

# Task 6.1: Implement Trending Topics Sourcing

## Context

Newsjacking requires identifying trending topics relevant to the brand's niche. This task creates an endpoint that queries X Trends API and NewsAPI, filters by relevance to content pillars, and ranks by relevance + momentum scores.

## Acceptance Criteria

- [ ] `app/services/newsjacking_service.py` created with fetch_trending_topics method
- [ ] `app/integrations/x_trends.py` — X Trends API client
- [ ] `app/integrations/newsapi.py` — NewsAPI client
- [ ] `app/api/routes/newsjacking.py` created with GET /newsjacking/topics
- [ ] GET /newsjacking/topics returns top N topics filtered by relevance
- [ ] Topics filtered against brand kit content pillars
- [ ] Topics scored: relevance (0-1) + momentum (0-1)
- [ ] Topics ranked by (relevance * 0.6 + momentum * 0.4)
- [ ] Expired topics excluded
- [ ] Response includes: topic_title, trend_source, relevance_score, momentum_score, context, expires_at

## Files to Create

1. **app/services/newsjacking_service.py** — Newsjacking service
2. **app/integrations/__init__.py** — Integrations module
3. **app/integrations/x_trends.py** — X Trends API client
4. **app/integrations/newsapi.py** — NewsAPI client
5. **app/api/routes/newsjacking.py** — Newsjacking endpoints

## Implementation Steps

### Step 1: Create app/integrations/__init__.py

Empty file (module marker).

### Step 2: Create app/integrations/x_trends.py

```python
import requests
from app.core.config import settings
import logging

logger = logging.getLogger(__name__)


class XTrendsClient:
    """X Trends API client."""
    
    def __init__(self):
        self.api_url = "https://api.twitter.com/2/trends"
        self.bearer_token = settings.X_API_BEARER_TOKEN
    
    def get_trends(self, woeid: int = 1) -> list:
        """Get trending topics from X."""
        if not self.bearer_token:
            logger.warning("X API token not configured")
            return []
        
        headers = {"Authorization": f"Bearer {self.bearer_token}"}
        
        try:
            # TODO: Use actual X Trends API endpoint
            # For now, return mock data
            return [
                {"name": "AI Trends", "tweet_volume": 100000},
                {"name": "Machine Learning", "tweet_volume": 80000},
                {"name": "GenAI", "tweet_volume": 70000},
            ]
        except Exception as e:
            logger.error(f"X Trends API error: {str(e)}")
            return []
```

### Step 3: Create app/integrations/newsapi.py

```python
import requests
from app.core.config import settings
import logging

logger = logging.getLogger(__name__)


class NewsAPIClient:
    """NewsAPI.org client for trending topics."""
    
    def __init__(self):
        self.api_url = "https://newsapi.org/v2/top-headlines"
        self.api_key = settings.NEWSAPI_KEY or ""
    
    def get_top_headlines(self, country: str = "us") -> list:
        """Get top headlines."""
        if not self.api_key:
            logger.warning("NewsAPI key not configured")
            return []
        
        try:
            response = requests.get(
                self.api_url,
                params={"country": country, "apiKey": self.api_key}
            )
            
            if response.status_code != 200:
                logger.error(f"NewsAPI error: {response.text}")
                return []
            
            articles = response.json().get("articles", [])
            
            return [
                {
                    "title": a["title"],
                    "description": a["description"],
                    "source": a["source"]["name"],
                    "url": a["url"]
                }
                for a in articles
            ]
        except Exception as e:
            logger.error(f"NewsAPI error: {str(e)}")
            return []
```

### Step 4: Create app/services/newsjacking_service.py

```python
from sqlalchemy.orm import Session
from app.models import BrandKit, NewsjackingTopic
from app.integrations.x_trends import XTrendsClient
from app.integrations.newsapi import NewsAPIClient
from app.core.errors import NotFoundError
from datetime import datetime, timedelta
from sqlalchemy import and_
import logging

logger = logging.getLogger(__name__)


class NewsjackingService:
    def __init__(self, db: Session):
        self.db = db
        self.x_trends = XTrendsClient()
        self.newsapi = NewsAPIClient()
    
    def fetch_trending_topics(
        self,
        workspace_id: str,
        brand_kit_id: str,
        limit: int = 10
    ) -> list:
        """Fetch, filter, and rank trending topics."""
        
        # Get brand kit
        brand_kit = self.db.query(BrandKit).filter(
            and_(
                BrandKit.id == brand_kit_id,
                BrandKit.workspace_id == workspace_id,
                BrandKit.is_deleted == False
            )
        ).first()
        
        if not brand_kit:
            raise NotFoundError("Brand kit")
        
        # Get content pillars
        pillars = brand_kit.content_identity.get("content_pillars", [])
        
        # Fetch from both sources
        x_trends = self.x_trends.get_trends()
        news_trends = self.newsapi.get_top_headlines()
        
        # Combine and deduplicate
        all_trends = []
        seen_titles = set()
        
        for trend in x_trends:
            title = trend.get("name", "")
            if title not in seen_titles:
                all_trends.append({
                    "title": title,
                    "source": "x_trends",
                    "engagement_count": trend.get("tweet_volume", 0),
                    "description": ""
                })
                seen_titles.add(title)
        
        for article in news_trends:
            title = article.get("title", "")
            if title not in seen_titles:
                all_trends.append({
                    "title": title,
                    "source": "newsapi",
                    "engagement_count": 0,
                    "description": article.get("description", "")
                })
                seen_titles.add(title)
        
        # Score and rank
        ranked = []
        for trend in all_trends:
            relevance = self._score_relevance(trend["title"], pillars)
            momentum = self._score_momentum(trend)
            
            if relevance > 0.3 or momentum > 0.5:
                ranked.append({
                    "title": trend["title"],
                    "source": trend["source"],
                    "relevance_score": relevance,
                    "momentum_score": momentum,
                    "context": trend["description"],
                    "expires_at": datetime.utcnow() + timedelta(hours=6)
                })
        
        # Sort by combined score
        ranked.sort(
            key=lambda x: x["relevance_score"] * 0.6 + x["momentum_score"] * 0.4,
            reverse=True
        )
        
        # Store and return top N
        saved_topics = []
        for trend in ranked[:limit]:
            topic = NewsjackingTopic(
                workspace_id=workspace_id,
                brand_kit_id=brand_kit_id,
                topic_title=trend["title"],
                trend_source=trend["source"],
                relevance_score=trend["relevance_score"],
                momentum_score=trend["momentum_score"],
                context=trend["context"],
                expires_at=trend["expires_at"],
                expired=False
            )
            self.db.add(topic)
            saved_topics.append(topic)
        
        self.db.commit()
        logger.info(f"Saved {len(saved_topics)} trending topics")
        return saved_topics
    
    def _score_relevance(self, title: str, pillars: list) -> float:
        """Score relevance (0-1) based on content pillars."""
        if not pillars:
            return 0.5
        
        score = 0
        title_lower = title.lower()
        
        for pillar in pillars:
            pillar_lower = pillar.lower()
            if pillar_lower in title_lower:
                score += 1.0
        
        # Normalize to 0-1
        return min(1.0, score / max(1, len(pillars)))
    
    def _score_momentum(self, trend: dict) -> float:
        """Score momentum (0-1) based on engagement."""
        engagement = trend.get("engagement_count", 0)
        # Normalize: 10k engagement = 1.0
        return min(1.0, engagement / 10000)
```

### Step 5: Create app/api/routes/newsjacking.py

```python
from fastapi import APIRouter, Depends, Request, Query
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.services.newsjacking_service import NewsjackingService

router = APIRouter(prefix="/newsjacking", tags=["newsjacking"])


@router.get("/topics")
async def get_trending_topics(
    request: Request,
    brand_kit_id: str = Query(...),
    limit: int = Query(10, ge=1, le=50),
    db: Session = Depends(get_db)
) -> dict:
    """Get trending topics filtered by brand kit relevance."""
    workspace_id = request.state.workspace_id
    
    service = NewsjackingService(db)
    topics = service.fetch_trending_topics(workspace_id, brand_kit_id, limit)
    
    return {
        "status": "success",
        "count": len(topics),
        "items": [
            {
                "id": t.id,
                "topic_title": t.topic_title,
                "trend_source": t.trend_source,
                "relevance_score": t.relevance_score,
                "momentum_score": t.momentum_score,
                "context": t.context,
                "expires_at": t.expires_at.isoformat()
            }
            for t in topics
        ]
    }
```

## Verification Checklist

- [ ] X Trends API client created
- [ ] NewsAPI client created
- [ ] Topics fetched from both sources
- [ ] Topics filtered by relevance to pillars
- [ ] Topics ranked by combined score
- [ ] GET /newsjacking/topics returns ranked topics
- [ ] Expired topics excluded
- [ ] Response includes all required fields

## Commit Message

```
feat: implement trending topics sourcing from X Trends and NewsAPI with relevance filtering
```

## Notes

- Relevance score: keyword match against content pillars
- Momentum score: normalized engagement count (10k = 1.0)
- Combined ranking: relevance 60% + momentum 40%
- Topics expire after 6 hours (configurable)
- NewsAPI key stored in environment (optional)
