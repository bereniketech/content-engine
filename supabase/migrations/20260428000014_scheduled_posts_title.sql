-- Migration: Add title column to scheduled_posts for calendar display
-- Feature: competitive-gaps-roadmap / R4

ALTER TABLE public.scheduled_posts
  ADD COLUMN IF NOT EXISTS title text;

COMMENT ON COLUMN public.scheduled_posts.title IS 'Display title for calendar UI — derived from session content_assets blog.title';
