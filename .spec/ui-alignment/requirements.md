# Requirements: UI Alignment

## Introduction

The UI Alignment feature aligns the existing Next.js 14 dashboard to match the Lumina AI / Content Studio design prototype. The current codebase uses a dark navy sidebar with generic Tailwind classes and blue primary colours; the design prototype defines a light-teal theme with a white sidebar, Inter typography, teal primary (#00694C), and a tiered border-radius system. The target users are content marketers who use the dashboard daily — the visual change must deliver the "Intelligent Clarity" brand experience described in DESIGN.md without breaking any existing functionality.

---

## Requirements

### Requirement 1: Design Token System

**User Story:** As a developer, I want a single source-of-truth for all design tokens (colours, typography, spacing, shadows, radii), so that every component is themed consistently and future updates require editing one file.

#### Acceptance Criteria

1. WHEN the app loads THEN the system SHALL apply CSS custom properties matching the Lumina AI token set defined in `design_idea/content-engine/theme.jsx`.
2. WHEN a developer uses `bg-background` THEN the system SHALL resolve to `#f5fbf5` (teal-tinted off-white).
3. WHEN a developer uses `text-foreground` THEN the system SHALL resolve to `#171d1a` (warm dark).
4. WHEN a developer uses `text-primary` THEN the system SHALL resolve to `#00694C` (deep teal).
5. WHEN a developer uses `text-secondary` THEN the system SHALL resolve to `#0060A8` (confidence blue).
6. WHEN a developer uses `bg-card` THEN the system SHALL resolve to `#ffffff` (white surface).
7. WHEN a developer uses `bg-sidebar` THEN the system SHALL resolve to `#f8faf8`.
8. WHEN a developer uses `rounded-sm`, `rounded-md`, `rounded-lg`, `rounded-xl` THEN the system SHALL resolve to 8px, 12px, 16px, 24px respectively.
9. The system SHALL expose shadow tokens `shadow-sm`, `shadow-md`, `shadow-lg` tinted with `rgba(0,60,40,0.06/0.08/0.12)`.
10. WHEN the Inter font is not available THEN the system SHALL fall back to `-apple-system, system-ui, sans-serif`.

---

### Requirement 2: Sidebar Redesign

**User Story:** As a user, I want the sidebar to match the prototype's light teal design with grouped navigation sections, collapsible behaviour, and a "New Project" CTA button, so that navigation is familiar and consistent with the brand.

#### Acceptance Criteria

1. WHEN the sidebar renders THEN the system SHALL display with `width: 248px`, `background: #f8faf8`, and `border-right: 1px solid #e2e8e4`.
2. WHEN the sidebar renders THEN the system SHALL show a brand card at the top with the app name "Content Studio" and "Pro Plan" subtitle inside a white card with `border-radius: 12px`.
3. WHEN the sidebar renders THEN the system SHALL show a teal primary "New Project" button below the brand card that navigates to `/dashboard/new-session`.
4. WHEN the sidebar renders THEN the system SHALL group navigation items into three sections: main items (Hub, Research, SEO, Blog, Images), Distribute (X/Twitter, LinkedIn, Instagram, Newsletter, Medium), and Manage (Calendar, Analytics, Library, Brand Voice).
5. WHEN a nav item is active THEN the system SHALL highlight it with `background: rgba(0,105,76,0.08)`, `color: #00694C`, `font-weight: 600`, and a `3px solid #00694C` left border.
6. WHEN a nav item is hovered THEN the system SHALL apply `background: #e4eae4` transition within 120ms.
7. WHEN the sidebar is collapsed THEN the system SHALL reduce to `width: 60px` showing only icons.
8. WHEN the sidebar is collapsed THEN the system SHALL replace section title text with a horizontal divider line.
9. WHEN the sidebar renders THEN the system SHALL show Help and Logout items in the footer section separated by a border-top.
10. IF the viewport is below 768px THEN the system SHALL use the existing mobile hamburger overlay pattern, styled with the new light theme.

---

### Requirement 3: Dashboard Layout

**User Story:** As a user, I want the dashboard shell (layout, top bar, main content area) to use the Lumina AI light theme, so that the page background and spacing match the design prototype.

#### Acceptance Criteria

1. WHEN the dashboard layout renders THEN the system SHALL apply `background: #f5fbf5` to the page root.
2. WHEN the dashboard layout renders THEN the system SHALL show a top header bar with `height: 56px`, `background: #ffffff`, and `border-bottom: 1px solid #e2e8e4`.
3. WHEN the main content area renders THEN the system SHALL apply `padding: 32px 40px` on desktop and `padding: 24px` on mobile.
4. WHEN the dashboard header renders THEN the system SHALL display the current page title in the header using Inter at `font-size: 14px`, `font-weight: 600`.

---

### Requirement 4: Hub (Dashboard Home) Screen

**User Story:** As a user, I want the dashboard home screen to show the "Content Studio Hub" heading, a 4-column stat bento grid, quick action buttons, recent sessions list, and an AI Insight bar, so that I have a real-time pipeline overview matching the prototype.

#### Acceptance Criteria

1. WHEN the hub screen renders THEN the system SHALL display the page heading "Content Studio Hub" at `font-size: 32px`, `font-weight: 700`, `letter-spacing: -0.02em`.
2. WHEN the hub screen renders THEN the system SHALL display 4 stat cards in a responsive grid (4 columns desktop, 2 columns tablet, 1 column mobile) with white card surfaces, `border-radius: 16px`, and teal/blue icon accents.
3. WHEN the hub screen renders THEN the system SHALL display 4 quick action buttons (New from Topic, Upload Article, Repurpose URL, Data Pipeline) as secondary-style pill buttons in a horizontal row.
4. WHEN the hub renders THEN the system SHALL display the recent sessions list in a white card with row-level hover states at `#eff5ef`.
5. WHEN a session row has status "published" THEN the system SHALL render a badge with `background: rgba(0,105,76,0.1)`, `color: #00694C`.
6. WHEN a session row has status "review" THEN the system SHALL render a badge with `background: rgba(153,99,0,0.1)`, `color: #996300`.
7. WHEN a session row has status "draft" THEN the system SHALL render a badge with muted grey tones.
8. WHEN a session row has status "scheduled" THEN the system SHALL render a badge with `background: rgba(0,96,168,0.08)`, `color: #0060A8`.
9. WHEN the hub renders THEN the system SHALL display an AI Insight Bar at the bottom with a teal-to-blue gradient background, teal icon circle, and secondary + primary action buttons.

---

### Requirement 5: New Session Screen

**User Story:** As a user, I want the New Session screen to show tabbed input modes (Topic, Upload, URL, Data Pipeline) with styled form fields and a teal primary CTA, so that creating a session feels polished and on-brand.

#### Acceptance Criteria

1. WHEN the new session screen renders THEN the system SHALL display a tab switcher with pill-style tabs in a `background: #eaefea` container, `border-radius: 12px`.
2. WHEN a tab is active THEN the system SHALL highlight it with `background: #ffffff`, `border-radius: 8px`, and a soft shadow.
3. WHEN an input field is focused THEN the system SHALL apply `border-color: #0060A8` and `box-shadow: 0 0 0 3px rgba(0,96,168,0.08)`.
4. WHEN the "Repurpose URL" tab is active THEN the system SHALL show a URL input field.
5. WHEN the "Upload Article" tab is active THEN the system SHALL show a dashed drag-drop zone with `border: 2px dashed #bccac1`, that changes to `#00694C` on hover.
6. WHEN the "Data Pipeline" tab is active THEN the system SHALL show data source cards.
7. WHEN the "Create Session" button renders THEN the system SHALL style it with `background: #00694C`, `width: 100%`, `height: 52px`, `border-radius: 8px`.

---

### Requirement 6: Content Pipeline Screens (Research, SEO, Blog Editor, Images)

**User Story:** As a user, I want the Research, SEO, Blog Editor, and Images screens to use the Lumina AI design system with the pipeline stepper component at the top, so that I can track my content pipeline progress visually.

#### Acceptance Criteria

1. WHEN a pipeline screen renders THEN the system SHALL display the `PipelineStepper` component showing steps: Research → SEO → Write → Images → Distribute.
2. WHEN the current pipeline step is active THEN the system SHALL render its step button with `background: rgba(0,105,76,0.08)`, `color: #00694C`, `font-weight: 600`.
3. WHEN a pipeline step is completed THEN the system SHALL show a checkmark icon and render the connector line in `#00694C`.
4. WHEN the Research screen renders THEN the system SHALL show tab navigation for Keywords, Competitors, and Content Brief tabs with a teal active underline.
5. WHEN the SEO screen renders THEN the system SHALL show a circular SVG score dial (140×140) with teal stroke and score value centered.
6. WHEN the SEO check list renders THEN the system SHALL colour-code rows: pass = teal circle, warn = orange `!` circle, fail = red ×.
7. WHEN the Blog Editor renders THEN the system SHALL show a toolbar row with formatting buttons and a white card textarea with `font-family: Georgia, serif`, `font-size: 15px`, `line-height: 1.75`.
8. WHEN the AI Assist panel is toggled THEN the system SHALL show a side panel with action buttons at `width: 280px`.

---

### Requirement 7: Distribution Screens (Social: X, LinkedIn, Instagram, Newsletter, Medium)

**User Story:** As a user, I want social distribution screens to show the channel tab switcher and post cards with status badges, edit/rewrite/copy actions, so that managing social posts is consistent with the design prototype.

#### Acceptance Criteria

1. WHEN a social distribution screen renders THEN the system SHALL show a horizontal channel filter row with pill buttons for all 5 channels.
2. WHEN the active channel tab is selected THEN the system SHALL apply `background: rgba(0,105,76,0.08)`, `color: #00694C` to that pill.
3. WHEN a post card renders THEN the system SHALL use the card pattern with `border-radius: 16px`, `box-shadow: 0 4px 12px rgba(0,60,40,0.08)`, and a status badge in the top-left.
4. WHEN a post card renders THEN the system SHALL show Edit, Rewrite (with teal Sparkles icon), and Copy action buttons at the bottom.
5. WHEN the header renders THEN the system SHALL show "Regenerate" (secondary) and "Schedule All" (primary) buttons.

---

### Requirement 8: Analytics Screen

**User Story:** As a user, I want the Analytics screen to display KPI cards, a bar chart for organic traffic, and circular dial gauges for Joy Index and Trust Factor, so that performance intelligence is presented as in the prototype.

#### Acceptance Criteria

1. WHEN the Analytics screen renders THEN the system SHALL show a page heading "Analytics & Insights" at `font-size: 32px`.
2. WHEN KPI cards render THEN the system SHALL use the 3-column grid layout with white card surfaces and coloured value text.
3. WHEN the organic traffic bar chart renders THEN the system SHALL use bars with `background: linear-gradient(to top, #00694C, #008560)`.
4. WHEN the dial gauges render THEN the system SHALL use SVG circles with teal and blue strokes for Joy Index and Trust Factor.

---

### Requirement 9: Calendar Screen

**User Story:** As a user, I want the Calendar screen to display a monthly calendar grid with content events colour-coded by channel, so that I can see my publishing schedule at a glance.

#### Acceptance Criteria

1. WHEN the Calendar screen renders THEN the system SHALL display a month-view grid with 7 columns (Mon–Sun).
2. WHEN a calendar cell has a content event THEN the system SHALL render it with a coloured left-border chip inside the cell.
3. WHEN a calendar cell is "today" THEN the system SHALL apply `background: rgba(0,105,76,0.08)` and bold the day number in teal.
4. WHEN calendar cells for days outside the current month render THEN the system SHALL apply `opacity: 0.3`.

---

### Requirement 10: Library Screen

**User Story:** As a user, I want the Content Library screen to show a filterable list of articles with status badges and SEO scores, so that I can manage my content inventory.

#### Acceptance Criteria

1. WHEN the Library screen renders THEN the system SHALL show a filter row with pill buttons: all, published, scheduled, review, draft.
2. WHEN a filter is active THEN the system SHALL apply teal primary styling to that pill.
3. WHEN a library row renders THEN the system SHALL show article title, type + date subtitle, status badge, and SEO score in a white card list.
4. WHEN a library row is hovered THEN the system SHALL apply `background: #eff5ef` transition.

---

### Requirement 11: Brand Voice Screen

**User Story:** As a user, I want the Brand Voice screen to display brand profiles as interactive cards with trait badges, so that I can select and manage voice profiles.

#### Acceptance Criteria

1. WHEN the Brand Voice screen renders THEN the system SHALL show brand profile cards in a vertical stack.
2. WHEN a profile card is active THEN the system SHALL apply `border: 1px solid #00694C` and `background: rgba(0,105,76,0.08)` to that card.
3. WHEN trait badges render THEN the system SHALL use `background: #eaefea`, `color: #3d4943`, pill style.
4. WHEN the "+ New Profile" button renders THEN the system SHALL use the teal primary button style.

---

### Requirement 12: Authentication Screen

**User Story:** As a user, I want the login/sign-up screen to match the prototype's centered card layout with Google SSO button, email/password fields, and teal CTA, so that onboarding feels premium.

#### Acceptance Criteria

1. WHEN the auth screen renders THEN the system SHALL display a centered card with `max-width: 420px`, `border-radius: 24px`, `box-shadow: 0 8px 24px rgba(0,60,40,0.12)`.
2. WHEN the auth screen renders THEN the system SHALL show the logo, "Content Studio" heading at `font-size: 26px`, and subtitle "Sign in to your workspace".
3. WHEN the auth screen renders THEN the system SHALL show the "Continue with Google" button with Google logo and standard border style.
4. WHEN the email/password fields are focused THEN the system SHALL apply the blue focus ring (Requirement 5 AC 3).
5. WHEN the "Sign In" button renders THEN the system SHALL use teal primary style with `height: 52px`, `border-radius: 12px`, `font-size: 15px`.

---

### Requirement 13: Responsive Behaviour

**User Story:** As a user accessing the app on mobile, I want all screens to remain usable and readable, so that the interface degrades gracefully on smaller viewports.

#### Acceptance Criteria

1. WHEN the viewport is below 768px THEN the system SHALL stack the stat bento grid from 4 columns to 2 columns.
2. WHEN the viewport is below 640px THEN the system SHALL stack the stat bento grid to 1 column.
3. WHEN the viewport is below 768px THEN the system SHALL hide the sidebar and show the hamburger menu button.
4. WHEN the viewport is below 768px THEN the system SHALL reduce main content padding to `24px`.
5. WHEN the viewport is below 768px THEN the system SHALL stack pipeline screen grids (e.g. SEO 2-col layout) to 1 column.

---

### Requirement 14: No Regression

**User Story:** As a developer, I want all existing API integrations, data flows, session logic, and auth flows to continue working after the visual redesign, so that the UI changes are purely cosmetic.

#### Acceptance Criteria

1. WHEN a user logs in THEN the system SHALL authenticate via Supabase Auth with no functional change.
2. WHEN the dashboard loads THEN the system SHALL fetch and display session history from `/api/sessions` as before.
3. WHEN a new session is created THEN the system SHALL invoke the existing `TopicForm`, `ArticleUpload`, or `DataDrivenForm` components (no functional edits to these components).
4. WHEN any dashboard page is visited THEN the system SHALL pass all existing TypeScript type-checks and Jest/Playwright tests.
5. IF an existing component's props interface is changed THEN the system SHALL update all call sites.

---

## Open Questions

- [OPEN QUESTION: Should the sidebar collapsible state be persisted to localStorage between sessions? **Assumed default: yes, using localStorage key `sidebar-collapsed`.**]
- [OPEN QUESTION: The existing Sidebar.tsx references many more routes than the prototype's 13 screens (e.g. Reddit, Pinterest, Flywheel, Clusters, Workspace, Distribute). Should those extra routes be hidden or kept? **Assumed default: keep all routes, map them to the closest prototype section.**]
- [OPEN QUESTION: The auth screen redesign depends on the app's auth route. Assumed to be at `app/page.tsx` (the root sign-in page) and `app/(auth)/` if it exists. Confirm before implementing Requirement 12.]
