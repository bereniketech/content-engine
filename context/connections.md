## Seven-Bucket Map

| Bucket | Tool | Status | Access method |
|---|---|---|---|
| Revenue | Supabase (subscriptions table) | documented-only | `lib/supabase/server.ts` pattern |
| Revenue | Razorpay (payments) | documented-only | Razorpay REST API |
| Customer | Supabase (users/profiles) | documented-only | `lib/supabase/server.ts` |
| Customer | PostHog (analytics) | documented-only | PostHog Query API |
| Customer | Google Analytics 4 | documented-only | `lib/analytics/ga4.ts` already wired |
| Calendar | — | — | Run /aios-connect to wire |
| Comms | Gmail | documented-only | Run /aios-connect gmail |
| Comms | GitHub Issues | documented-only | `gh issue list --repo bereniketech/content-engine` |
| Tasks | `.spec/tasks/` | live | Direct file read |
| Tasks | GitHub Issues | documented-only | `gh issue list` |
| Meetings | — | — | Run /aios-connect to wire |
| Knowledge | `docs/` (30+ architecture docs) | live | Direct file read |
| Knowledge | Codebase (`lib/`, `app/`) | live | Direct file read |
| Knowledge | Google Drive | documented-only | Run /aios-connect google-drive |

_Status: `documented-only` · `partial` · `live`_
_Run `/aios-connect <tool>` to wire a live connection._

## Connections Intent

Wire in priority order:
1. **Tasks** — GitHub Issues (gh CLI already available)
2. **Comms** — Gmail (google-calendar-automation skill pattern in claude_kit)
3. **Customer** — Google Analytics 4 (`lib/analytics/ga4.ts` already coded — expose as AIOS read call)
4. **Revenue** — Supabase subscriptions (read-only service role key)
5. **Knowledge** — Google Drive

## Cadence Intent

_Run /aios-onboard Q7 to fill this in._
