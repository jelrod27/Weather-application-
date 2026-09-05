-- daybreak is a first-class theme in THEME_LIST and the platform default,
-- but the 20260509 CHECK never listed it. Saving theme=daybreak fails with
-- user_preferences_theme_check (Sentry 16BIT-WEATHER-WEB-6).

ALTER TABLE public.user_preferences
  DROP CONSTRAINT IF EXISTS user_preferences_theme_check;

ALTER TABLE public.user_preferences
  ADD CONSTRAINT user_preferences_theme_check
  CHECK (theme IN ('nord','daybreak','synthwave84','dracula','cyberpunk','matrix'));
