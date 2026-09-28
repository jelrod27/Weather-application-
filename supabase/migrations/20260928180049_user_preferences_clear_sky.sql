-- Add Clear Sky without rewriting existing theme selections or changing RLS.
BEGIN;
ALTER TABLE public.user_preferences
  DROP CONSTRAINT IF EXISTS user_preferences_theme_check;
ALTER TABLE public.user_preferences
  ADD CONSTRAINT user_preferences_theme_check
  CHECK (theme IN ('clear-sky','nord','daybreak','synthwave84','dracula','cyberpunk','matrix'));
ALTER TABLE public.user_preferences ALTER COLUMN theme SET DEFAULT 'clear-sky';
COMMIT;
