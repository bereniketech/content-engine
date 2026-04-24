# Brand Kit & Newsjacking System — Implementation Guide

**Date:** 2026-04-24  
**Status:** Design approved, ready for implementation phases  
**Owner:** Content Engine team  

---

## Executive Summary

This document outlines the **Brand Kit** (foundational brand profile system) and **Newsjacking Toolkit** (trending topic + cross-platform content generator). Both are core to the content engine's value proposition: clients define their brand once, and the engine uses that to generate platform-specific, on-brand content automatically.

The system includes a **continuous feedback loop** where performance metrics inform brand kit updates over time, creating a self-optimizing content strategy engine.

---

## Part 1: Brand Kit System

### Overview

The Brand Kit is a **living, version-controlled profile** of a client's brand stored in PostgreSQL. Every piece of generated content references the brand kit that was active at generation time. The kit evolves based on performance feedback.

### Schema Structure

```sql
-- Brand Kit metadata
CREATE TABLE brand_kits (
  id UUID PRIMARY KEY,
  workspace_id UUID NOT NULL REFERENCES workspaces(id),
  name VARCHAR(255) NOT NULL,
  version INT NOT NULL DEFAULT 1,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  approved_at TIMESTAMP, -- When client approved this version
  is_active BOOLEAN DEFAULT TRUE,
  UNIQUE(workspace_id, version)
);

-- Visual Identity
CREATE TABLE brand_visual_identity (
  id UUID PRIMARY KEY,
  brand_kit_id UUID NOT NULL REFERENCES brand_kits(id) ON DELETE CASCADE,
  color_palette JSONB NOT NULL, -- { "primary": "#000", "secondary": "#FFF", ... }
  typography JSONB NOT NULL, -- { "heading_font": "...", "body_font": "...", ... }
  logo_url TEXT,
  imagery_style VARCHAR(255), -- e.g., "minimalist", "vibrant", "documentary"
  spacing_system JSONB, -- Grid rules, padding, breakpoints
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Content Identity
CREATE TABLE brand_content_identity (
  id UUID PRIMARY KEY,
  brand_kit_id UUID NOT NULL REFERENCES brand_kits(id) ON DELETE CASCADE,
  positioning_statement TEXT NOT NULL,
  tone_descriptors JSONB NOT NULL, -- ["bold", "casual", "technical", ...]
  content_pillars TEXT[] NOT NULL, -- 3-5 core topics
  audience_icp JSONB NOT NULL, -- ICP definition + pain points
  key_messages TEXT[] NOT NULL, -- 5-7 core messages
  banned_words TEXT[], -- Never say these
  writing_rules JSONB, -- Sentence length, paragraph structure, emoji use, etc.
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Platform-Specific Overrides
CREATE TABLE brand_platform_overrides (
  id UUID PRIMARY KEY,
  brand_kit_id UUID NOT NULL REFERENCES brand_kits(id) ON DELETE CASCADE,
  platform VARCHAR(50) NOT NULL, -- linkedin, x, instagram, reddit, email
  voice_variation VARCHAR(255),
  content_rules JSONB NOT NULL, -- Platform-specific rules
  format_preferences JSONB, -- e.g., carousel vs. single image for Instagram
  posting_window VARCHAR(255), -- Best time to post
  frequency_targets JSONB, -- Posts per week, email cadence
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE(brand_kit_id, platform)
);

-- Performance Benchmarks (updated by feedback loop)
CREATE TABLE brand_performance_benchmarks (
  id UUID PRIMARY KEY,
  brand_kit_id UUID NOT NULL REFERENCES brand_kits(id) ON DELETE CASCADE,
  platform VARCHAR(50) NOT NULL,
  historical_best_format VARCHAR(255),
  historical_best_topics TEXT[],
  current_follower_count INT,
  target_metrics JSONB, -- { "monthly_impressions": 100000, "engagement_rate": 0.05 }
  last_updated TIMESTAMP DEFAULT NOW(),
  UNIQUE(brand_kit_id, platform)
);

-- Brand Kit Versions (audit trail)
CREATE TABLE brand_kit_versions (
  id UUID PRIMARY KEY,
  brand_kit_id UUID NOT NULL REFERENCES brand_kits(id) ON DELETE CASCADE,
  version INT NOT NULL,
  changes JSONB NOT NULL, -- Diff of what changed (for audit)
  reason VARCHAR(255), -- "Performance feedback", "Client update", etc.
  created_by UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);
```

### Brand Kit Content Sections

#### 1. Visual Identity
- **Color Palette** — primary, secondary, accent, neutral (with hex codes)
- **Typography** — heading + body fonts with size scale
- **Logo** — lockup, wordmark, icon, usage guidelines
- **Imagery Style** — photography tone, illustration style, stock vs. generated preference
- **Spacing & Layout** — grid rules, padding standards, responsive breakpoints

#### 2. Content Identity
- **Positioning Statement** — what they stand for, who they help, why they're different (1–2 sentences)
- **Tone of Voice** — descriptors (bold/cautious, formal/casual, technical/accessible, vulnerable/confident)
- **Content Pillars** — 3–5 core topics they own and return to consistently
- **Audience Definition** — ICP profile, their problems, their language, psychographics
- **Key Messages** — 5–7 things they always come back to (non-negotiable talking points)
- **Banned Words/Phrases** — what they'd never say (culture/brand guardrails)
- **Writing Rules** — sentence length preferences, paragraph structure, emoji use, contractions, em-dashes

#### 3. Platform-Specific Overrides
Each platform gets a voice variation that keeps core brand identity but adapts to platform algorithm and audience:

**LinkedIn**
- Voice variation (authority, relatability, storytelling vs. prescriptive)
- Content rules: 50-word hook rule, save-optimization (frameworks, checklists), first-person, 1–3 sentence paragraphs
- Format preferences: carousel, document, article, or simple text post
- Posting window (when audience is active)
- Frequency target (e.g., 3 posts/week)

**X/Twitter**
- Voice variation (real-time reactions, brevity, wit, discourse)
- Content rules: thread structure, thread length, emoji use, reply patterns
- Format preferences: standalone tweet, thread, or quote-tweet response
- Posting window (e.g., 2x daily)
- Frequency target

**Instagram**
- Voice variation (visual-first, conversational, aspirational)
- Content rules: carousel structure (7-slide standard), slide 1 scroll-stopping hook (≤12 words)
- Format preferences: reels, carousel, story, or grid post
- Posting window
- Frequency target

**Reddit**
- Voice variation (community-respectful, subreddit conventions, conversation tone)
- Content rules: subreddit rules, community norms, engagement patterns
- Format preferences (post types per subreddit)
- Posting window

**Email/Newsletter**
- Voice variation (direct, personal, educational)
- Content rules: subject line style, segmentation strategy, CTA preferences
- Format preferences (educational, promotional, community, lifestyle)
- Posting window (send day/time)
- Frequency target (e.g., weekly, bi-weekly)

#### 4. Performance Benchmarks
- **Historical best-performing formats** per platform (e.g., "carousels get 2.5x saves on Instagram")
- **Historical best-performing topics** per platform
- **Current audience metrics** (followers, subscribers, email list size)
- **Target metrics** (monthly impressions, engagement rate, conversion rate, email open rate)

---

## Part 2: Newsjacking Toolkit

### Overview

A one-click engine that generates **trending topics relevant to the client's niche**, then creates **brand-aligned, platform-specific content** for all platforms.

### Workflow

1. **User clicks "Generate Newsjacking Topics"**
   - Engine queries trending topic sources (X Trends API, NewsAPI, industry-specific feeds)
   - Filters for topics relevant to client's niche/industry
   - Returns top 5–10 trending topics with context (volume, momentum, relevance score)

2. **Client selects a topic**
   - Topic + client context passed to content generation

3. **Engine generates cross-platform content**
   - Uses selected newsjacking topic + active brand kit + platform rules
   - Generates distinct content for LinkedIn, X, Instagram, Reddit, Email
   - Each variant is algorithm-optimized for that platform but maintains brand voice

4. **Client reviews and posts or edits**
   - Generated content shown in editor
   - Client can edit before posting (edited version tracked separately)
   - Final version saved for analytics

5. **Performance metrics entered and tracked**
   - Client enters raw metrics (impressions, saves, engagement, etc.) per platform
   - Engine interprets metrics to update brand kit

### Newsjacking Topic Sourcing

**Primary Sources** (integrate in Phase 2–3):
- **X Trends API** — real-time trending topics from X
- **NewsAPI** — filtered by client industry keywords
- **Industry-specific feeds** — RSS feeds the client configures
- **Manual input** — client can add topics directly

**Filtering Logic**:
- Filter for topics matching client's content pillars
- Remove spam, low-signal, or off-brand topics
- Score by relevance (keyword match), momentum (velocity), and opportunity (low competition)
- Return top 5–10 sorted by relevance + momentum

### Newsjacking Content Generation Rules

**LinkedIn**
- **Use newsjacking format**: contextualize trend (don't summarize), answer "so what?" in one sentence
- **Timing**: post within 24–48 hours of trend peak
- **Hook**: reference the trend in first 50 words, signal why it matters to audience
- **Body**: your unique insight or contrarian take, backed by experience or data
- **CTA**: save-optimized (framework, checklist, or actionable step), optional follow

**X**
- **Use real-time voice**: react within hours, join the conversation
- **Format**: standalone tweet or thread (2–3 tweets max)
- **Hook**: reference the trend + your angle in <280 chars
- **Engagement**: quote-tweet with your take, reply to popular tweets in thread
- **CTA**: subtle (no hard sell), optional link to content

**Instagram**
- **Visual-first**: trending topic expressed as carousel (7 slides)
- **Hook**: slide 1 scroll-stopping headline relating trend to audience need
- **Body**: slides 2–6 one insight per slide, 2–3 lines max
- **CTA**: slide 7 strong call to action
- **Tone**: bold, conversational, direct

**Reddit**
- **Subreddit selection**: post in communities where topic is on-topic + client has credibility
- **Timing**: post when subreddit is active
- **Format**: question, discussion, or link post depending on community
- **Tone**: respectful, community-aligned, not salesy
- **CTA**: natural (no spam), comment engagement prioritized over post upvotes

**Email**
- **Subject**: reference the trend, signal value (curiosity or solution)
- **Body**: educate (not sell) — what the trend means, why client's audience should care, what to do next
- **CTA**: clear but soft (read article, download guide, attend webinar)
- **Segmentation**: optional (only send to segments interested in this topic pillar)

---

## Part 3: Content Generation Pipeline (Enhanced)

### Standard Workflow

1. **Input** — topic + optional URL/article, active brand kit selected
2. **Generation** — engine creates:
   - LinkedIn post (algorithm-optimized, 50-word hook, save-optimized)
   - X thread or tweet (real-time voice, <280 chars hook)
   - Instagram carousel (7-slide, scroll-stopping hook, CTA)
   - Reddit post (subreddit-specific tone, community rules)
   - Email draft (educational, segmentation-ready)
3. **Editing** — client can edit in editor (edited version saved)
4. **Distribution** — client posts directly via API or copy/paste
5. **Tracking** — client enters metrics (impressions, saves, engagement, etc.)
6. **Feedback** — engine interprets metrics → brand kit updated

### Newsjacking Workflow

1. **Input** — client clicks "Generate Newsjacking Topics"
2. **Topic Sourcing** — engine returns top trending topics in client niche
3. **Topic Selection** — client picks one
4. **Generation** — engine creates brand-aligned content for all platforms using newsjacking rules
5. **Posting & Tracking** — same as standard workflow

### LinkedIn-Specific Rules (from 360Brew strategy)

**4-Bucket Content Strategy**:
- **Growth** — brandjacking, newsjacking, namejacking, hot takes (aim for algorithm amplification)
- **Authority** — case studies, frameworks, real numbers, proof of expertise
- **Conversion** — lead magnets, newsletter sign-ups, product demos, limited spots
- **Personal** — behind-the-scenes, raw thinking, vulnerability (builds parasocial bond)

**Writing Style**:
- First-person practitioner voice ("How I did X" not "How to do X")
- Vulnerability + real decisions (not just wins)
- Casual, conversational tone
- Short paragraphs (1–3 sentences), line breaks between

**50-Word Hook Rule**:
- First 45–50 words must signal topic + audience clearly
- Must compel someone scrolling to stop and keep reading
- If they read past hook, they'll typically read full post

**Save Optimization**:
- Include frameworks, checklists, step-by-step breakdowns
- Use real numbers (real data > generic advice)
- Make it reference-worthy (something they'll save for later)

**Formatting**:
- 1–3 sentence paragraphs
- Line break between paragraphs
- No em-dashes (convert to double hyphen or remove)
- Max 2 hashtags (at end)
- Optional emoji (max 1–2, related to content)

**Format-Specific Rules**:
- **Brandjacking**: Use brand decision as evidence for your insight; aim for Boomerang Effect (brand engages)
- **Newsjacking**: Contextualize (don't summarize); answer "so what?" in one sentence; post within 24–48 hours
- **Namejacking**: Reference specific person your ICP follows; add genuine perspective (not flattery)
- **Hot Takes**: Genuinely held belief that challenges consensus; make you slightly nervous to post
- **Authority**: Case studies, frameworks, real numbers; prove you're a practitioner, not a theorist
- **Conversion**: Clear ask (lead magnet, newsletter, tool sign-up, open spots); use scarcity or value prop

### Instagram-Specific Rules

**Algorithm Focus**:
- Saves & shares > likes
- Completion rate (users viewing all slides) > initial engagement

**7-Slide Carousel Standard**:
- Aspect ratio: 4:5 (mobile-optimized)
- Slide 1: scroll-stopping hook (≤12 words headline)
- Slides 2–6: one insight per slide, 2–3 lines max
- Slide 7: strong CTA (follow, save, share, comment)

**Visual Rhythm**:
- Alternate light/dark backgrounds (keeps eyes engaged)
- Consistent color palette (matches brand visual identity)
- Text-on-image (not text-only slides)

**Copy Style**:
- Short + punchy (image copy, not paragraphs)
- Direct, bold, conversational
- Action-oriented CTAs

---

## Part 4: Continuous Feedback Loop & Brand Kit Updates

### Metrics Collection

Client enters raw metrics only (no interpretation):
- **Impressions** — how many people saw the post
- **Saves** — how many saved it
- **Likes/Upvotes** — engagement signal
- **Comments** — conversation signal
- **Shares/Retweets** — amplification signal
- **Clicks** — for links
- **Conversions** — if applicable (signups, sales, etc.)

### Engine Interpretation

Engine interprets metrics to understand:
- **Which element worked** — hook? format? tone? topic?
- **Which platforms resonated most** — same content gets different results per platform
- **What pattern emerges** — over time, which content types, topics, and tones drive best results

### Brand Kit Updates

Based on patterns, engine updates:
- **Tone adjustments per platform** — if LinkedIn saves spike with vulnerable voice, emphasize that
- **Content pillar priorities** — if posts about "productivity hacks" get 5x saves, increase that pillar weight
- **Platform-specific rules refined** — if Instagram carousels with 4-slide format outperform 7-slide, adjust default
- **Performance benchmarks updated** — new historical best formats, topics, metrics
- **Version tracking** — all changes logged with reason ("Performance feedback: vulnerable voice +20% saves")

### Per-Platform Independence

- Each platform is tested independently
- A post that wins on LinkedIn saves might flop on X replies — both update the kit separately
- Over time, brand kit becomes uniquely optimized for each platform's algorithm + audience
- Client always sees unified brand voice but with platform-specific emphasis

---

## Part 5: Database Schema Extensions

### Content Tracking

```sql
-- Content generation metadata
CREATE TABLE generated_content (
  id UUID PRIMARY KEY,
  workspace_id UUID NOT NULL REFERENCES workspaces(id),
  brand_kit_id UUID NOT NULL REFERENCES brand_kits(id),
  topic TEXT NOT NULL,
  source_type VARCHAR(50), -- 'standard', 'newsjacking', 'article'
  source_url TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Platform-specific generated content
CREATE TABLE generated_posts (
  id UUID PRIMARY KEY,
  generated_content_id UUID NOT NULL REFERENCES generated_content(id) ON DELETE CASCADE,
  platform VARCHAR(50) NOT NULL, -- linkedin, x, instagram, reddit, email
  content TEXT NOT NULL,
  edited_version TEXT, -- If client edited before posting
  status VARCHAR(50), -- draft, scheduled, posted, archived
  posted_at TIMESTAMP,
  posted_by_user_id UUID REFERENCES users(id),
  UNIQUE(generated_content_id, platform)
);

-- Performance metrics (entered by client)
CREATE TABLE post_metrics (
  id UUID PRIMARY KEY,
  generated_post_id UUID NOT NULL REFERENCES generated_posts(id) ON DELETE CASCADE,
  impressions INT,
  saves INT,
  likes INT,
  comments INT,
  shares INT,
  clicks INT,
  conversions INT,
  recorded_at TIMESTAMP NOT NULL DEFAULT NOW(),
  recorded_by_user_id UUID NOT NULL REFERENCES users(id)
);

-- Feedback loop interpretations (engine-generated insights)
CREATE TABLE feedback_insights (
  id UUID PRIMARY KEY,
  brand_kit_id UUID NOT NULL REFERENCES brand_kits(id) ON DELETE CASCADE,
  platform VARCHAR(50),
  insight_type VARCHAR(100), -- 'tone_effectiveness', 'topic_performance', 'format_performance'
  insight_text TEXT NOT NULL,
  impact_metric DECIMAL(5,2), -- e.g., +15% (15% improvement)
  confidence DECIMAL(3,2), -- 0–1, how confident is this insight
  recommendation TEXT, -- What to change in brand kit
  applied BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Newsjacking topic suggestions
CREATE TABLE newsjacking_topics (
  id UUID PRIMARY KEY,
  workspace_id UUID NOT NULL REFERENCES workspaces(id),
  topic_title VARCHAR(255) NOT NULL,
  trend_source VARCHAR(100), -- x_trends, newsapi, rss, manual
  relevance_score DECIMAL(3,2), -- 0–1
  momentum_score DECIMAL(3,2), -- 0–1, how fast is trend growing
  suggested_at TIMESTAMP NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMP, -- When trend becomes stale
  selected BOOLEAN DEFAULT FALSE,
  selected_at TIMESTAMP
);
```

---

## Part 6: Implementation Phases

### Phase 1: Brand Kit Builder (Foundation)
- [ ] PostgreSQL schema for brand kits + visual/content identity
- [ ] React UI forms for brand kit creation (visual identity, content identity)
- [ ] Brand kit storage + versioning
- [ ] Active brand kit selection per workspace

**Acceptance Criteria:**
- Client can create a brand kit with visual + content identity sections
- Brand kit is versioned and tracked
- One brand kit can be marked "active" for content generation
- All sections are persisted to PostgreSQL

### Phase 2: Platform Overrides & Benchmarks
- [ ] PostgreSQL schema for platform overrides + performance benchmarks
- [ ] React UI for platform-specific voice variations + rules per platform
- [ ] Performance benchmark inputs + editing
- [ ] Brand kit version comparison (see what changed across versions)

**Acceptance Criteria:**
- Client can customize voice + rules for each platform (LinkedIn, X, Instagram, Reddit, Email)
- Performance benchmarks are editable and tracked
- Brand kit versions show detailed change history

### Phase 3: Enhanced Content Generation
- [ ] Update generation engine to reference active brand kit
- [ ] Platform-specific generation (different output for each platform)
- [ ] Newsjacking topic sourcing (X Trends API, NewsAPI integration)
- [ ] Newsjacking content generation (trending topic + brand kit → cross-platform content)

**Acceptance Criteria:**
- Generated content varies by platform while maintaining brand voice
- Newsjacking topics are sourced and filtered for relevance
- Generated newsjacking content follows platform-specific rules

### Phase 4: Distribution API
- [ ] Unified posting interface across X, LinkedIn, Instagram, Reddit
- [ ] Email delivery via Mailchimp/SendGrid
- [ ] Post tracking (status: draft → scheduled → posted)
- [ ] Edit history (track edited vs. generated versions)

**Acceptance Criteria:**
- Client can post generated content directly to all platforms
- Edited versions are tracked separately from generated versions
- Email delivery is integrated and tested

### Phase 5: Metrics & Feedback Loop
- [ ] PostgreSQL schema for post metrics + insights
- [ ] Metrics ingestion UI (client enters raw metrics)
- [ ] Engine interpretation (patterns extracted from metrics)
- [ ] Brand kit update recommendations (engine suggests changes based on performance)

**Acceptance Criteria:**
- Client can enter metrics for posted content
- Engine generates insights (which tones/formats/topics worked)
- Brand kit update recommendations are shown and traceable

### Phase 6: Automated Brand Kit Optimization
- [ ] Auto-apply recommended changes (with client approval)
- [ ] Per-platform optimization (different brand kit states per platform)
- [ ] A/B testing support (track which brand kit variation drove results)
- [ ] Historical performance dashboard (see how brand kit changes impacted metrics)

**Acceptance Criteria:**
- Client can approve/reject recommended changes
- Brand kit evolves over time based on performance
- Dashboard shows correlation between brand kit changes and metrics changes

---

## Part 7: API Endpoints (Backend)

### Brand Kit Endpoints

```
POST /workspaces/{workspace_id}/brand-kits
GET /workspaces/{workspace_id}/brand-kits
GET /workspaces/{workspace_id}/brand-kits/{brand_kit_id}
PATCH /workspaces/{workspace_id}/brand-kits/{brand_kit_id}
POST /workspaces/{workspace_id}/brand-kits/{brand_kit_id}/activate
GET /workspaces/{workspace_id}/brand-kits/{brand_kit_id}/versions
```

### Platform Overrides

```
POST /brand-kits/{brand_kit_id}/platforms/{platform}/overrides
GET /brand-kits/{brand_kit_id}/platforms/{platform}/overrides
PATCH /brand-kits/{brand_kit_id}/platforms/{platform}/overrides
```

### Performance Benchmarks

```
POST /brand-kits/{brand_kit_id}/benchmarks
PATCH /brand-kits/{brand_kit_id}/benchmarks/{platform}
GET /brand-kits/{brand_kit_id}/benchmarks
```

### Newsjacking

```
GET /workspaces/{workspace_id}/newsjacking/topics
POST /workspaces/{workspace_id}/newsjacking/topics/{topic_id}/select
POST /workspaces/{workspace_id}/newsjacking/generate
```

### Content Generation (Enhanced)

```
POST /workspaces/{workspace_id}/generate-content
  body: { topic, source_type, source_url, brand_kit_id }
  response: { linkedin: {...}, x: {...}, instagram: {...}, ... }

PATCH /generated-posts/{post_id}
  body: { edited_version, status }

POST /generated-posts/{post_id}/post
  (posts to all platforms)
```

### Metrics

```
POST /generated-posts/{post_id}/metrics
  body: { platform, impressions, saves, likes, comments, shares, clicks, conversions }

GET /generated-posts/{post_id}/metrics

GET /brand-kits/{brand_kit_id}/insights
  (returns feedback loop insights + recommendations)
```

---

## Part 8: Key Design Decisions

### 1. Brand Kit Versioning
- Every update creates a new version (not in-place edits)
- **Why**: audit trail, ability to revert, understanding what changed over time
- All generated content references the specific brand kit version active at generation time
- Enables A/B testing (version A vs. version B, which drove better results?)

### 2. Per-Platform Independence
- Each platform gets its own voice variation + rules
- **Why**: LinkedIn's algorithm rewards different content than Instagram's; email has different constraints than X
- Same brand foundation, but algorithm-optimized execution per platform
- Metrics are tracked per-platform separately, allowing platform-specific optimization

### 3. Client Enters Raw Metrics Only
- Client doesn't analyze or interpret — just inputs numbers (impressions, saves, etc.)
- **Why**: removes interpretation bias, focuses on what engine can reliably extract
- Engine owns interpretation (which tone/format/topic worked based on patterns)
- Simpler UX (client just copies numbers from platform analytics)

### 4. Edited Versions Are Tracked Separately
- Generated vs. edited versions both saved
- **Why**: understand what client changes drive better performance, feedback loop can learn from edits
- Eventually: "clients who edit generated content get 15% better results" → insights

### 5. Newsjacking Is Platform-Agnostic Topic Sourcing
- Newsjacking provides the *topic*, not the platform
- Engine still uses platform-specific rules to generate content
- **Why**: same trending topic generates different content for LinkedIn vs. X (both on-brand, both algorithm-optimized)

---

## Part 9: Success Metrics

### Phase 1–2 (Foundation)
- Brand kit creation takes <5 minutes
- All visual + content identity sections can be customized
- Platform overrides are intuitive to set up

### Phase 3 (Generation)
- Generated content varies meaningfully by platform
- Newsjacking topics are relevant to client niche (>70% relevance score)
- Generated newsjacking content follows platform-specific rules

### Phase 4 (Distribution)
- Post success rate >95% (failures tracked + debugged)
- Email delivery rate >95%
- Edit → post workflow takes <1 minute

### Phase 5–6 (Optimization)
- Engine identifies performance patterns correctly (validated against manual analysis)
- Brand kit recommendations are acted on by clients (>50% adoption)
- Over time, content performance improves (track metrics trending up)
- Per-platform optimization drives 10–20% performance gains vs. generic brand voice

---

## Next Steps

1. **Approve this spec** — confirm approach aligns with product vision
2. **Create task files** for Phase 1 (Brand Kit Builder)
3. **Estimate effort** — each phase, resource allocation
4. **Sync with design team** — UI mockups for brand kit forms
5. **Coordinate with backend** — FastAPI endpoints, database migrations
