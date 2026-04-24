---
phase: 6
task_number: 6.2
title: Implement Newsjacking Content Generation
description: Generate content for trending topics with newsjacking-specific prompts
dependencies: [6.1, 3.1]
parallel: false
estimated_time: 2 hours
---

# Task 6.2: Implement Newsjacking Content Generation

## Context

Newsjacking requires faster content generation with different prompt strategies (contextualize the trend, answer "so what?", create urgency). This task extends the content generation service with newsjacking-specific prompts and job queuing.

## Acceptance Criteria

- [ ] `app/schemas/newsjacking.py` created with request/response models
- [ ] `app/services/newsjacking_service.py` extended with queue_generation method
- [ ] `app/api/routes/newsjacking.py` extended with POST /newsjacking/generate endpoint
- [ ] POST /newsjacking/generate queues job, returns 202 Accepted with job_id
- [ ] Newsjacking prompts emphasize contextualization (not summarization)
- [ ] Content tagged with source_type="newsjacking"
- [ ] Newsjacking topic_id stored in generated_content
- [ ] Response includes "Post within 24-48 hours" guidance
- [ ] Background worker uses newsjacking prompt builder
- [ ] Same workflow as standard generation (queue → poll → complete)

## Files to Create

1. **app/schemas/newsjacking.py** — Request/response models

## Files to Modify

1. **app/services/newsjacking_service.py** — Add queue_generation method
2. **app/services/prompt_builder.py** — Add newsjacking prompt builders
3. **app/api/routes/newsjacking.py** — Add POST /newsjacking/generate endpoint

## Implementation Steps

### Step 1: Create app/schemas/newsjacking.py

```python
from pydantic import BaseModel, Field


class GenerateNewsjackingRequest(BaseModel):
    """Generate newsjacking content request."""
    topic_id: str
    brand_kit_id: str
```

### Step 2: Extend app/services/newsjacking_service.py

Add to NewsjackingService class:

```python
def queue_generation(
    self,
    workspace_id: str,
    topic_id: str,
    brand_kit_id: str
) -> dict:
    """Queue newsjacking content generation job."""
    
    from app.services.job_service import JobService
    from app.core.cloudmq import cloudmq_client
    
    # Validate topic exists
    topic = self.db.query(NewsjackingTopic).filter(
        and_(
            NewsjackingTopic.id == topic_id,
            NewsjackingTopic.workspace_id == workspace_id
        )
    ).first()
    
    if not topic:
        raise NotFoundError("Newsjacking topic")
    
    # Create job
    job_service = JobService(self.db)
    payload = {
        "topic_id": topic_id,
        "topic_title": topic.topic_title,
        "brand_kit_id": brand_kit_id,
        "source_type": "newsjacking"
    }
    
    job = job_service.create_job(workspace_id, "content_generation_newsjacking", payload)
    
    # Queue to CloudMQ
    cloudmq_job = cloudmq_client.queue(
        "content_generation",
        {**payload, "job_id": job.id},
        metadata={"workspace_id": workspace_id, "source_type": "newsjacking"}
    )
    
    job.cloudmq_job_id = cloudmq_job["id"]
    self.db.commit()
    
    logger.info(f"Queued newsjacking generation job {job.id} for topic {topic.topic_title}")
    
    return {
        "job_id": job.id,
        "status": job.status,
        "guidance": "Post within 24-48 hours for maximum impact on trending topics"
    }
```

### Step 3: Extend app/services/prompt_builder.py

Add to PromptBuilder class:

```python
@staticmethod
def build_newsjacking_linkedin_prompt(topic_title: str, context: str, brand_kit: Dict[str, Any]) -> str:
    """LinkedIn newsjacking: connect trend to expertise."""
    tone = ", ".join(brand_kit.get("content_identity", {}).get("tone_descriptors", ["expert"]))
    
    return f"""Generate LinkedIn content about trending topic '{topic_title}'.

CONTEXT: {context}

CRITICAL RULES:
- DON'T summarize the trend
- Answer 'So what?' — why does this matter to your audience?
- Connect to your expertise and brand pillars
- Create urgency: 'Post within 24-48 hours'
- 50-word hook, first-person, save-optimization focus
- Tone: {tone}

Generate only the hook, no hashtags."""


@staticmethod
def build_newsjacking_x_prompt(topic_title: str, context: str, brand_kit: Dict[str, Any]) -> str:
    """X newsjacking: real-time thread with contextualization."""
    
    return f"""Generate X thread about trending topic '{topic_title}'.

CONTEXT: {context}

CRITICAL RULES:
- DON'T summarize news, contextualize it
- Answer 'So what?' in real-time voice
- Format: 3 tweets (1/3, 2/3, 3/3)
- Each tweet ≤280 chars INCLUDING number
- Real-time, conversational tone
- Last tweet: 'Post within 24-48 hours'

Generate only the tweets, one per line."""


@staticmethod
def build_newsjacking_instagram_prompt(topic_title: str, context: str, brand_kit: Dict[str, Any]) -> str:
    """Instagram newsjacking: carousel connecting trend to insights."""
    
    return f"""Generate Instagram carousel about trending topic '{topic_title}'.

CONTEXT: {context}

Generate JSON:
{{
  "slides": [
    {{"slide": 1, "hook": "HOOK ≤12 words connecting trend", "body": ""}},
    {{"slide": 2, "hook": "", "body": "How this trend affects your audience..."}},
    {{"slide": 3, "hook": "", "body": "Your expert take on the trend..."}},
    {{"slide": 4, "hook": "", "body": "Actionable insight from trend..."}},
    {{"slide": 5, "hook": "", "body": "Another key insight..."}},
    {{"slide": 6, "hook": "", "body": "How to act on this trend..."}},
    {{"slide": 7, "hook": "", "body": "Call-to-action + deadline"}}
  ]
}}

Generate only valid JSON."""


@staticmethod
def build_newsjacking_reddit_prompt(topic_title: str, context: str, brand_kit: Dict[str, Any]) -> str:
    """Reddit newsjacking: community-respectful perspective."""
    
    return f"""Generate Reddit post about trending topic '{topic_title}'.

CONTEXT: {context}

CRITICAL RULES:
- Community-respectful tone (helpful, not salesy)
- DON'T summarize the news
- Share expert perspective on trend
- Answer 'What does this mean for us?'
- Cite sources
- 300-500 words
- Post within 24-48 hours

Generate only the post content."""


@staticmethod
def build_newsjacking_email_prompt(topic_title: str, context: str, brand_kit: Dict[str, Any]) -> str:
    """Email newsjacking: timely educational content."""
    
    return f"""Generate email about trending topic '{topic_title}'.

CONTEXT: {context}

Generate JSON:
{{
  "subject": "How {topic_title} affects you (urgent angle)",
  "preview": "Your expert take on this trend",
  "body": "200-300 words. Educational voice. Connect trend to audience benefit. Include CTA."
}}

Generate only valid JSON."""
```

### Step 4: Extend app/api/routes/newsjacking.py

Add endpoint:

```python
from app.schemas.newsjacking import GenerateNewsjackingRequest
from fastapi import status


@router.post("/generate", status_code=status.HTTP_202_ACCEPTED)
async def generate_newsjacking_content(
    request: Request,
    data: GenerateNewsjackingRequest,
    db: Session = Depends(get_db)
) -> dict:
    """Queue newsjacking content generation."""
    workspace_id = request.state.workspace_id
    
    service = NewsjackingService(db)
    result = service.queue_generation(workspace_id, data.topic_id, data.brand_kit_id)
    
    return {
        "status": "pending",
        "data": result
    }
```

### Step 5: Update Background Worker

Modify `app/worker.py` to use newsjacking prompts when source_type="newsjacking":

```python
# In process_content_generation function, update platform-specific generation:

if source_type == "newsjacking":
    # Use newsjacking-specific prompts
    topic_title = payload.get("topic_title", topic)
    context = payload.get("context", "")
    
    for platform in platforms:
        if platform == "linkedin":
            prompt = prompt_builder.build_newsjacking_linkedin_prompt(topic_title, context, kit.__dict__)
        elif platform == "x":
            prompt = prompt_builder.build_newsjacking_x_prompt(topic_title, context, kit.__dict__)
        # ... etc for other platforms
else:
    # Use standard prompts (existing code)
```

## Verification Checklist

- [ ] Schema models created
- [ ] queue_generation method added
- [ ] POST /newsjacking/generate returns 202 Accepted
- [ ] Job queued with source_type="newsjacking"
- [ ] Newsjacking prompts emphasize contextualization
- [ ] Topic_id stored in generated_content
- [ ] "Post within 24-48 hours" guidance included
- [ ] Background worker uses newsjacking prompts
- [ ] GET /jobs/{job_id} returns generated content

## Commit Message

```
feat: implement newsjacking content generation with contextualization-focused prompts
```

## Notes

- Newsjacking prompts emphasize "so what?" analysis, not summarization
- Shorter TTL on newsjacking content (6-24 hours vs. evergreen content)
- Same job infrastructure as standard generation (for consistency)
- "Post within 24-48 hours" is guidance, not enforced by API
