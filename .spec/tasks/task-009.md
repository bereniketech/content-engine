# TASK-009 — Multi-Platform Social Engine API + UI

## Session Bootstrap
Skills needed: code-writing-software-development, api-design, claude-developer-platform, x-api

## Objective
Build `POST /api/social` producing all 8 platform variants in one Claude call. Build all 7 platform panel UIs with Copy/Edit/Regenerate per content block.

## Implementation Steps
1. Create `/lib/prompts/social.ts` — single Claude prompt that takes blog + SEO + platform list and returns structured JSON with all 8 platforms:
   ```
   { x: { tweet, thread[], hooks[], replies[] },
     linkedin: { storytelling, authority, carousel },
     instagram: { carouselCaptions[], reelCaption, hooks[], cta },
     medium: { article, canonicalSuggestion },
     reddit: { post, subreddits[], questions[] },
     newsletter: { subjectLines[], body, cta },
     pinterest: { pins: [{ title, description, keywords[] }] },
     extras: { quotes[], discussionQuestions[], miniPosts[] } }
   ```
2. Create `/app/api/social/route.ts`:
   - Accept `{ blog, seo, platforms }`
   - Call Claude with social prompt (request JSON response)
   - Save each platform output to `content_assets` with its `asset_type`
   - Return full social object
3. Create `/app/api/social/regenerate/route.ts`:
   - Accept `{ platform, blog, seo }` — regenerates a single platform
4. Create platform panel components in `/components/sections/`:
   - `XPanel.tsx` — tweet card + numbered thread + hooks + reply chains
   - `LinkedInPanel.tsx` — storytelling + authority + carousel text tabs
   - `InstagramPanel.tsx` — carousel captions list + reel caption + hooks + CTA
   - `MediumPanel.tsx` — article preview + canonical link suggestion
   - `RedditPanel.tsx` — post preview + subreddit chips + engagement questions
   - `NewsletterPanel.tsx` — subject lines list + email body + CTA
   - `PinterestPanel.tsx` — pin cards (title + description + keyword tags)
5. Each panel: Copy / Edit (inline textarea) / Regenerate buttons per content block

## Acceptance Criteria
- `POST /api/social` returns structured JSON with all 8 platform outputs in one Claude call
- Each platform panel renders content with Copy / Edit / Regenerate per block
- X: viral tweet + thread + hooks + reply chains
- LinkedIn: storytelling + authority + carousel text
- Instagram: carousel captions + reel caption + hooks + CTA
- Medium: reformatted article + canonical link suggestion
- Reddit: discussion post + subreddit suggestions + engagement questions
- Newsletter: subject lines + email body + CTA
- Pinterest: pin titles + descriptions + keywords
- All results saved to `content_assets` with respective `asset_type`

## Key Patterns
[greenfield — no existing files to reference]

## Handoff
- Completed: [ ]
- Next task: task-010.md
- Notes: ___
