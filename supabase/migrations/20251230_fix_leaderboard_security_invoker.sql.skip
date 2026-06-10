-- Fix SECURITY DEFINER views to use SECURITY INVOKER
-- This ensures RLS policies of the querying user are enforced, not the view creator

-- Recreate leaderboard_all_time with SECURITY INVOKER
CREATE OR REPLACE VIEW leaderboard_all_time
WITH (security_invoker = true)
AS
SELECT
  gs.id,
  gs.game_id,
  g.slug as game_slug,
  g.title as game_title,
  gs.player_name,
  gs.score,
  gs.level_reached,
  gs.is_guest,
  gs.created_at,
  ROW_NUMBER() OVER (PARTITION BY gs.game_id ORDER BY gs.score DESC, gs.created_at ASC) as rank
FROM game_scores gs
JOIN games g ON gs.game_id = g.id
WHERE g.is_active = true;

-- Recreate leaderboard_daily with SECURITY INVOKER
CREATE OR REPLACE VIEW leaderboard_daily
WITH (security_invoker = true)
AS
SELECT
  gs.id,
  gs.game_id,
  g.slug as game_slug,
  g.title as game_title,
  gs.player_name,
  gs.score,
  gs.level_reached,
  gs.is_guest,
  gs.created_at,
  ROW_NUMBER() OVER (PARTITION BY gs.game_id ORDER BY gs.score DESC, gs.created_at ASC) as rank
FROM game_scores gs
JOIN games g ON gs.game_id = g.id
WHERE g.is_active = true
  AND gs.created_at >= CURRENT_DATE
  AND gs.created_at < CURRENT_DATE + INTERVAL '1 day';

-- Recreate leaderboard_weekly with SECURITY INVOKER
CREATE OR REPLACE VIEW leaderboard_weekly
WITH (security_invoker = true)
AS
SELECT
  gs.id,
  gs.game_id,
  g.slug as game_slug,
  g.title as game_title,
  gs.player_name,
  gs.score,
  gs.level_reached,
  gs.is_guest,
  gs.created_at,
  ROW_NUMBER() OVER (PARTITION BY gs.game_id ORDER BY gs.score DESC, gs.created_at ASC) as rank
FROM game_scores gs
JOIN games g ON gs.game_id = g.id
WHERE g.is_active = true
  AND gs.created_at >= DATE_TRUNC('week', CURRENT_DATE)
  AND gs.created_at < DATE_TRUNC('week', CURRENT_DATE) + INTERVAL '1 week';
