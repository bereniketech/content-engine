---
phase: 3
task_number: 3.2
title: Implement Claude API Integration
description: Create background worker task to call Claude API with platform-specific prompts
dependencies: [3.1, 2.1]
parallel: false
estimated_time: 4 hours
---

# Task 3.2: Implement Claude API Integration

## Context

This task implements the background worker that processes content generation jobs. When CloudMQ delivers a job to the "content_generation" queue, this worker: (1) loads the brand kit, (2) constructs platform-specific prompts (LinkedIn, X, Instagram, Reddit, Email), (3) calls Claude API, (4) stores generated content, (5) updates job status.

## Acceptance Criteria

- [ ] `app/worker.py` created as background worker entry point
- [ ] `app/services/claude_service.py` created with Claude API wrapper
- [ ] `app/services/prompt_builder.py` created with platform-specific prompt builders
- [ ] Background worker registered with CloudMQ client
- [ ] Worker receives job from CloudMQ, calls Claude API, stores GeneratedContent + GeneratedPost records
- [ ] Job status updated to "processing" during generation
- [ ] Job status updated to "completed" with result on success
- [ ] Job status updated to "failed" with error_message on error
- [ ] Retry logic: up to 3 retries with exponential backoff
- [ ] Generated content stored with correct platform variants
- [ ] LinkedIn prompt: 50-word hook, first-person, save-optimization
- [ ] X prompt: thread format (1/N), ≤280 chars per tweet
- [ ] Instagram prompt: 7-slide carousel structure
- [ ] Reddit prompt: community-respectful tone
- [ ] Email prompt: educational voice, subject line

## Files to Create

1. **app/worker.py** — Background worker entry point
2. **app/services/claude_service.py** — Claude API wrapper
3. **app/services/prompt_builder.py** — Platform-specific prompt builders

## Implementation Steps

### Step 1: Create app/services/claude_service.py

```python
from anthropic import Anthropic
from app.core.config import settings
import logging

logger = logging.getLogger(__name__)


class ClaudeService:
    """Claude API integration for content generation."""
    
    def __init__(self):
        self.client = Anthropic(api_key=settings.ANTHROPIC_API_KEY)
        self.model = "claude-3-5-sonnet-20241022"
    
    def generate_content(self, prompt: str, max_tokens: int = 1024) -> str:
        """Call Claude API to generate content."""
        try:
            message = self.client.messages.create(
                model=self.model,
                max_tokens=max_tokens,
                messages=[
                    {"role": "user", "content": prompt}
                ]
            )
            return message.content[0].text
        except Exception as e:
            logger.error(f"Claude API error: {str(e)}")
            raise
```

### Step 2: Create app/services/prompt_builder.py

```python
from typing import Dict, Any


class PromptBuilder:
    """Platform-specific prompt builders."""
    
    @staticmethod
    def build_linkedin_prompt(topic: str, brand_kit: Dict[str, Any]) -> str:
        """LinkedIn: 50-word hook, first-person, save-optimization."""
        tone = ", ".join(brand_kit.get("content_identity", {}).get("tone_descriptors", ["professional"]))
        voice = brand_kit.get("content_identity", {}).get("voice_descriptor", "authoritative")
        
        return f"""Generate a LinkedIn post about '{topic}' following these rules:
- Write a compelling 50-word hook in first person
- Focus on save-optimization (frameworks, checklists, processes)
- Tone: {tone}
- Voice: {voice}
- Include a call-to-action

Generate only the hook and CTA, no hashtags or extra formatting."""
    
    @staticmethod
    def build_x_prompt(topic: str, brand_kit: Dict[str, Any]) -> str:
        """X: Thread format (1/N), ≤280 chars per tweet, real-time voice."""
        voice = brand_kit.get("content_identity", {}).get("voice_descriptor", "conversational")
        
        return f"""Generate an X thread about '{topic}' with these rules:
- Format as numbered tweets (1/3, 2/3, 3/3) — 3 tweets recommended
- Each tweet ≤280 characters INCLUDING the number
- Use real-time, {voice} voice
- First tweet must hook the reader
- Last tweet includes call-to-action
- No hashtags except if natural

Generate only the tweets, one per line."""
    
    @staticmethod
    def build_instagram_prompt(topic: str, brand_kit: Dict[str, Any]) -> str:
        """Instagram: 7-slide carousel, hook ≤12 words, one insight per slide."""
        tone = ", ".join(brand_kit.get("content_identity", {}).get("tone_descriptors", ["engaging"]))
        
        return f"""Generate Instagram carousel content about '{topic}' as JSON:
{{
  "slides": [
    {{"slide": 1, "hook": "HOOK TEXT ≤12 words", "body": ""}},
    {{"slide": 2, "hook": "", "body": "First key insight..."}},
    {{"slide": 3, "hook": "", "body": "Second key insight..."}},
    {{"slide": 4, "hook": "", "body": "Third key insight..."}},
    {{"slide": 5, "hook": "", "body": "Fourth key insight..."}},
    {{"slide": 6, "hook": "", "body": "Fifth key insight..."}},
    {{"slide": 7, "hook": "", "body": "Call-to-action"}}
  ]
}}

Tone: {tone}
Generate only valid JSON, no markdown."""
    
    @staticmethod
    def build_reddit_prompt(topic: str, brand_kit: Dict[str, Any]) -> str:
        """Reddit: community-respectful tone, avoid sales language."""
        return f"""Generate Reddit post content about '{topic}' with these rules:
- Assume target subreddit is r/{topic.lower().replace(' ', '')}
- Community-respectful tone (informative, not salesy)
- Avoid promotional language
- Cite sources if making claims
- Include genuine questions to engage community
- 300-500 words

Generate only the post content, no subject line."""
    
    @staticmethod
    def build_email_prompt(topic: str, brand_kit: Dict[str, Any]) -> str:
        """Email: educational voice, compelling subject, optional segmentation hint."""
        return f"""Generate email marketing content about '{topic}' with these rules:
Generate JSON:
{{
  "subject": "Subject line (under 50 chars)",
  "preview": "Preview text (under 80 chars)",
  "body": "Email body (200-300 words, educational tone, not salesy)"
}}

Voice: educational and helpful
Include one clear call-to-action

Generate only valid JSON."""
    
    @staticmethod
    def build_newsjacking_prompt(topic: str, brand_kit: Dict[str, Any]) -> str:
        """Newsjacking: contextualize trend, answer 'so what?', urgency."""
        voice = brand_kit.get("content_identity", {}).get("voice_descriptor", "expert")
        pillars = brand_kit.get("content_identity", {}).get("content_pillars", [])
        
        return f"""Generate content about trending topic '{topic}' with these rules:
- DON'T summarize the news, contextualize it
- Answer 'So what?' — why should people care?
- Connect to your expertise: {", ".join(pillars)}
- Create urgency: 'Post within 24-48 hours for maximum impact'
- Voice: {voice}
- 150-200 words

Generate only the content, no extra formatting."""


def get_prompt_builder() -> type:
    return PromptBuilder
```

### Step 3: Create app/worker.py

```python
from app.core.cloudmq import cloudmq_client
from app.core.database import SessionLocal
from app.services.claude_service import ClaudeService
from app.services.prompt_builder import PromptBuilder
from app.services.job_service import JobService
from app.models import BrandKit, GeneratedContent, GeneratedPost
from sqlalchemy import and_
import logging
import time

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


def process_content_generation(job_id: str, workspace_id: str, payload: dict):
    """Background worker: generate content via Claude API."""
    db = SessionLocal()
    try:
        job_service = JobService(db)
        claude_service = ClaudeService()
        prompt_builder = PromptBuilder()
        
        # Get job and update status
        job = db.query(Job).filter(Job.id == job_id).first()
        if not job:
            logger.error(f"Job {job_id} not found")
            return
        
        job.status = "processing"
        db.commit()
        
        logger.info(f"Processing content generation job {job_id}")
        
        # Load brand kit
        topic = payload["topic"]
        brand_kit_id = payload["brand_kit_id"]
        source_type = payload.get("source_type", "standard")
        
        kit = db.query(BrandKit).filter(
            and_(
                BrandKit.id == brand_kit_id,
                BrandKit.workspace_id == workspace_id,
                BrandKit.is_deleted == False
            )
        ).first()
        
        if not kit:
            raise Exception(f"Brand kit {brand_kit_id} not found")
        
        # Generate content for all platforms
        platforms = ["linkedin", "x", "instagram", "reddit", "email"]
        generated_posts = {}
        
        for platform in platforms:
            try:
                if platform == "linkedin":
                    prompt = prompt_builder.build_linkedin_prompt(topic, kit.__dict__)
                elif platform == "x":
                    prompt = prompt_builder.build_x_prompt(topic, kit.__dict__)
                elif platform == "instagram":
                    prompt = prompt_builder.build_instagram_prompt(topic, kit.__dict__)
                elif platform == "reddit":
                    prompt = prompt_builder.build_reddit_prompt(topic, kit.__dict__)
                elif platform == "email":
                    prompt = prompt_builder.build_email_prompt(topic, kit.__dict__)
                
                content = claude_service.generate_content(prompt)
                generated_posts[platform] = content
                logger.info(f"Generated content for {platform}")
            
            except Exception as e:
                logger.error(f"Failed to generate {platform} content: {str(e)}")
                generated_posts[platform] = f"Error: {str(e)}"
        
        # Store generated content
        generated_content = GeneratedContent(
            workspace_id=workspace_id,
            brand_kit_id=brand_kit_id,
            topic=topic,
            source_type=source_type,
            content_data={"posts": generated_posts}
        )
        db.add(generated_content)
        db.commit()
        
        # Create generated_posts records
        for platform, content in generated_posts.items():
            post = GeneratedPost(
                workspace_id=workspace_id,
                generated_content_id=generated_content.id,
                platform=platform,
                content=content
            )
            db.add(post)
        
        db.commit()
        
        # Update job
        job.status = "completed"
        job.result = {"generated_content_id": str(generated_content.id)}
        db.commit()
        
        logger.info(f"Content generation job {job_id} completed successfully")
    
    except Exception as e:
        logger.error(f"Content generation job {job_id} failed: {str(e)}")
        job = db.query(Job).filter(Job.id == job_id).first()
        if job:
            job.status = "failed"
            job.error_message = str(e)
            job.retry_count = (job.retry_count or 0) + 1
            
            # Retry logic: up to 3 retries with exponential backoff
            if job.retry_count < 3:
                logger.info(f"Retrying job {job_id}, attempt {job.retry_count}")
                delay = 2 ** job.retry_count  # 2, 4, 8 seconds
                cloudmq_client.queue("content_generation", payload, delay=delay)
            
            db.commit()
    
    finally:
        db.close()


if __name__ == "__main__":
    logger.info("Starting content generation worker...")
    # TODO: Implement actual CloudMQ listener
    # For now, just start the worker
    # cloudmq_client.start_listening("content_generation", process_content_generation)
