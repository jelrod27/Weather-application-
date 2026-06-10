-- Per-user long-term context for the AI assistant (facts, preferences, location interests).
-- Accessed only via service role from Next.js API routes.

CREATE TABLE IF NOT EXISTS user_ai_memory (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  memory_notes TEXT NOT NULL DEFAULT '',
  recent_locations JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT recent_locations_is_array CHECK (jsonb_typeof(recent_locations) = 'array')
);

CREATE INDEX IF NOT EXISTS idx_user_ai_memory_updated ON user_ai_memory(updated_at DESC);

ALTER TABLE user_ai_memory ENABLE ROW LEVEL SECURITY;

-- No policies for authenticated users: reads/writes go through the API with the service role only.

GRANT ALL ON user_ai_memory TO service_role;
