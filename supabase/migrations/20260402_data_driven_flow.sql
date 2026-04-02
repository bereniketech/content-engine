-- Migration: Add 'data-driven' to sessions.input_type constraint
-- Description: Extends the check constraint on sessions.input_type to allow 'data-driven' as a new input type

ALTER TABLE public.sessions DROP CONSTRAINT sessions_input_type_check;

ALTER TABLE public.sessions ADD CONSTRAINT sessions_input_type_check CHECK (input_type IN ('topic', 'upload', 'data-driven'));
