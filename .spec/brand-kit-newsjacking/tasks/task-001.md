---
task: 001
feature: brand-kit-newsjacking
status: pending
model: haiku
supervisor: software-cto
agent: database-architect
depends_on: []
---

# Task 001: Create PostgreSQL Schema & Migrations

## Skills
- .kit/skills/data-backend/postgres-patterns/SKILL.md
- .kit/skills/data-backend/database-migrations/SKILL.md

## Agents
- @database-architect

## Commands
- /verify

> Load the skills listed above before reading anything else. Do not load context not listed here.

---

## Objective

Create all 13 PostgreSQL tables for brand kit, content, metrics, and feedback systems with correct relationships, constraints, indexes, and reversible migrations.

---

## Files

### Create

| File | Purpose |
|------|---------|
| `migrations/001_create_brand_kit_schema.sql` | Create all 13 tables with constraints and relationships |
| `migrations/001_create_brand_kit_schema.down.sql` | Rollback script to drop all tables |
| `migrations/002_create_indexes.sql` | Create performance indexes |
| `migrations/002_create_indexes.down.sql` | Drop indexes rollback |
| `schemas/brand_kit_schema.md` | Documentation of all tables, columns, types, constraints |

---

## Dependencies

_(none — this is foundational)_

---

## API Contracts

_(none — this task is database schema only)_

---

## Code Templates

### `migrations/001_create_brand_kit_schema.sql`

```sql
-- Create workspaces table (multi-tenancy boundary)
CREATE TABLE IF NOT EXISTS workspaces (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  created_by_user_id UUID NOT NULL
);

-- Create brand_kits table (main entity)
CREATE TABLE IF NOT EXISTS brand_kits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  version INT NOT NULL DEFAULT 1,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  approved_at TIMESTAMP,
  is_active BOOLEAN DEFAULT FALSE,
  UNIQUE(workspace_id, version)
);

-- Create brand_visual_identity table
CREATE TABLE IF NOT EXISTS brand_visual_identity (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_kit_id UUID NOT NULL REFERENCES brand_kits(id) ON DELETE CASCADE,
  color_palette JSONB NOT NULL, -- {"primary":"#000","secondary":"#FFF","accent":"#00F","neutral":"#CCC"}
  typography JSONB NOT NULL, -- {"heading_font":"Arial","body_font":"Georgia","size_scale":"standard"}
  logo_url TEXT,
  imagery_style VARCHAR(255), -- minimalist, vibrant, documentary
  spacing_system JSONB, -- {"grid":"8px","padding":"16px","breakpoints":"768px,1024px"}
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Create brand_content_identity table
CREATE TABLE IF NOT EXISTS brand_content_identity (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_kit_id UUID NOT NULL REFERENCES brand_kits(id) ON DELETE CASCADE,
  positioning_statement TEXT NOT NULL,
  tone_descriptors TEXT[] NOT NULL DEFAULT '{}', -- {"bold","casual","technical"}
  content_pillars TEXT[] NOT NULL DEFAULT '{}', -- {"productivity","remote work","tools"}
  audience_icp JSONB NOT NULL, -- {"role":"founder","size":"1-10","challenges":["hiring"]}
  key_messages TEXT[] NOT NULL DEFAULT '{}', -- {"Focus on outcomes","Build in public"}
  banned_words TEXT[] DEFAULT '{}', -- {"synergy","leverage"}
  writing_rules JSONB, -- {"sentence_length":"short","emoji_use":"sparingly","contractions":true}
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Create brand_platform_overrides table
CREATE TABLE IF NOT EXISTS brand_platform_overrides (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_kit_id UUID NOT NULL REFERENCES brand_kits(id) ON DELETE CASCADE,
  platform VARCHAR(50) NOT NULL, -- linkedin, x, instagram, reddit, email
  voice_variation VARCHAR(255), -- "authority","conversational","urgent"
  content_rules JSONB NOT NULL, -- platform-specific rules
  format_preferences JSONB, -- {"preferred_format":"carousel","avoid":"hashtags"}
  posting_window VARCHAR(255), -- "9am-12pm EST"
  frequency_targets JSONB, -- {"posts_per_week":3}
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE(brand_kit_id, platform)
);

-- Create brand_performance_benchmarks table
CREATE TABLE IF NOT EXISTS brand_performance_benchmarks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_kit_id UUID NOT NULL REFERENCES brand_kits(id) ON DELETE CASCADE,
  platform VARCHAR(50) NOT NULL,
  historical_best_format VARCHAR(255), -- "carousel","thread","single_post"
  historical_best_topics TEXT[], -- topics that performed well
  current_follower_count INT,
  target_metrics JSONB, -- {"monthly_impressions":100000,"engagement_rate":0.05}
  last_updated TIMESTAMP DEFAULT NOW(),
  UNIQUE(brand_kit_id, platform)
);

-- Create brand_kit_versions table (audit trail)
CREATE TABLE IF NOT EXISTS brand_kit_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_kit_id UUID NOT NULL REFERENCES brand_kits(id) ON DELETE CASCADE,
  version INT NOT NULL,
  changes JSONB NOT NULL, -- {"field":"tone_descriptors","from":["bold"],"to":["bold","casual"]}
  reason VARCHAR(255), -- "Performance feedback","Client update"
  created_by UUID NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Create generated_content table
CREATE TABLE IF NOT EXISTS generated_content (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  brand_kit_id UUID NOT NULL REFERENCES brand_kits(id),
  topic TEXT NOT NULL,
  source_type VARCHAR(50) NOT NULL, -- 'standard','newsjacking','article'
  source_url TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Create generated_posts table (per-platform variants)
CREATE TABLE IF NOT EXISTS generated_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  generated_content_id UUID NOT NULL REFERENCES generated_content(id) ON DELETE CASCADE,
  platform VARCHAR(50) NOT NULL, -- linkedin,x,instagram,reddit,email
  content TEXT NOT NULL,
  edited_version TEXT, -- If client edited before posting
  status VARCHAR(50) DEFAULT 'draft', -- draft,scheduled,posted,archived
  posted_at TIMESTAMP,
  posted_by_user_id UUID,
  post_id VARCHAR(255), -- Platform-specific post ID
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE(generated_content_id, platform)
);

-- Create post_metrics table (client-entered)
CREATE TABLE IF NOT EXISTS post_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  generated_post_id UUID NOT NULL REFERENCES generated_posts(id) ON DELETE CASCADE,
  impressions INT,
  saves INT,
  likes INT,
  comments INT,
  shares INT,
  clicks INT,
  conversions INT,
  recorded_at TIMESTAMP NOT NULL DEFAULT NOW(),
  recorded_by_user_id UUID NOT NULL
);

-- Create feedback_insights table (engine-generated)
CREATE TABLE IF NOT EXISTS feedback_insights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_kit_id UUID NOT NULL REFERENCES brand_kits(id) ON DELETE CASCADE,
  platform VARCHAR(50), -- platform insight applies to, or null for cross-platform
  insight_type VARCHAR(100), -- tone_effectiveness,topic_performance,format_performance
  insight_text TEXT NOT NULL, -- "Vulnerable tone +20% saves on LinkedIn"
  impact_metric DECIMAL(5, 2), -- +15 (percent improvement)
  confidence DECIMAL(3, 2), -- 0–1
  recommendation TEXT, -- "Increase tone_descriptors.vulnerable weight on LinkedIn"
  applied BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Create newsjacking_topics table
CREATE TABLE IF NOT EXISTS newsjacking_topics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  topic_title VARCHAR(255) NOT NULL,
  trend_source VARCHAR(100), -- x_trends,newsapi,rss,manual
  relevance_score DECIMAL(3, 2), -- 0–1
  momentum_score DECIMAL(3, 2), -- 0–1
  context TEXT, -- Brief description
  suggested_at TIMESTAMP NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMP,
  selected BOOLEAN DEFAULT FALSE,
  selected_at TIMESTAMP
);
```

### `migrations/001_create_brand_kit_schema.down.sql`

```sql
-- Rollback script: drop all tables in reverse dependency order
DROP TABLE IF EXISTS newsjacking_topics CASCADE;
DROP TABLE IF EXISTS feedback_insights CASCADE;
DROP TABLE IF EXISTS post_metrics CASCADE;
DROP TABLE IF EXISTS generated_posts CASCADE;
DROP TABLE IF EXISTS generated_content CASCADE;
DROP TABLE IF EXISTS brand_kit_versions CASCADE;
DROP TABLE IF EXISTS brand_performance_benchmarks CASCADE;
DROP TABLE IF EXISTS brand_platform_overrides CASCADE;
DROP TABLE IF EXISTS brand_content_identity CASCADE;
DROP TABLE IF EXISTS brand_visual_identity CASCADE;
DROP TABLE IF EXISTS brand_kits CASCADE;
DROP TABLE IF EXISTS workspaces CASCADE;
```

### `migrations/002_create_indexes.sql`

```sql
-- Performance indexes
CREATE INDEX IF NOT EXISTS idx_brand_kits_workspace_active 
  ON brand_kits(workspace_id, is_active);

CREATE INDEX IF NOT EXISTS idx_brand_visual_identity_kit 
  ON brand_visual_identity(brand_kit_id);

CREATE INDEX IF NOT EXISTS idx_brand_content_identity_kit 
  ON brand_content_identity(brand_kit_id);

CREATE INDEX IF NOT EXISTS idx_brand_platform_overrides_kit 
  ON brand_platform_overrides(brand_kit_id);

CREATE INDEX IF NOT EXISTS idx_brand_performance_benchmarks_kit 
  ON brand_performance_benchmarks(brand_kit_id);

CREATE INDEX IF NOT EXISTS idx_brand_kit_versions_kit 
  ON brand_kit_versions(brand_kit_id);

CREATE INDEX IF NOT EXISTS idx_generated_content_workspace 
  ON generated_content(workspace_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_generated_posts_content 
  ON generated_posts(generated_content_id);

CREATE INDEX IF NOT EXISTS idx_generated_posts_status 
  ON generated_posts(status);

CREATE INDEX IF NOT EXISTS idx_post_metrics_post 
  ON post_metrics(generated_post_id);

CREATE INDEX IF NOT EXISTS idx_feedback_insights_kit 
  ON feedback_insights(brand_kit_id, applied);

CREATE INDEX IF NOT EXISTS idx_newsjacking_topics_workspace 
  ON newsjacking_topics(workspace_id, expires_at);
```

### `migrations/002_create_indexes.down.sql`

```sql
DROP INDEX IF EXISTS idx_brand_kits_workspace_active;
DROP INDEX IF EXISTS idx_brand_visual_identity_kit;
DROP INDEX IF EXISTS idx_brand_content_identity_kit;
DROP INDEX IF EXISTS idx_brand_platform_overrides_kit;
DROP INDEX IF EXISTS idx_brand_performance_benchmarks_kit;
DROP INDEX IF EXISTS idx_brand_kit_versions_kit;
DROP INDEX IF EXISTS idx_generated_content_workspace;
DROP INDEX IF EXISTS idx_generated_posts_content;
DROP INDEX IF EXISTS idx_generated_posts_status;
DROP INDEX IF EXISTS idx_post_metrics_post;
DROP INDEX IF EXISTS idx_feedback_insights_kit;
DROP INDEX IF EXISTS idx_newsjacking_topics_workspace;
```

### `schemas/brand_kit_schema.md`

```markdown
# Brand Kit PostgreSQL Schema

## Tables (13 total)

### workspaces
Multi-tenancy boundary. Every other table filters by workspace_id.
- id (UUID PK)
- name (VARCHAR 255)
- created_at (TIMESTAMP)
- created_by_user_id (UUID) — link to users table

### brand_kits
Main brand kit entity. Versioned (version + approved_at + is_active).
- id (UUID PK)
- workspace_id (UUID FK → workspaces)
- name (VARCHAR 255)
- version (INT) — starts at 1, increments on approval
- created_at (TIMESTAMP)
- updated_at (TIMESTAMP)
- approved_at (TIMESTAMP) — null until first approval
- is_active (BOOLEAN) — only one per workspace
- UNIQUE(workspace_id, version)

### brand_visual_identity
Stores colors, fonts, logo, imagery style, spacing rules.
- id (UUID PK)
- brand_kit_id (UUID FK → brand_kits CASCADE)
- color_palette (JSONB) — {"primary":"#000","secondary":"#FFF",...}
- typography (JSONB) — {"heading_font":"Arial","body_font":"Georgia",...}
- logo_url (TEXT)
- imagery_style (VARCHAR 255)
- spacing_system (JSONB) — grid, padding, breakpoints
- created_at (TIMESTAMP)

### brand_content_identity
Stores tone, messaging, audience, writing rules.
- id (UUID PK)
- brand_kit_id (UUID FK → brand_kits CASCADE)
- positioning_statement (TEXT) — 1–2 sentences
- tone_descriptors (TEXT[]) — array of descriptors
- content_pillars (TEXT[]) — 3–5 core topics
- audience_icp (JSONB) — role, company size, challenges
- key_messages (TEXT[]) — 5–7 core messages
- banned_words (TEXT[]) — words never to use
- writing_rules (JSONB) — sentence length, emoji use, etc.
- created_at (TIMESTAMP)

### brand_platform_overrides
Platform-specific voice + rules (LinkedIn, X, Instagram, Reddit, Email).
- id (UUID PK)
- brand_kit_id (UUID FK → brand_kits CASCADE)
- platform (VARCHAR 50) — linkedin, x, instagram, reddit, email
- voice_variation (VARCHAR 255) — "authority", "conversational", etc.
- content_rules (JSONB) — platform-specific rules
- format_preferences (JSONB) — preferred formats per platform
- posting_window (VARCHAR 255) — best time to post
- frequency_targets (JSONB) — posts per week, email cadence
- created_at (TIMESTAMP)
- UNIQUE(brand_kit_id, platform)

### brand_performance_benchmarks
Historical performance data per platform.
- id (UUID PK)
- brand_kit_id (UUID FK → brand_kits CASCADE)
- platform (VARCHAR 50)
- historical_best_format (VARCHAR 255) — format that performed best
- historical_best_topics (TEXT[]) — topics that worked well
- current_follower_count (INT)
- target_metrics (JSONB) — KPIs to target
- last_updated (TIMESTAMP)
- UNIQUE(brand_kit_id, platform)

### brand_kit_versions
Audit trail: every version change recorded here.
- id (UUID PK)
- brand_kit_id (UUID FK → brand_kits CASCADE)
- version (INT) — which version this records
- changes (JSONB) — diff of what changed
- reason (VARCHAR 255) — "Performance feedback", "Client update"
- created_by (UUID FK → users)
- created_at (TIMESTAMP)

### generated_content
Core entity: one per topic/generation request.
- id (UUID PK)
- workspace_id (UUID FK → workspaces CASCADE)
- brand_kit_id (UUID FK → brand_kits)
- topic (TEXT) — the topic/article that was generated for
- source_type (VARCHAR 50) — 'standard', 'newsjacking', 'article'
- source_url (TEXT) — optional article URL
- created_at (TIMESTAMP)

### generated_posts
One per platform per generated_content (5 rows per generation: LinkedIn, X, Instagram, Reddit, Email).
- id (UUID PK)
- generated_content_id (UUID FK → generated_content CASCADE)
- platform (VARCHAR 50) — linkedin, x, instagram, reddit, email
- content (TEXT) — the generated content for this platform
- edited_version (TEXT) — if client edited, store edited version here
- status (VARCHAR 50) — draft, scheduled, posted, archived
- posted_at (TIMESTAMP) — when actually posted
- posted_by_user_id (UUID FK → users)
- post_id (VARCHAR 255) — platform's unique post ID (e.g., tweet ID)
- created_at (TIMESTAMP)
- UNIQUE(generated_content_id, platform)

### post_metrics
Client-entered performance metrics for a post.
- id (UUID PK)
- generated_post_id (UUID FK → generated_posts CASCADE)
- impressions (INT)
- saves (INT)
- likes (INT)
- comments (INT)
- shares (INT)
- clicks (INT)
- conversions (INT)
- recorded_at (TIMESTAMP)
- recorded_by_user_id (UUID FK → users)

### feedback_insights
Engine-generated insights from metrics analysis.
- id (UUID PK)
- brand_kit_id (UUID FK → brand_kits CASCADE)
- platform (VARCHAR 50) — null if cross-platform insight
- insight_type (VARCHAR 100) — tone_effectiveness, topic_performance, format_performance
- insight_text (TEXT) — human-readable insight
- impact_metric (DECIMAL 5,2) — e.g., +20 (20% improvement)
- confidence (DECIMAL 3,2) — 0–1
- recommendation (TEXT) — what to change in brand kit
- applied (BOOLEAN) — true if client approved this insight
- created_at (TIMESTAMP)

### newsjacking_topics
Trending topics available for selection.
- id (UUID PK)
- workspace_id (UUID FK → workspaces CASCADE)
- topic_title (VARCHAR 255)
- trend_source (VARCHAR 100) — x_trends, newsapi, rss, manual
- relevance_score (DECIMAL 3,2) — 0–1
- momentum_score (DECIMAL 3,2) — 0–1
- context (TEXT) — brief description
- suggested_at (TIMESTAMP)
- expires_at (TIMESTAMP) — when topic becomes stale
- selected (BOOLEAN)
- selected_at (TIMESTAMP)

## Relationships Summary

```
workspaces (1) ──→ (∞) brand_kits
             ├──→ (∞) generated_content
             └──→ (∞) newsjacking_topics

brand_kits (1) ──→ (1) brand_visual_identity
           ├──→ (1) brand_content_identity
           ├──→ (∞) brand_platform_overrides (5 per kit: one per platform)
           ├──→ (∞) brand_performance_benchmarks (5 per kit)
           ├──→ (∞) brand_kit_versions
           └──→ (∞) feedback_insights

generated_content (1) ──→ (∞) generated_posts (5 per content: one per platform)

generated_posts (1) ──→ (∞) post_metrics
```

## Indexes

- `(workspace_id, is_active)` on brand_kits — load active kit per workspace
- `(workspace_id, created_at DESC)` on generated_content — list recent content
- `(brand_kit_id, applied)` on feedback_insights — fetch pending insights
- `(workspace_id, expires_at)` on newsjacking_topics — list current topics
- Individual FK indexes for JOIN performance
```

---

## Codebase Context

> No existing codebase yet; this is greenfield. Database schema is foundational for all subsequent tasks.

---

## Implementation Steps

1. Create `migrations/001_create_brand_kit_schema.sql` (copy Code Template above exactly)
2. Create `migrations/001_create_brand_kit_schema.down.sql` (copy rollback template)
3. Create `migrations/002_create_indexes.sql` (copy index template)
4. Create `migrations/002_create_indexes.down.sql` (copy rollback template)
5. Create `schemas/brand_kit_schema.md` (copy documentation template)
6. Run migrations: `psql -f migrations/001_create_brand_kit_schema.sql`
7. Run indexes: `psql -f migrations/002_create_indexes.sql`
8. Verify schema: `psql -c "\dt" —database=content_engine`
9. Test rollback: `psql -f migrations/002_create_indexes.down.sql && psql -f migrations/001_create_brand_kit_schema.down.sql`
10. Run `/verify`

---

## Test Cases

### File: `tests/database/schema.test.sql`

```sql
-- Test: All 13 tables exist
\dt — should show 13 tables (workspaces, brand_kits, brand_visual_identity, ...)

-- Test: Foreign key constraints enforced
INSERT INTO brand_kits (workspace_id, name, version) VALUES ('nonexistent-uuid', 'Test', 1);
-- Should fail with foreign key constraint error

-- Test: Unique constraints enforced
INSERT INTO brand_kits (workspace_id, name, version) VALUES ('workspace-uuid-1', 'Kit1', 1);
INSERT INTO brand_kits (workspace_id, name, version) VALUES ('workspace-uuid-1', 'Kit1', 1);
-- Second insert should fail with UNIQUE constraint error

-- Test: Indexes exist
SELECT * FROM pg_indexes WHERE tablename = 'brand_kits';
-- Should show idx_brand_kits_workspace_active

-- Test: JSONB columns accept valid JSON
INSERT INTO brand_visual_identity (brand_kit_id, color_palette, typography) 
VALUES ('kit-uuid', '{"primary":"#000"}', '{"heading_font":"Arial"}');
-- Should succeed

-- Test: Array columns work
INSERT INTO brand_content_identity (brand_kit_id, positioning_statement, tone_descriptors, content_pillars, audience_icp, key_messages) 
VALUES ('kit-uuid', 'We help teams...', '{"bold","casual"}', '{"productivity"}', '{}', '{"Focus"}');
-- Should succeed

-- Test: ON DELETE CASCADE works
INSERT INTO brand_kits ... — insert brand kit
INSERT INTO brand_visual_identity ... — insert visual identity for that kit
DELETE FROM brand_kits WHERE id = '...';
SELECT * FROM brand_visual_identity WHERE brand_kit_id = '...';
-- Should return empty (cascade deleted)

-- Test: Rollback works
psql -f migrations/002_create_indexes.down.sql
SELECT * FROM pg_indexes WHERE tablename = 'brand_kits';
-- Should return empty (indexes dropped)
psql -f migrations/001_create_brand_kit_schema.down.sql
\dt
-- Should return empty (all tables dropped)
```

---

## Decision Rules

| Scenario | Action |
|----------|--------|
| Foreign key constraint violated | Database returns constraint violation error; task fails |
| Migration already applied | Check migration history table (if using framework like Alembic); skip or re-apply idempotently |
| Schema change needed post-deployment | Always use new migration file (003_...) and test rollback before deploying |

---

## Acceptance Criteria

- [ ] WHEN migrations/001_create_brand_kit_schema.sql runs THEN all 13 tables created with correct columns, types, constraints
- [ ] WHEN migrations/002_create_indexes.sql runs THEN 12 indexes created and queryable
- [ ] WHEN foreign key constraint violated (e.g., invalid workspace_id) THEN database rejects with constraint error
- [ ] WHEN unique constraint violated (e.g., duplicate workspace_id + version) THEN database rejects with unique error
- [ ] WHEN ON DELETE CASCADE triggered THEN child rows deleted automatically
- [ ] WHEN rollback scripts run THEN all tables and indexes dropped cleanly
- [ ] WHEN `/verify` runs THEN schema validation passes (all tables exist with correct structure)

---

## Handoff to Next Task

> Fill via `/task-handoff` after completing this task.

**Files changed:** _(fill via /task-handoff)_  
**Decisions made:** _(fill via /task-handoff)_  
**Context for next task:** _(fill via /task-handoff)_  
**Open questions:** _(fill via /task-handoff)_
