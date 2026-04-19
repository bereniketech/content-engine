---
task: "009"
feature: distribution-and-analytics
status: COMPLETE
model: haiku
supervisor: software-cto
agent: web-frontend-expert
depends_on: ["004", "005", "006", "007", "008"]
---

# Task 009: PublishButton UI Component

## Skills
- .kit/skills/development/build-website-web-app/SKILL.md

## Agents
- @web-frontend-expert

## Commands
- /verify
- /task-handoff

> Load the skills, agents, and commands listed above before reading anything else.

---

## Objective
Create `components/sections/PublishButton.tsx` — a reusable publish button with idle/loading/success/error states — and wire it into `XPanel`, `LinkedInPanel`, `RedditPanel`, and `NewsletterPanel`.

---

## Files
### Create
| File | Purpose |
|---|---|
| `components/sections/PublishButton.tsx` | Reusable publish button with state machine |

### Modify
| File | What to change |
|---|---|
| `components/sections/XPanel.tsx` | Add PublishButton at bottom with platform='x' |
| `components/sections/LinkedInPanel.tsx` | Add PublishButton with platform='linkedin' |
| `components/sections/RedditPanel.tsx` | Add PublishButton with platform='reddit' |
| `components/sections/NewsletterPanel.tsx` | Add PublishButton for newsletter with provider selector |

---

## Dependencies
```bash
# No new packages — uses existing lucide-react, tailwind, and @supabase/supabase-js

# No new env vars needed for this task (all publish env vars are server-side)
```

---

## API Contracts
This task consumes existing endpoints:
- `POST /api/publish/x` with `{ sessionId, content, contentType }`
- `POST /api/publish/linkedin` with `{ sessionId, content, contentType }`
- `POST /api/publish/reddit` with `{ sessionId, title, body, subreddit }`
- `POST /api/publish/newsletter` with `{ sessionId, provider, subjectLine, body, recipientEmail }`

All requests include `Authorization: Bearer <token>` header (from Supabase session).

---

## Code Templates

### `components/sections/PublishButton.tsx`

```typescript
'use client'

import { useState } from 'react'
import { Check, Loader2, AlertCircle, Send } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { getSupabaseBrowserClient } from '@/lib/supabase'

type PublishState = 'idle' | 'loading' | 'success' | 'error' | 'already_published'

interface PublishButtonProps {
  platform: 'x' | 'linkedin' | 'instagram' | 'reddit' | 'newsletter'
  sessionId: string
  payload: Record<string, unknown>
  label?: string
  onSuccess?: (data: { externalId?: string; campaignId?: string; logId: string }) => void
  onError?: (error: string) => void
}

async function getAuthToken(): Promise<string | null> {
  const supabase = getSupabaseBrowserClient()
  const { data } = await supabase.auth.getSession()
  return data.session?.access_token ?? null
}

export function PublishButton({
  platform,
  sessionId,
  payload,
  label,
  onSuccess,
  onError,
}: PublishButtonProps) {
  const [state, setState] = useState<PublishState>('idle')
  const [errorMessage, setErrorMessage] = useState<string>('')
  const [publishedAt, setPublishedAt] = useState<string>('')

  const endpointMap: Record<string, string> = {
    x: '/api/publish/x',
    linkedin: '/api/publish/linkedin',
    instagram: '/api/publish/instagram',
    reddit: '/api/publish/reddit',
    newsletter: '/api/publish/newsletter',
  }

  const handlePublish = async () => {
    if (state === 'loading') return
    setState('loading')
    setErrorMessage('')

    const token = await getAuthToken()
    if (!token) {
      setState('error')
      setErrorMessage('Not authenticated — please sign in.')
      return
    }

    const endpoint = endpointMap[platform]
    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ sessionId, ...payload }),
      })

      const json = await response.json()

      if (response.status === 409) {
        setState('already_published')
        return
      }

      if (!response.ok) {
        const msg = json?.error?.message ?? `Error ${response.status}`
        setState('error')
        setErrorMessage(msg)
        onError?.(msg)
        return
      }

      setPublishedAt(new Date().toLocaleTimeString())
      setState('success')
      onSuccess?.(json.data)
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Network error'
      setState('error')
      setErrorMessage(msg)
      onError?.(msg)
    }
  }

  const handleRetry = () => {
    setState('idle')
    setErrorMessage('')
  }

  const buttonLabel = label ?? `Post to ${platform === 'x' ? 'X' : platform.charAt(0).toUpperCase() + platform.slice(1)}`

  if (state === 'success') {
    return (
      <div className="flex items-center gap-2 rounded-md border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700">
        <Check className="h-4 w-4 flex-shrink-0" />
        <span>Posted at {publishedAt}</span>
      </div>
    )
  }

  if (state === 'already_published') {
    return (
      <div className="flex items-center gap-2 rounded-md border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700">
        <Check className="h-4 w-4 flex-shrink-0" />
        <span>Already posted</span>
      </div>
    )
  }

  if (state === 'error') {
    return (
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-2 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
          <span className="line-clamp-1">{errorMessage}</span>
        </div>
        <Button type="button" variant="outline" size="sm" onClick={handleRetry}>
          Retry
        </Button>
      </div>
    )
  }

  return (
    <Button
      type="button"
      variant="default"
      size="sm"
      onClick={handlePublish}
      disabled={state === 'loading'}
    >
      {state === 'loading' ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Posting...
        </>
      ) : (
        <>
          <Send className="mr-2 h-4 w-4" />
          {buttonLabel}
        </>
      )}
    </Button>
  )
}
```

---

## Codebase Context

### Key Code Snippets

`getSupabaseBrowserClient()` (from `lib/supabase.ts`):
```typescript
import { createBrowserClient } from "@supabase/ssr";
let browserClient: SupabaseClient | undefined;
export function getSupabaseBrowserClient(): SupabaseClient {
  if (!browserClient) {
    browserClient = createBrowserClient(supabaseUrl!, supabaseAnonKey!);
  }
  return browserClient;
}
```

`useSessionContext` (from `lib/context/SessionContext`) provides `sessionId` and `assets`.

Example of how XPanel currently receives its data (from `XPanel.tsx`):
```typescript
interface XPanelProps {
  data: SocialOutput['x']
  onSaveBlock: (path: string, value: string) => void
  onRegenerateBlock: (path: string) => Promise<void>
  regeneratingPath?: string | null
}
```

Button component exists at `components/ui/button.tsx` — accepts `variant`, `size`, `type`, `disabled`, `onClick`.

### Key Patterns in Use
- All client components use `'use client'` directive
- Supabase browser client from `lib/supabase.ts` → `getSupabaseBrowserClient()`
- Session token from `supabase.auth.getSession()` → `data.session?.access_token`
- `lucide-react` used for all icons: `Check`, `Loader2`, `AlertCircle`
- Tailwind class names for states: `bg-green-50`, `text-green-700`, `border-green-200` for success

### How to add PublishButton to XPanel
At the bottom of the `XPanel` component's JSX, after all `SocialEditableBlock` elements, add:
```typescript
import { PublishButton } from '@/components/sections/PublishButton'
import { useSessionContext } from '@/lib/context/SessionContext'
// In XPanel component body:
const { sessionId } = useSessionContext()
// At bottom of return JSX:
<div className="mt-4 flex justify-end">
  <PublishButton
    platform="x"
    sessionId={sessionId ?? ''}
    payload={{
      content: data.tweet,
      contentType: 'tweet',
    }}
  />
</div>
```

---

## Implementation Steps
1. Create `components/sections/PublishButton.tsx` — paste full component from Code Templates.
2. Modify `components/sections/XPanel.tsx`:
   - Add import: `import { PublishButton } from '@/components/sections/PublishButton'`
   - Add import: `import { useSessionContext } from '@/lib/context/SessionContext'`
   - In component body: `const { sessionId } = useSessionContext()`
   - At bottom of return JSX, inside outer div, add the PublishButton div block.
3. Repeat pattern for `LinkedInPanel.tsx` with `platform="linkedin"`, `payload={{ content: data.storytelling, contentType: 'storytelling' }}`.
4. Repeat for `RedditPanel.tsx` with `platform="reddit"`, `payload={{ title: 'Content from Content Engine', body: data.post, subreddit: data.subreddits?.[0] ?? '' }}`.
5. Repeat for `NewsletterPanel.tsx` with `platform="newsletter"`, `payload={{ provider: 'mailchimp', subjectLine: data.subjectLines?.[0] ?? '', body: data.body }}`.

---

## Test Cases

```typescript
// components/sections/__tests__/PublishButton.test.tsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { PublishButton } from '../PublishButton'

// Mock supabase
jest.mock('@/lib/supabase', () => ({
  getSupabaseBrowserClient: () => ({
    auth: { getSession: async () => ({ data: { session: { access_token: 'test-token' } } }) },
  }),
}))

const mockFetch = jest.spyOn(global, 'fetch')

beforeEach(() => { mockFetch.mockReset() })

it('shows loading state while fetching', async () => {
  mockFetch.mockReturnValueOnce(new Promise(() => {})) // never resolves
  render(<PublishButton platform="x" sessionId="s1" payload={{ content: 'hello', contentType: 'tweet' }} />)
  fireEvent.click(screen.getByRole('button'))
  expect(screen.getByText('Posting...')).toBeInTheDocument()
})

it('shows success state on 201 response', async () => {
  mockFetch.mockResolvedValueOnce({
    ok: true,
    status: 201,
    json: async () => ({ data: { externalId: '123', logId: 'log-1' } }),
  } as any)
  render(<PublishButton platform="x" sessionId="s1" payload={{ content: 'hello', contentType: 'tweet' }} />)
  fireEvent.click(screen.getByRole('button'))
  await waitFor(() => expect(screen.getByText(/Posted at/)).toBeInTheDocument())
})

it('shows already posted on 409', async () => {
  mockFetch.mockResolvedValueOnce({
    ok: false, status: 409,
    json: async () => ({ error: { code: 'already_published', message: 'Already published' } }),
  } as any)
  render(<PublishButton platform="x" sessionId="s1" payload={{ content: 'hello', contentType: 'tweet' }} />)
  fireEvent.click(screen.getByRole('button'))
  await waitFor(() => expect(screen.getByText('Already posted')).toBeInTheDocument())
})

it('shows error message and Retry button on failure', async () => {
  mockFetch.mockResolvedValueOnce({
    ok: false, status: 500,
    json: async () => ({ error: { message: 'Internal server error' } }),
  } as any)
  render(<PublishButton platform="x" sessionId="s1" payload={{ content: 'hello', contentType: 'tweet' }} />)
  fireEvent.click(screen.getByRole('button'))
  await waitFor(() => expect(screen.getByText('Retry')).toBeInTheDocument())
})
```

---

## Decision Rules
| Scenario | Action |
|---|---|
| `sessionId` is empty string | Still render the button; API will return 400 and show error state |
| `state === 'loading'` and button clicked again | Ignore click (disabled + guard in handler) |
| 409 response | Show "Already posted" in success-style state (not error) |

---

## Acceptance Criteria
- [ ] WHEN button clicked, THEN enters loading state with spinner and "Posting..." text
- [ ] WHEN API returns 201, THEN shows green "Posted at {time}" state
- [ ] WHEN API returns 409, THEN shows green "Already posted" state
- [ ] WHEN API returns error, THEN shows error message with Retry button; Retry resets to idle
- [ ] WHEN XPanel renders, THEN PublishButton is present at bottom
- [ ] WHEN LinkedInPanel renders, THEN PublishButton is present at bottom

---

## Handoff to Next Task
**Files changed:** _(fill via /task-handoff)_
**Decisions made:** _(fill via /task-handoff)_
**Context for next task:** task-010 builds schedule POST/DELETE API routes
**Open questions:** _(fill via /task-handoff)_
