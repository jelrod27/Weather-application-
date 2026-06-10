-- Authentication Performance Optimization - Database Indexes
-- Date: 2025-01-03
-- Purpose: Add composite indexes to improve auth query performance

-- ============================================================================
-- COMPOSITE INDEXES FOR FASTER QUERIES
-- ============================================================================

-- Index for user preferences lookups (most common query)
-- Improves: SELECT * FROM user_preferences WHERE user_id = ? AND theme = ?
CREATE INDEX IF NOT EXISTS idx_user_preferences_user_theme
ON user_preferences(user_id, theme);

-- Index for user preferences by user (ensures fast single-user lookups)
CREATE INDEX IF NOT EXISTS idx_user_preferences_user_id
ON user_preferences(user_id);

-- ============================================================================
-- SAVED LOCATIONS INDEXES
-- ============================================================================

-- Composite index for favorite locations sorting
-- Improves: SELECT * FROM saved_locations WHERE user_id = ? ORDER BY is_favorite DESC
CREATE INDEX IF NOT EXISTS idx_saved_locations_user_favorite
ON saved_locations(user_id, is_favorite DESC, created_at DESC);

-- Index for location searches
-- Improves: SELECT * FROM saved_locations WHERE user_id = ? AND location_name ILIKE ?
CREATE INDEX IF NOT EXISTS idx_saved_locations_search
ON saved_locations(user_id, location_name text_pattern_ops);

-- Index for city searches
CREATE INDEX IF NOT EXISTS idx_saved_locations_city_search
ON saved_locations(user_id, city text_pattern_ops);

-- Composite index for updated_at sorting (common query pattern)
CREATE INDEX IF NOT EXISTS idx_saved_locations_user_updated
ON saved_locations(user_id, updated_at DESC);

-- ============================================================================
-- PROFILES INDEXES
-- ============================================================================

-- Username lookup index (for username availability checks)
-- Note: This might already exist as a unique constraint
CREATE INDEX IF NOT EXISTS idx_profiles_username
ON profiles(username);

-- Email lookup index (for email searches and validation)
CREATE INDEX IF NOT EXISTS idx_profiles_email
ON profiles(email);

-- ============================================================================
-- QUERY PERFORMANCE HINTS
-- ============================================================================

-- Analyze tables to update statistics for query planner
ANALYZE profiles;
ANALYZE user_preferences;
ANALYZE saved_locations;

-- ============================================================================
-- INDEX USAGE VERIFICATION
-- ============================================================================

-- To verify indexes are being used, run these queries:
--
-- EXPLAIN ANALYZE SELECT * FROM user_preferences WHERE user_id = 'some-uuid';
-- EXPLAIN ANALYZE SELECT * FROM saved_locations WHERE user_id = 'some-uuid' ORDER BY is_favorite DESC;
-- EXPLAIN ANALYZE SELECT * FROM profiles WHERE username = 'testuser';
--
-- Look for "Index Scan" instead of "Seq Scan" in the output

-- ============================================================================
-- MAINTENANCE RECOMMENDATIONS
-- ============================================================================

-- Run VACUUM ANALYZE periodically to maintain index health
-- VACUUM ANALYZE profiles;
-- VACUUM ANALYZE user_preferences;
-- VACUUM ANALYZE saved_locations;

-- Monitor index usage with:
-- SELECT schemaname, tablename, indexname, idx_scan, idx_tup_read, idx_tup_fetch
-- FROM pg_stat_user_indexes
-- WHERE schemaname = 'public'
-- ORDER BY idx_scan DESC;

-- Check for unused indexes (idx_scan = 0 after some time):
-- SELECT schemaname, tablename, indexname
-- FROM pg_stat_user_indexes
-- WHERE schemaname = 'public' AND idx_scan = 0;
