-- Run this in Supabase SQL Editor to apply new DriftIQ updates
-- 1. Add Telegram Link Code Columns
DO $$ BEGIN
ALTER TABLE users
ADD COLUMN telegram_link_code VARCHAR(6);
EXCEPTION
WHEN duplicate_column THEN NULL;
END $$;
DO $$ BEGIN
ALTER TABLE users
ADD COLUMN telegram_link_code_expires_at TIMESTAMP WITH TIME ZONE;
EXCEPTION
WHEN duplicate_column THEN NULL;
END $$;
-- 2. Add Storage RPC
CREATE OR REPLACE FUNCTION increment_storage_used(user_id UUID, bytes BIGINT) RETURNS void AS $$
UPDATE users
SET storage_used = storage_used + bytes
WHERE id = user_id;
$$ LANGUAGE sql SECURITY DEFINER;
SELECT 'Migration complete' AS status;