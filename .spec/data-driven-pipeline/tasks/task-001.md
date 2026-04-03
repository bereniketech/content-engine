---
task: 001
feature: data-driven-pipeline
status: completed
depends_on: []
---

# Task 001: Types, Interfaces, and Database Migration

## Session Bootstrap
> Load these before reading anything else. Do not load skills not listed here.

Skills: /code-writing-software-development, /database-migrations
Commands: /verify, /task-handoff

---

## Objective

Add all new TypeScript types and interfaces required by the data-driven pipeline to `types/index.ts`. Extend the `SessionInputType` union to include `"data-driven"` and `SessionInputData` to include `DataDrivenInputData`. Create a Supabase migration that updates the `sessions.input_type` check constraint to allow the new value.

---

## Codebase Context
> Pre-populated by Task Enrichment. No file reading required.

### Key Code Snippets

```typescript
// [Current types — from types/index.ts:1-26]
export type SessionInputType = "topic" | "upload";

export type TopicTone = "authority" | "casual" | "storytelling";

export interface TopicInputData {
	topic: string;
	audience: string;
	tone: TopicTone;
	keywords?: string;
	geography?: string;
}

export interface UploadInputData {
	article: string;
}

export type SessionInputData = TopicInputData | UploadInputData;

export interface ContentAsset {
	id: string;
	assetType: string;
	content: Record<string, unknown>;
	version: number;
	createdAt: string;
}
```

```sql
-- [Current DB constraint — from supabase/migrations/20260321_task_002_schema_auth.sql:8]
create table if not exists public.sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  input_type text not null check (input_type in ('topic', 'upload')),
  input_data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
```

```typescript
// [resolveSessionId uses SessionInputType — from lib/session-assets.ts:59-65]
export async function resolveSessionId(options: {
  supabase: SupabaseClient
  userId: string
  providedSessionId?: unknown
  fallbackInputType: SessionInputType
  fallbackInputData: SessionInputData | Record<string, unknown>
}): Promise<string> {
```

### Key Patterns in Use
- **Union types for input modes:** `SessionInputType` is a string literal union, `SessionInputData` is a discriminated union.
- **JSONB content column:** All asset data is stored as `Record<string, unknown>` in `content_assets.content`. No column-level schema enforcement.
- **Check constraint for input_type:** The DB enforces allowed values via a CHECK constraint on `sessions.input_type`.

### Architecture Decisions Affecting This Task
- ADR-2: Free-form `tone: string` on `DataDrivenInputData`, separate from existing `TopicTone` enum. Do NOT extend `TopicTone`.

---

## Handoff from Previous Task
> Populated by /task-handoff after prior task completes. Empty for task-001.

**Files changed by previous task:** _(none — this is task-001)_
**Decisions made:** _(none)_
**Context for this task:** _(none)_
**Open questions left:** _(none)_

---

## Implementation Steps

1. Open `types/index.ts` and add the following new types after the existing ones:
   - `DataDrivenInputData` interface with `sourceText?`, `sourceFileName?`, `topic?`, `tone: string`
   - `DeepResearchResult` interface
   - `AssessmentResult` interface
   - `SeoGeoResult` interface (nested `seo` and `geo` objects)
   - `XCampaignPost` interface
   - `XCampaignOutput` interface
   - `MultiFormatOutput` interface
2. Update `SessionInputType` to `"topic" | "upload" | "data-driven"`.
3. Update `SessionInputData` to include `DataDrivenInputData` in the union.
4. Create `supabase/migrations/<timestamp>_data_driven_flow.sql`:
   - `ALTER TABLE public.sessions DROP CONSTRAINT sessions_input_type_check;`
   - `ALTER TABLE public.sessions ADD CONSTRAINT sessions_input_type_check CHECK (input_type IN ('topic', 'upload', 'data-driven'));`
5. Run `npx tsc --noEmit` to verify all types compile.

_Requirements: 1, 2, 12_
_Skills: /code-writing-software-development — typed models, /database-migrations — Supabase migration_

---

## Acceptance Criteria
- [x] `SessionInputType` includes `"data-driven"`
- [x] `SessionInputData` union includes `DataDrivenInputData`
- [x] All new interfaces (`DeepResearchResult`, `AssessmentResult`, `SeoGeoResult`, `XCampaignPost`, `XCampaignOutput`, `MultiFormatOutput`) are exported from `types/index.ts`
- [x] `DataDrivenInputData.tone` is `string` (not `TopicTone`)
- [x] Migration SQL file exists and is valid
- [x] `npx tsc --noEmit` passes with no errors
- [x] All existing tests pass
- [x] `/verify` passes

---

## Verification Report

**Date:** 2026-04-02  
**Status:** ✓ PASSED

### Verification Results
- **Build:** ✓ OK (npm run build completed successfully)
- **Types:** ✓ OK (npx tsc --noEmit — no errors)
- **Lint:** ✓ OK (npm run lint — exit code 0)
- **Tests:** ⊘ Not configured (test script not defined in project)
- **Console.log:** ✓ OK (no console.log found in source files)
- **Secrets Audit:** ✓ OK (no API keys or secrets detected)

### Files Modified
- `types/index.ts`: Added SessionInputType "data-driven", DataDrivenInputData, and result interfaces
- `supabase/migrations/20260402_data_driven_flow.sql`: Created migration for constraint update

---

## Handoff to Next Task
> Fill via `/task-handoff` after completing this task.

**Files changed:**
- `types/index.ts`: Added SessionInputType "data-driven", DataDrivenInputData interface, and other result interfaces
- `supabase/migrations/20260402_data_driven_flow.sql`: Created new migration to update check constraint

**Decisions made:**
- DataDrivenInputData.tone uses `string` type (not TopicTone enum) per ADR-2
- All result interfaces use flexible `Record<string, unknown>` pattern for extensibility
- Migration drops and recreates check constraint to include 'data-driven'

**Context for next task:**
- New SessionInputType "data-driven" is now available for use throughout the codebase
- Types compile successfully with no errors
- Database schema is ready to be migrated

**Open questions:** None
