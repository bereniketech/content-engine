# Requirements: Distribution & Analytics

## Introduction

The distribution-and-analytics feature closes the automation loop for the content-engine. Content is already generated (articles, social copy, newsletters); this feature adds the ability to publish that content directly to platforms, schedule future posts, view real performance analytics from GA4 and Search Console, and trigger content refreshes when ranking drops are detected.

---

## Requirement 1: Social API Publishing

**User Story:** As a content creator, I want to publish generated social posts directly to X, LinkedIn, Instagram, and Reddit from the dashboard, so that I do not have to copy-paste content into each platform manually.

### Acceptance Criteria

1. WHEN a user clicks "Publish to X" on a generated tweet THEN the system SHALL post the content via Twitter API v2 using stored OAuth 1.0a credentials and return the tweet URL.
2. WHEN a user clicks "Publish Thread to X" THEN the system SHALL post all tweets in sequence as a thread and return the root tweet URL.
3. WHEN a user clicks "Publish to LinkedIn" THEN the system SHALL post the content as a LinkedIn Share via Share API v2 and return the post URL.
4. WHEN a user clicks "Publish to Instagram" THEN the system SHALL upload the image and caption via the Instagram Graph API (2-step: container → publish) and return the media URL.
5. WHEN a user clicks "Publish to Reddit" THEN the system SHALL submit the post to the selected subreddit via Reddit OAuth2 and return the post URL.
6. WHEN any platform API call fails THEN the system SHALL return the platform error message, log the failure to distribution_logs, and NOT mark the post as published.
7. WHEN a post is successfully published THEN the system SHALL log the result (platform, post_url, session_id, published_at) to distribution_logs.
8. IF a platform API rate limit is hit THEN the system SHALL respond with HTTP 429 and include the retry-after time in seconds.

---

## Requirement 2: Email Newsletter Delivery

**User Story:** As a content creator, I want to send a generated newsletter draft directly to my Mailchimp audience or via SendGrid, so that I do not have to copy the content into an email tool manually.

### Acceptance Criteria

1. WHEN a user clicks "Send via Mailchimp" THEN the system SHALL create a campaign in Mailchimp, set the content from the Supabase draft, and send it to the configured audience, returning the campaign ID.
2. WHEN a user clicks "Send via SendGrid" THEN the system SHALL send a transactional email using the SendGrid API with the newsletter HTML as the body.
3. WHEN the newsletter draft is empty THEN the system SHALL return HTTP 400 with { error: "Newsletter draft is empty" }.
4. WHEN the email is sent successfully THEN the system SHALL log the result (provider, campaign_id or message_id, session_id, sent_at) to distribution_logs.
5. IF the Mailchimp API key is invalid THEN the system SHALL return HTTP 502 with { error: "Mailchimp authentication failed" }.

---

## Requirement 3: Content Calendar Scheduling

**User Story:** As a content creator, I want to schedule social posts and newsletters for future publishing, so that I can plan a week of content in one session and have it published automatically.

### Acceptance Criteria

1. WHEN a user sets a scheduled time and clicks "Schedule Post" THEN the system SHALL insert a record into scheduled_posts with status "pending" and return the scheduled post ID.
2. WHEN the scheduled time is in the past THEN the system SHALL return HTTP 400 with { error: "Scheduled time must be in the future" }.
3. WHEN a scheduled post's publish time is reached THEN the cron worker SHALL call the appropriate platform publish function and update scheduled_posts.status to "published" or "failed".
4. WHEN a user cancels a scheduled post THEN the system SHALL update scheduled_posts.status to "cancelled".
5. WHEN a user views the calendar THEN the system SHALL display all pending and published scheduled posts for the current month with platform badges.
6. The system SHALL process the scheduled_posts queue every 5 minutes via a Next.js cron route.

---

## Requirement 4: Analytics Dashboard

**User Story:** As a content creator, I want to see real traffic and ranking data from GA4 and Search Console in the dashboard, so that I can understand which content is performing.

### Acceptance Criteria

1. WHEN a user opens the Analytics page THEN the system SHALL display sessions, page views, bounce rate, and avg session duration from GA4 for the last 30 days.
2. WHEN a user opens the Analytics page THEN the system SHALL display total impressions, clicks, avg CTR, and avg position from Search Console for the last 30 days.
3. WHEN analytics data is fetched THEN the system SHALL cache the response in analytics_snapshots for 24 hours before re-fetching from Google APIs.
4. WHEN GA4 credentials are missing THEN the system SHALL return HTTP 502 with { error: "GA4 authentication failed" } and display a setup prompt in the UI.
5. WHEN analytics data is loading THEN the system SHALL display skeleton loaders for each metric card.

---

## Requirement 5: Content Refresh Feedback Loop

**User Story:** As a content creator, I want the system to detect when a published article's search ranking drops and automatically suggest a content refresh, so that I can maintain SEO performance.

### Acceptance Criteria

1. WHEN the cron worker runs THEN the system SHALL compare the current Search Console position for each tracked URL against the previous snapshot and flag URLs where position has worsened by 5 or more positions.
2. WHEN a ranking drop is detected THEN the system SHALL insert a record into refresh_triggers with status "pending" and the affected URL plus position delta.
3. WHEN a user views the dashboard THEN the system SHALL display a banner listing all pending refresh triggers with a "Refresh Now" CTA.
4. WHEN a user clicks "Refresh Now" THEN the system SHALL re-run the content generation pipeline for that URL's topic and mark the refresh_trigger as "resolved".
5. WHEN no ranking drops are detected THEN the system SHALL NOT insert any refresh_triggers records.
