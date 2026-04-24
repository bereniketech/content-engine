---
phase: 4
task_number: 4.2
title: Implement Platform API Integrations
description: Implement posting to X, LinkedIn, Instagram, Reddit, and Email services
dependencies: [4.1]
parallel: true
estimated_time: 6 hours
---

# Task 4.2: Implement Platform API Integrations

## Context

This task implements the background worker that posts to all 5 platforms. When CloudMQ delivers a distribution job, the worker posts to each platform, records post_id and status, and handles partial failures gracefully.

## Acceptance Criteria

- [ ] `app/services/x_service.py` — Post to X/Twitter API v2
- [ ] `app/services/linkedin_service.py` — Post to LinkedIn API
- [ ] `app/services/instagram_service.py` — Post to Instagram Business API
- [ ] `app/services/reddit_service.py` — Post to Reddit API
- [ ] `app/services/email_service.py` — Create email campaign
- [ ] Background worker processes distribution jobs from CloudMQ
- [ ] Successfully posted to platform: status="posted", store post_id, posted_at
- [ ] Platform API failure: status="failed", log error, continue to next platform
- [ ] Partial success returned (e.g., X posted, LinkedIn failed)
- [ ] Job marked completed with per-platform results
- [ ] No retry on platform API failure (log only)
- [ ] Graceful degradation if API keys missing

## Files to Create

1. **app/services/x_service.py** — X API client
2. **app/services/linkedin_service.py** — LinkedIn API client
3. **app/services/instagram_service.py** — Instagram API client
4. **app/services/reddit_service.py** — Reddit API client
5. **app/services/email_service.py** — Email client
6. **app/worker_distribution.py** — Distribution background worker

## Implementation Steps

### Step 1-5: Create Platform Service Modules

```python
# app/services/x_service.py
import requests
from app.core.config import settings
import logging

logger = logging.getLogger(__name__)

class XService:
    def __init__(self):
        self.bearer_token = settings.X_API_BEARER_TOKEN
        self.api_url = "https://api.twitter.com/2/tweets"
    
    def post(self, content: str) -> dict:
        """Post to X/Twitter."""
        if not self.bearer_token:
            raise Exception("X API token not configured")
        
        headers = {
            "Authorization": f"Bearer {self.bearer_token}",
            "Content-Type": "application/json"
        }
        
        # Handle thread (multiple tweets)
        tweets = content.split("\n")
        last_id = None
        
        for tweet_text in tweets:
            if not tweet_text.strip():
                continue
            
            payload = {"text": tweet_text.strip()}
            if last_id:
                payload["reply"] = {"in_reply_to_tweet_id": last_id}
            
            response = requests.post(self.api_url, json=payload, headers=headers)
            
            if response.status_code != 201:
                raise Exception(f"X API error: {response.text}")
            
            last_id = response.json()["data"]["id"]
        
        return {"post_id": last_id}


# app/services/linkedin_service.py
import requests
from app.core.config import settings
import logging

logger = logging.getLogger(__name__)

class LinkedInService:
    def __init__(self):
        self.api_token = settings.LINKEDIN_API_TOKEN
        self.api_url = "https://api.linkedin.com/v2/ugcPosts"
    
    def post(self, content: str) -> dict:
        """Post to LinkedIn."""
        if not self.api_token:
            raise Exception("LinkedIn API token not configured")
        
        headers = {
            "Authorization": f"Bearer {self.api_token}",
            "Content-Type": "application/json"
        }
        
        payload = {
            "author": "urn:li:person:{person_id}",
            "lifecycleState": "PUBLISHED",
            "specificContent": {
                "com.linkedin.ugc.UGCPost": {
                    "content": {
                        "com.linkedin.ugc.ShareContent": {
                            "shareCommentary": {"text": content}
                        }
                    }
                }
            }
        }
        
        response = requests.post(self.api_url, json=payload, headers=headers)
        
        if response.status_code not in [200, 201]:
            raise Exception(f"LinkedIn API error: {response.text}")
        
        post_id = response.headers.get("X-RestLi-Id")
        return {"post_id": post_id}


# app/services/instagram_service.py
import requests
from app.core.config import settings
import logging

logger = logging.getLogger(__name__)

class InstagramService:
    def __init__(self):
        self.account_id = settings.INSTAGRAM_BUSINESS_ACCOUNT_ID
        self.api_url = f"https://graph.instagram.com/{self.account_id}/media"
    
    def post(self, carousel_content: str) -> dict:
        """Post carousel to Instagram."""
        if not self.account_id:
            raise Exception("Instagram Business Account ID not configured")
        
        # Parse carousel JSON from content
        import json
        carousel = json.loads(carousel_content)
        
        # Create carousel container
        payload = {
            "media_type": "CAROUSEL",
            "children": carousel.get("media_ids", [])
        }
        
        response = requests.post(self.api_url, data=payload)
        
        if response.status_code not in [200, 201]:
            raise Exception(f"Instagram API error: {response.text}")
        
        return {"post_id": response.json()["id"]}


# app/services/reddit_service.py
import praw
from app.core.config import settings
import logging

logger = logging.getLogger(__name__)

class RedditService:
    def __init__(self):
        self.reddit = praw.Reddit(
            client_id=settings.REDDIT_CLIENT_ID,
            client_secret=settings.REDDIT_CLIENT_SECRET,
            user_agent="ContentEngine/1.0"
        )
    
    def post(self, content: str, subreddit: str = "test") -> dict:
        """Post to Reddit."""
        if not settings.REDDIT_CLIENT_ID:
            raise Exception("Reddit credentials not configured")
        
        sub = self.reddit.subreddit(subreddit)
        submission = sub.submit(title="New Post", selftext=content)
        
        return {"post_id": submission.id, "url": submission.url}


# app/services/email_service.py
import requests
from app.core.config import settings
import logging

logger = logging.getLogger(__name__)

class EmailService:
    def __init__(self):
        self.mailchimp_key = settings.MAILCHIMP_API_KEY
        self.sendgrid_key = settings.SENDGRID_API_KEY
    
    def send_campaign(self, email_content: str) -> dict:
        """Create email campaign."""
        import json
        
        email = json.loads(email_content)
        
        if self.mailchimp_key:
            return self._send_mailchimp(email)
        elif self.sendgrid_key:
            return self._send_sendgrid(email)
        else:
            raise Exception("Email service not configured")
    
    def _send_mailchimp(self, email: dict) -> dict:
        """Send via Mailchimp."""
        # TODO: Implement Mailchimp API call
        return {"campaign_id": "mailchimp-campaign-123"}
    
    def _send_sendgrid(self, email: dict) -> dict:
        """Send via SendGrid."""
        # TODO: Implement SendGrid API call
        return {"message_id": "sendgrid-msg-123"}
```

### Step 6: Create Distribution Worker

```python
# app/worker_distribution.py
from app.core.database import SessionLocal
from app.services.x_service import XService
from app.services.linkedin_service import LinkedInService
from app.services.instagram_service import InstagramService
from app.services.reddit_service import RedditService
from app.services.email_service import EmailService
from app.services.job_service import JobService
from app.models import GeneratedPost
from sqlalchemy import and_
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


def process_distribution(job_id: str, workspace_id: str, payload: dict):
    """Background worker: post to platforms."""
    db = SessionLocal()
    try:
        job_service = JobService(db)
        
        # Get job
        job = db.query(Job).filter(Job.id == job_id).first()
        if not job:
            logger.error(f"Job {job_id} not found")
            return
        
        job.status = "processing"
        db.commit()
        
        logger.info(f"Processing distribution job {job_id}")
        
        content_id = payload["content_id"]
        platforms = payload.get("platforms", ["x", "linkedin", "instagram", "reddit", "email"])
        
        # Get generated posts
        posts = db.query(GeneratedPost).filter(
            GeneratedPost.generated_content_id == content_id
        ).all()
        
        results = {}
        
        for platform in platforms:
            try:
                post = next((p for p in posts if p.platform == platform), None)
                if not post:
                    results[platform] = {"status": "skipped", "reason": "No content"}
                    continue
                
                if platform == "x":
                    result = XService().post(post.content)
                elif platform == "linkedin":
                    result = LinkedInService().post(post.content)
                elif platform == "instagram":
                    result = InstagramService().post(post.content)
                elif platform == "reddit":
                    result = RedditService().post(post.content)
                elif platform == "email":
                    result = EmailService().send_campaign(post.content)
                
                # Store success
                post.platform_post_id = result.get("post_id")
                post.posted_at = datetime.utcnow()
                results[platform] = {"status": "posted", "post_id": result.get("post_id")}
                logger.info(f"Posted to {platform}: {result.get('post_id')}")
            
            except Exception as e:
                logger.error(f"Failed to post to {platform}: {str(e)}")
                results[platform] = {"status": "failed", "error": str(e)}
        
        db.commit()
        
        # Update job
        job.status = "completed"
        job.result = results
        db.commit()
        
        logger.info(f"Distribution job {job_id} completed")
    
    except Exception as e:
        logger.error(f"Distribution job {job_id} failed: {str(e)}")
        job = db.query(Job).filter(Job.id == job_id).first()
        if job:
            job.status = "failed"
            job.error_message = str(e)
            db.commit()
    
    finally:
        db.close()
```

## Verification Checklist

- [ ] All platform service modules created
- [ ] Each service has post() method
- [ ] Distribution worker processes jobs from CloudMQ
- [ ] Successful posts: status="posted", post_id stored
- [ ] Failed posts: status="failed", error logged, continue to next
- [ ] Partial success returned (per-platform results)
- [ ] No infinite retry (log once and move on)
- [ ] Posted_at timestamp set on success

## Commit Message

```
feat: implement multi-platform content distribution with partial failure handling
```

## Notes

- Each platform service should validate API credentials before posting
- Partial success (e.g., X posted, LinkedIn failed) is expected behavior
- No retry on platform API failure — log and move to next platform
- Post IDs stored for analytics and deletion later if needed
