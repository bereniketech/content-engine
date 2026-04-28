---
task: "023"
feature: competitive-gaps-roadmap
rec: R3
title: "Create BrandVoiceSettings component, BrandScoreCard, and /dashboard/brand-voice page"
status: pending
model: claude-haiku-4-5
supervisor: software-cto
agent: web-frontend-expert
depends_on: ["021", "022"]
---

## Skills
- `.kit/skills/frameworks-frontend/nextjs-patterns/SKILL.md`
- `.kit/skills/development/build-website-web-app/SKILL.md`

## Agents
- `.kit/agents/software-company/engineering/web-frontend-expert.md`

## Commands
- `.kit/commands/development/code-review.md`
- `.kit/commands/development/verify.md`

---

## Objective
Build `BrandVoiceSettings` for CRUD management of brand voice profiles, `BrandScoreCard` for displaying brand alignment scores in the output panel, and the `/dashboard/brand-voice` page.

## Files

### Create
- `D:/content-engine/components/sections/BrandVoiceSettings.tsx`
- `D:/content-engine/components/ui/BrandScoreCard.tsx`
- `D:/content-engine/app/dashboard/brand-voice/page.tsx`

## Dependencies
- TASK-021/022: All brand-voice API routes exist
- Existing `components/ui/badge.tsx`, `components/ui/button.tsx`, `components/ui/card.tsx`

## Implementation Steps

### BrandScoreCard (`components/ui/BrandScoreCard.tsx`)

```typescript
'use client'
interface BrandScoreCardProps {
  score: number              // 0-100
  violations: string[]
  voiceName: string
  isLoading?: boolean
}
```
- Renders a card with circular score gauge (CSS only — no extra library)
- Score color: ≥80=green, 60-79=amber, <60=red
- Below gauge: voice name label
- If violations.length > 0: expandable list "Show issues (N)"
- `isLoading`: show spinner instead of score

Circular gauge (CSS approach):
```css
/* use conic-gradient */
background: conic-gradient(#22c55e ${score}%, #e5e7eb ${score}%)
```

### BrandVoiceSettings (`components/sections/BrandVoiceSettings.tsx`)

```typescript
'use client'
```

State: `voices` (BrandVoice[]), `editingId` (string | null), `loading`, `error`

On mount: fetch `GET /api/brand-voice`

Render:
1. Header: "Brand Voice Profiles" + "Add Profile" button (disabled when voices.length >= 5, tooltip "Maximum 5 reached")
2. List of voice cards:
   - Card shows: name, formality, tone adjectives as badges, "Set Active" toggle, Edit/Delete buttons
   - `isActive = true` → green border on card
3. Inline edit form (shown when `editingId` matches):
   - Inputs: name (text), formality (select), tone adjectives (comma-separated tag input), writing samples (textarea), forbidden phrases (comma-separated)
   - Save/Cancel buttons
4. "Add Profile" opens blank inline form appended to list

Tag input pattern: `<input>` that on comma/Enter adds a tag to the array; tags displayed as removable pills.

API calls:
- Create: `POST /api/brand-voice`
- Update: `PUT /api/brand-voice/{id}`
- Delete: `DELETE /api/brand-voice/{id}` (confirm dialog first)
- Set active: `PUT /api/brand-voice/{id}` with `{ isActive: true }`

### /dashboard/brand-voice page

`'use client'` — renders `<BrandVoiceSettings />` with page header "Manage Brand Voice Profiles" and a brief explanation paragraph.

## Test Cases

- BrandScoreCard score=85 → green gauge, no violations shown
- BrandScoreCard score=45, violations=['Used forbidden phrase "synergy"'] → red gauge, violations list
- BrandVoiceSettings renders list of voices from API
- "Add Profile" form → POST creates new voice → list refreshes
- Set Active → PUT with isActive:true → active card shows green border
- Delete with confirm → DELETE called → voice removed from list
- 5 voices present → Add button disabled

## Decision Rules
- BrandScoreCard is purely presentational (props in, no API calls).
- Confirmation before delete using `window.confirm()` — no modal needed for MVP.
- Tag input: comma or Enter key adds tag; click × removes tag.
- All API calls in BrandVoiceSettings use native `fetch` with Supabase bearer token.

## Acceptance Criteria
- BrandScoreCard renders score gauge with correct color for each tier.
- BrandVoiceSettings lists, creates, updates, and deletes brand voices.
- "Set Active" toggle works and shows green border on active card.
- Max 5 voices enforced in UI.
- `/dashboard/brand-voice` page accessible and renders settings.

Status: COMPLETE
Completed: 2026-04-28T07:28:23Z
