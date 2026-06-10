-- AI Weather Chat Tables
-- Run this in Supabase SQL Editor

-- Table: chat_rate_limits
-- Tracks per-user rate limiting for AI chat (15 queries per hour)
CREATE TABLE IF NOT EXISTS chat_rate_limits (
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  window_start TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  query_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE chat_rate_limits ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see their own rate limit
CREATE POLICY "Users can view own rate limit"
  ON chat_rate_limits
  FOR SELECT
  USING (auth.uid() = user_id);

-- Table: chat_messages
-- Stores chat history for logged-in users
CREATE TABLE IF NOT EXISTS chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for efficient user message retrieval
CREATE INDEX IF NOT EXISTS idx_chat_messages_user_created 
  ON chat_messages(user_id, created_at DESC);

-- Enable RLS
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see their own messages
CREATE POLICY "Users can view own messages"
  ON chat_messages
  FOR SELECT
  USING (auth.uid() = user_id);

-- Policy: Users can insert their own messages (via service role only)
-- Note: Inserts are done via service role key, so no insert policy needed for users

-- Grant service role full access (for the API routes)
GRANT ALL ON chat_rate_limits TO service_role;
GRANT ALL ON chat_messages TO service_role;
