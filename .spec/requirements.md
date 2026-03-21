# Requirements — AI Content Engine

## User Stories & Acceptance Criteria (EARS Format)

---

### US-01 — Topic Input
As a user, I want to enter a topic, audience, tone, and optional keywords
so that the system researches and generates a full content suite for me.

**AC:**
- WHEN user submits a topic form THEN the system triggers research, SEO, blog, and multi-platform pipelines in sequence
- IF keywords are omitted THEN the system generates them from research
- IF geography is provided THEN SEO and research are localised to that region

---

### US-02 — Article Upload / Paste
As a user, I want to upload or paste an existing article (text or markdown)
so that the system improves, optimises, and repurposes it.

**AC:**
- WHEN user uploads text or markdown THEN grammar correction + clarity improvement runs first
- THEN SEO optimisation applies to the improved version
- THEN multi-platform repurposing generates all assets
- IF PDF/Doc upload is attempted THEN the UI shows "Coming soon" and accepts text/markdown only

---

### US-03 — Research & Topic Intelligence
As a user, I want to see search intent, demand, trend direction, keyword clusters, and FAQs for my topic
so that I know whether it's worth writing about.

**AC:**
- WHEN research runs THEN search intent (informational/commercial), demand (low/medium/high), and trend direction (rising/stable/declining) are displayed
- WHEN demand is "low" THEN the system suggests 3 alternative better-performing topics
- WHEN research completes THEN keyword clusters and top FAQs are shown

---

### US-04 — Competitor & Content Gap Analysis
As a user, I want to see what top-ranking pages cover and what they miss
so that I can write content that outranks them.

**AC:**
- WHEN competitor analysis runs THEN average word count, common headings, and missing sections are displayed
- THEN the system outputs specific "Add section: X" and "Add FAQ: Y" recommendations

---

### US-05 — SEO Engine
As a user, I want a full set of SEO assets generated for my content
so that I can publish with optimised metadata and schema.

**AC:**
- WHEN SEO generation runs THEN SEO title, meta description, URL slug, primary + secondary keywords, FAQ schema, and article schema are produced
- WHEN advanced SEO runs THEN featured snippet answer, semantic keywords, keyword density score, and H1–H3 heading structure are included
- WHEN SEO completes THEN an SEO Strength Score (0–100), Keyword Coverage Score, and Ranking Potential label are shown

---

### US-06 — Blog Content Generation
As a user, I want a 1500–2500 word SEO-optimised blog post generated
so that I have a primary content asset to publish.

**AC:**
- WHEN blog generation runs THEN output is 1500–2500 words with structured sections, examples, use cases, and a CTA
- WHEN tone is selected THEN writing matches authority / casual / storytelling style
- WHILE blog is generating THEN the UI streams the response (no blank wait screen)
- WHEN a section is weak THEN user can click "Expand section" to regenerate it

---

### US-07 — Grammar & Content Improvement (Upload Mode)
As a user, I want my uploaded draft corrected and restructured
so that it reads clearly before repurposing.

**AC:**
- WHEN improvement runs THEN grammar, sentence structure, clarity, and tone consistency are fixed
- THEN original and improved versions are shown side-by-side
- IF user prefers original THEN they can toggle back

---

### US-08 — Image Prompt Generation
As a user, I want AI image prompts for hero, section, social, and Pinterest visuals
so that I can generate on-brand images using Nanobana / fal.ai.

**AC:**
- WHEN image prompts are generated THEN hero, section illustration, infographic, social post, and Pinterest visual prompts are produced
- WHEN style is selected (realistic / 3D / flat / startup / minimal tech) THEN all prompts use that style

---

### US-09 — Multi-Platform Content
As a user, I want my blog post repurposed for X, LinkedIn, Instagram, Medium, Reddit, Newsletter, and Pinterest
so that I can distribute without rewriting.

**AC:**
- WHEN multi-platform runs THEN all 8 platform variants are generated in one pass
- FOR X: viral tweet + 5–10 tweet thread + hooks + reply chains
- FOR LinkedIn: storytelling post + authority post + carousel text
- FOR Instagram: carousel captions + reel caption + hooks + CTA
- FOR Medium: reformatted article with narrative tone + canonical link suggestion
- FOR Reddit: discussion post + subreddit suggestions + engagement questions
- FOR Newsletter: subject lines + email body + CTA (Substack/Mailchimp format)
- FOR Pinterest: pin titles + descriptions + keywords
- EACH platform card has Copy / Edit / Regenerate actions

---

### US-10 — Content Multiplication Summary
As a user, I want to see a summary of all generated assets
so that I know exactly what I have to distribute.

**AC:**
- WHEN all engines complete THEN a summary shows: 1 blog, 1 Medium article, 1 newsletter, 1 Reddit post, 10 tweets, 3 LinkedIn posts, Instagram captions, Pinterest pins, 5 quotes, 5 questions (20–30+ total assets)

---

### US-11 — Distribution Engine
As a user, I want a posting sequence and platform-specific instructions
so that I know where, how, and when to post each asset.

**AC:**
- WHEN distribution runs THEN a 3-day posting sequence is provided (Day 1: Blog + X + LinkedIn, Day 2: Medium + Reddit, Day 3: Newsletter + Pinterest + Instagram)
- FOR each platform THEN post format, CTA placement, link usage, and best practices are shown

---

### US-12 — Traffic Prediction
As a user, I want an estimated traffic range and click potential for my topic
so that I can prioritise high-value content.

**AC:**
- WHEN traffic prediction runs THEN Search Demand, Competition level, Click Potential, and SEO Strength are shown
- THEN a Traffic Potential label (Low/Medium/High) and estimated monthly range (e.g. 300–1200/month) are displayed

---

### US-13 — Content Flywheel
As a user, I want 10+ related topic ideas generated from my current topic
so that I always have a content pipeline.

**AC:**
- WHEN flywheel runs THEN 10+ new blog topic ideas with related keywords and content cluster groupings are shown

---

### US-14 — Content Calendar
As a user, I want an auto-generated weekly posting schedule
so that I don't have to plan manually.

**AC:**
- WHEN calendar generates THEN a Mon–Fri schedule is produced (Monday: Blog, Tuesday: LinkedIn, Wednesday: Reddit, Thursday: X thread, Friday: Newsletter)
- WHEN user clicks a calendar slot THEN the relevant content asset is shown

---

### US-15 — Dashboard UX
As a user, I want a single dashboard with all content sections accessible via sidebar
so that I can navigate and act on all assets in one place.

**AC:**
- WHEN dashboard loads THEN sidebar shows: Research, SEO, Blog, Images, X, LinkedIn, Instagram, Medium, Reddit, Newsletter, Pinterest, Calendar, Analytics
- EACH section has Copy / Edit / Regenerate per content block
- WHEN user is not authenticated THEN they are redirected to login

---

### US-16 — User Auth
As a user, I want to sign up, log in, and have my generated content saved to my account
so that I can return and access past work.

**AC:**
- WHEN user signs up THEN Supabase Auth creates an account with email + password
- WHEN content is generated THEN it is saved to the user's Supabase record
- WHEN user returns THEN past sessions are listed in the dashboard
