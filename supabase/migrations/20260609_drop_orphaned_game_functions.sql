-- Applied to the live database 2026-06-09 (via MCP; see README.md).
--
-- The games tables were dropped in 20260509_drop_ai_chat_and_games_orphans,
-- but these functions survived. increment_play_count was anon-executable via
-- PostgREST RPC and referenced the dropped public.games table, so calling it
-- always errored (leaking schema detail and generating error noise). Zero
-- code references to either function.

DROP FUNCTION IF EXISTS public.increment_play_count(text);
DROP FUNCTION IF EXISTS public.update_user_game_stats();
