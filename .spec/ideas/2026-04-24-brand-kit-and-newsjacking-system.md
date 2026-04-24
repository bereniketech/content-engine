# Brand Kit & Newsjacking System for Content Engine

**Date:** 2026-04-24  
**Status:** Brainstorm Complete

---

## Overview

The content engine needs two major systems:

1. **Brand Kit** — a comprehensive, living profile of a client's brand that informs all content generation
2. **Newsjacking Toolkit** — a separate function to identify trending topics and generate timely cross-platform content

Both systems feed into a continuous feedback loop where performance metrics from posted content update the brand kit over time.

---

## 1. Brand Kit Structure

### 1.1 Visual Identity
- **Color Palette** — primary, secondary, accent, neutral colors with hex codes
- **Typography** — heading font family + weight, body font family + weight, sizing scale
- **Logo** — lockup, wordmark, icon mark, usage guidelines
- **Imagery Style** — photography tone, illustration style, stock/generated preference
- **Spacing & Layout System** — grid rules, padding, breakpoints

### 1.2 Content Identity
- **Positioning Statement** — what they stand for, who they help, why they're different
- **Tone of Voice** — descriptors (bold/cautious, formal/casual, technical/accessible)
- **Content Pillars / Lanes** — 3–5 core topics they own
- **Audience Definition** — ICP, their problems, their language
- **Key Messages** — 5–7 core things they always return to
- **Banned Words / Phrases** — what they'd never say
- **Writing Rules** — sentence length, paragraph structure, emoji use, contractions

### 1.3 Platform-Specific Content Overrides

Each platform gets a voice variation that keeps the core brand but adapts to platform algorithm and audience:

- **LinkedIn voice & content rules** — storytelling, authority, 360Brew optimized, "How I" style, 50-word hook rule, save-optimization
- **X voice & content rules** — brevity, real-time reactions, thread structure
- **Instagram voice & content rules** — visual-first, scroll-stopping hooks, save-optimization, carousel design
- **Reddit voice & content rules** — community respect, subreddit conventions, conversation tone
- **Email/Newsletter voice & content rules** — subject line style, segmentation, CTA preferences, frequency

### 1.4 Performance Benchmarks
- Historical best-performing formats per platform
- Historical best-performing topics per platform
- Current follower/subscriber counts per platform
- Target metrics (what "success" looks like per platform)

---

## 2. Newsjacking Toolkit

### 2.1 Function
A one-click engine function that generates trending topics relevant to the client's niche.

### 2.2 Workflow
1. User clicks "Generate Newsjacking Topics"
2. Engine produces list of trending topics in the client's industry/niche
3. Client selects a topic
4. Engine generates cross-platform content (LinkedIn, X, Instagram, Reddit, Email) informed by:
   - The selected newsjacking topic
   - The client's brand kit
   - Platform-specific content rules
   - LinkedIn carousel best practices based on posts.txt

---

## 3. Content Generation Pipeline (Enhanced)

### 3.1 Core Flow
1. **Input** — topic, article, or newsjacking topic (+ brand kit context)
2. **Generation** — engine creates content for all platforms using brand kit
3. **Platform Variations** — LinkedIn, X, Instagram, Reddit, Email each get algorithm-optimized, brand-aligned versions
4. **Saving** — all generated content tied to session; client either posts as-is or edits in editor (edited version saved as final)
5. **Posting** — client posts exactly what was generated/edited
6. **Performance Tracking** — client enters metrics (impressions, saves, engagement, etc.) per platform per post
7. **Brand Kit Feedback Loop** — engine interprets metrics and adjusts brand kit continuously

### 3.2 LinkedIn-Specific Rules (from 360Brew & content-plan.md)
- **4-Bucket Content Strategy**: Growth (brandjacking, newsjacking, namejacking, hot takes), Authority, Conversion, Personal
- **Writing Style** — "How I" not "How To"; first-person practitioner voice; vulnerability and real decisions
- **50-Word Hook Rule** — first 45–50 words must signal topic + audience clearly
- **Save Optimization** — include frameworks, checklists, step-by-step breakdowns, real numbers
- **Formatting** — 1–3 sentence paragraphs, line breaks between, conversational tone, no em-dashes, max 2 hashtags
- **Format-Specific Rules**:
  - Brandjacking: use brand decision as evidence for your insight; aim for Boomerang Effect
  - Newsjacking: contextualize (don't summarize); answer "so what?" in one sentence; post within 24–48 hours
  - Namejacking: reference specific person your ICP follows; add genuine perspective
  - Hot Takes: genuinely held belief that challenges consensus; must make you slightly nervous to post
  - Authority: case studies, frameworks, real numbers; prove you're a practitioner
  - Conversion: clear ask (lead magnet, newsletter, tool sign-up, open spots)

### 3.3 Instagram-Specific Rules
- Algorithm rewards saves & shares far more than likes
- 7-slide carousel format: 4:5 aspect ratio, alternating light/dark visual rhythm
- Slide 1: scroll-stopping hook (≤12 words headline)
- Slides 2–6: one insight per slide, 2–3 lines max body
- Slide 7: strong CTA (follow, save, share, comment)
- Short punchy copy — image copy, not paragraphs
- Tone: direct, bold, conversational

### 3.4 Reference Material
- **posts.txt** — examples of high-performing LinkedIn content (4 formats, authority, conversion); used as reference for what "good LinkedIn content" looks like
- **content-plan.md** — full 360Brew strategy, 4-bucket framework, newsjacking timing, comment flywheel, 90-day timeline

---

## 4. Continuous A/B Testing & Feedback Loop

### 4.1 The Loop
1. Content is generated and posted (exact version tracked)
2. Client enters raw metrics only: impressions, saves, likes, comments, shares, etc. per platform
3. Engine interprets metrics to understand:
   - Which element worked (hook? format? tone? topic?)
   - Which platforms resonated most
   - What pattern emerges
4. Brand kit is updated:
   - Tone adjustments per platform if needed
   - Content pillar priorities shift based on what gets saves/engagement
   - Platform-specific rules refined
   - Performance benchmarks updated
5. Next content generation uses updated brand kit

### 4.2 Per-Platform Independence
- Each platform is tested independently
- A post that wins on LinkedIn saves might flop on X replies — both signals update the kit separately
- Over time, the brand kit becomes uniquely optimized for each platform's algorithm

---

## 5. Platforms Covered

**Currently Integrated (API configured):**
- Twitter/X

**In Build Order:**
- LinkedIn — direct posting via API
- Instagram — via Business Account API
- Reddit — via API
- Email — Mailchimp & SendGrid for newsletter distribution
- Analytics — Google Analytics 4 & Search Console for performance tracking

---

## 6. Key Insights

- **Brand kit is foundational** — every piece of content (regular generation + newsjacking) uses it
- **Platform variations are essential** — same brand, different algorithm rules, so voice shifts per platform
- **Content is exact & trackable** — either generated as-is or edited in editor; final version always known
- **Client provides numbers only** — engine does the interpretation and adjustment
- **Continuous learning** — brand kit evolves toward what wins across all platforms over time
- **Newsjacking is separate but branded** — trending topics + brand kit + platform rules = timely, on-brand content

---

## 7. Open Questions / Future Considerations

- How are trending topics sourced? (X monitoring, news feeds, industry APIs, manual input?)
- What's the cadence for brand kit updates? (per post, weekly, monthly?)
- How does the engine weight recent performance vs. historical patterns?
- Should brand kit versions be tracked (audit trail of changes over time)?
- How are performance thresholds defined? (when does a post count as "worked"?)
