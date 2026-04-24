---
name: build-website-web-app
description: Build, design, or generate a website or web app. Use when the user wants to create a landing page, web application, UI component, or clone an existing site. Synthesizes best practices from Lovable, v0, Bolt, Same.dev, Replit, Kiro, Orchids.app, Emergent, Leap.new, and Gemini vibe-coder.
allowed-tools: Read, Write, Edit, Bash, Glob, Grep, WebFetch, WebSearch
---

# Build Website / Web App Skill

Expert web application builder. Apply all of the following best practices when building websites or web apps.

---

## 1. Clarify Before Building

- If the request is vague or a single phrase, ask 1–3 focused questions before writing code.
- If the user pastes a URL, ask: "Do you want to clone this website's UI, or use it as a reference?"
- If the user says "implement", "create", "build", "add", or "generate" — proceed immediately.
- For complex projects, briefly confirm the spec (pages, features, data models) before coding.

---

## 2. Plan First (2–4 Lines)

Before writing code, state a brief plan: what you will build, what stack, key components or pages, and any notable design decisions. Then immediately proceed — do not wait for confirmation unless something is unclear.

---

## 3. Default Tech Stack

Unless the user specifies otherwise:

| Layer | Choice |
|-------|--------|
| Framework | React + Vite |
| Styling | Tailwind CSS |
| Language | TypeScript |
| UI Components | shadcn/ui |
| Package manager | bun (prefer over npm) |
| Backend / Auth / DB | Supabase |
| Deployment | Vercel or Replit hosting |

- Vite dev script: `"dev": "vite --host 0.0.0.0"`
- Next.js dev script: `"dev": "next dev -H 0.0.0.0"`

---

## 4. Design-System-First (Lovable Pattern)

**Rule:** Never write ad-hoc styles in components. Always define the design system first.

Order:
1. Edit `tailwind.config.ts` — custom colors, fonts, animations
2. Edit `index.css` / `globals.css` — CSS variables as HSL values only
3. Only then implement components using those semantic tokens

- NEVER use raw classes like `text-white`, `bg-black`, `text-gray-500` in components
- ALWAYS use semantic tokens: `text-foreground`, `bg-background`, `bg-primary`, `text-muted-foreground`
- Define gradients, shadows, animations as CSS variables

```css
/* index.css design tokens (HSL only) */
:root {
  --primary: 220 90% 56%;
  --primary-foreground: 0 0% 100%;
  --background: 0 0% 100%;
  --foreground: 222 47% 11%;
  --muted: 210 40% 96%;
  --muted-foreground: 215 16% 47%;
  --gradient-hero: linear-gradient(135deg, hsl(var(--primary)), hsl(220 70% 40%));
  --shadow-elegant: 0 10px 30px -10px hsl(var(--primary) / 0.3);
  --transition-smooth: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}
```

- Customize shadcn components by adding variants — never use inline style overrides
- Check both light and dark mode: ensure text is readable in both

---

## 5. React / Next.js Component Patterns

Use composition over inheritance. Prefer compound components for shared state. Use render props for injectable rendering logic.

**Composition pattern:**
```typescript
export function Card({ children, variant = 'default' }: CardProps) {
  return <div className={`card card-${variant}`}>{children}</div>
}
export function CardHeader({ children }: { children: React.ReactNode }) {
  return <div className="card-header">{children}</div>
}
```

**Custom hooks — extract all non-trivial state into hooks:**
```typescript
export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value)
  useEffect(() => {
    const handler = setTimeout(() => setDebouncedValue(value), delay)
    return () => clearTimeout(handler)
  }, [value, delay])
  return debouncedValue
}
```

**Performance:**
- `useMemo` for expensive computations; `useCallback` for functions passed to children; `React.memo` for pure components
- Lazy-load heavy components with `lazy()` + `Suspense`
- Virtualize long lists with `@tanstack/react-virtual`

**Error boundaries:** Wrap subtrees in an `ErrorBoundary` class component to catch render-time errors gracefully.

**Animations:** Use Framer Motion `AnimatePresence` for list/modal enter-exit transitions.

---

## 6. State Management

| Scale | Pattern |
|-------|---------|
| Local UI state | `useState` / `useReducer` |
| Shared page state | Context + Reducer |
| Server state | React Query / SWR |
| Global client state | Zustand |

**Context + Reducer template:**
```typescript
const MarketContext = createContext<{ state: State; dispatch: Dispatch<Action> } | undefined>(undefined)

export function MarketProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState)
  return <MarketContext.Provider value={{ state, dispatch }}>{children}</MarketContext.Provider>
}
```

Use functional state updates (`setCount(prev => prev + 1)`) to avoid stale closures.

---

## 7. Backend — API / Service / Repository Layers

**Rule:** Separate data access from business logic from the HTTP layer.

**Repository pattern** (data access only):
```typescript
interface MarketRepository {
  findAll(filters?: MarketFilters): Promise<Market[]>
  findById(id: string): Promise<Market | null>
  create(data: CreateMarketDto): Promise<Market>
  update(id: string, data: UpdateMarketDto): Promise<Market>
  delete(id: string): Promise<void>
}
```

**Service layer** (business logic, calls repository):
```typescript
class MarketService {
  constructor(private marketRepo: MarketRepository) {}
  async searchMarkets(query: string, limit = 10): Promise<Market[]> { /* … */ }
}
```

**Middleware pattern** (auth, rate limiting, logging):
```typescript
export function withAuth(handler: NextApiHandler): NextApiHandler {
  return async (req, res) => {
    const token = req.headers.authorization?.replace('Bearer ', '')
    if (!token) return res.status(401).json({ error: 'Unauthorized' })
    req.user = await verifyToken(token)
    return handler(req, res)
  }
}
```

**N+1 prevention:** Always batch-fetch related entities with a single query + in-memory map instead of per-row queries.

**Centralized error handler:** Define an `ApiError` class and a single `errorHandler(error, req)` used by all routes. Handle `ZodError` separately for validation failures.

**Retry with exponential backoff:** Wrap all external API calls in `fetchWithRetry(fn, maxRetries=3)`.

**Structured logging:** Emit JSON log entries with `timestamp`, `level`, `message`, and context fields. Never log PII or secrets.

---

## 8. Apple Liquid Glass Design System (iOS 26)

Use when building apps targeting iOS 26+ or when the user requests the Liquid Glass design language.

**SwiftUI — basic glass:**
```swift
Text("Hello")
    .padding()
    .glassEffect(.regular.tint(.orange).interactive(), in: .rect(cornerRadius: 16))
```

**Always wrap multiple glass views in a container:**
```swift
GlassEffectContainer(spacing: 40.0) {
    HStack(spacing: 40.0) {
        Image(systemName: "scribble.variable").frame(width: 80, height: 80).glassEffect()
        Image(systemName: "eraser.fill").frame(width: 80, height: 80).glassEffect()
    }
}
```

**Morphing transitions:** Assign `@Namespace` + `.glassEffectID` on each element; wrap state changes in `withAnimation`.

**UIKit:** Use `UIGlassEffect` inside `UIVisualEffectView`; set `clipsToBounds = true` for corner radii.

**WidgetKit:** Detect `@Environment(\.widgetRenderingMode)` and handle `.accented` mode; use `.widgetAccentable()` for accent groups.

**Rules:**
- Always use `GlassEffectContainer` when applying glass to multiple siblings
- Apply `.glassEffect()` after other appearance modifiers
- Use `.interactive()` only on elements that respond to user interaction
- Test across light, dark, and accented/tinted modes
- Never use opaque backgrounds behind glass — defeats translucency

---

## 9. File & Component Structure

- One component = one file. No monolithic files.
- Keep files under ~200 lines. Extract into hooks or utils when files grow.
- Unique component and file names — no duplicates across the project.
- Always update the root index page — do not leave default templates.

```
src/
  components/     # Reusable UI components
    ui/           # shadcn base components
  pages/          # Route-level components
  hooks/          # Custom React hooks
  lib/            # Utilities, API clients, helpers
    api/          # Repository + service layer
    utils/        # Helper functions
```

---

## 10. SEO Best Practices (Automatic on Every Page)

- **Title tag**: main keyword, under 60 characters
- **Meta description**: max 160 characters, keyword-integrated
- **Single `<h1>`** per page matching primary intent
- **Semantic HTML**: `<header>`, `<main>`, `<footer>`, `<nav>`, `<section>`, `<article>`
- **Images**: descriptive `alt` with keywords; `loading="lazy"` below the fold
- **Structured data**: JSON-LD for products, articles, FAQs when applicable
- **Canonical tags**: prevent duplicate content
- **Responsive**: include viewport meta tag

---

## 11. Database — Supabase Rules

- Always enable **Row Level Security (RLS)** on every table
- Auth: email + password only (no magic links/social unless asked)
- Every schema change = a migration SQL file
- Never use `DROP` or `DELETE` in migrations; use `IF EXISTS` / `IF NOT EXISTS` in all DDL

```sql
CREATE TABLE IF NOT EXISTS posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users NOT NULL,
  title text NOT NULL,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can read own posts"
  ON posts FOR SELECT TO authenticated
  USING (auth.uid() = user_id);
```

---

## 12. Efficiency Rules

- **Parallel tool calls**: read multiple files simultaneously, never sequentially unless required
- **search-replace over full rewrites**: targeted edits preferred
- **Check for existing implementations** before writing new code
- After significant edits, check for TypeScript/lint errors and fix them
- Do not loop more than 3 times on the same error — ask the user instead
- Clean up any temporary files created during iteration

---

## 13. Cloning Existing Websites (Same.dev Pattern)

When the user wants to clone a site:
1. Fetch or screenshot the target site first
2. Identify: color palette, typography, layout grid, spacing, component patterns
3. Aim for pixel-perfect reproduction: backgrounds, gradients, colors, spacing, shadows
4. Replace branding with placeholder content unless user wants it preserved

---

## 14. Images & Assets

- Save provided images locally (`public/images/`) and reference via local paths
- If an image is needed but not provided, generate one — never leave placeholders
- Use descriptive filenames: `hero-background.png` not `image1.png`
- Every image must have descriptive `alt` text

---

## 15. Response Format

- Keep explanations short — no long summaries of what you just did
- No emojis unless the user uses them
- Use Mermaid for architecture or data flow diagrams when helpful
- After completing: 1–2 line summary maximum
- Use toast notifications in the UI to inform users of important events

---

## 16. Deployment Guidance

- **Vercel**: connect GitHub repo or `vercel deploy`
- **Replit**: nudge user to click the Deploy button in the UI
- **Netlify**: `npm run build` then `netlify deploy --prod --dir=dist`
- Always remind the user to set environment variables in the deployment dashboard — never hardcode secrets

---

## 17. Do Not

- Add unrequested features, pages, or components
- Switch frameworks mid-project without asking
- Implement dark/light mode toggle unless explicitly requested
- Leave placeholder images — generate or use real assets
- Write monolithic files
- Skip RLS on any Supabase table
- Hardcode API keys or secrets
- Nest glass effects more than one level deep (UIKit/SwiftUI)
