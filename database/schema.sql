-- ============================================================
-- DriftIQ Database Fix Script
-- Run this in Supabase SQL Editor (supabase.com → SQL Editor)
-- ============================================================

-- STEP 1: Make sure storage_stats table exists with correct schema
CREATE TABLE IF NOT EXISTS storage_stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  total_files INTEGER DEFAULT 0,
  total_size BIGINT DEFAULT 0,
  total_shares INTEGER DEFAULT 0,
  last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_storage_stats_user_id ON storage_stats(user_id);

-- STEP 2: Make sure all required tables exist
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  username VARCHAR(100) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  full_name VARCHAR(255),
  avatar_url TEXT,
  role VARCHAR(20) DEFAULT 'user',
  storage_limit BIGINT DEFAULT 5368709120,
  storage_used BIGINT DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  telegram_status VARCHAR(20) DEFAULT 'disconnected',
  last_login TIMESTAMP WITH TIME ZONE,
  password_reset_token VARCHAR(255),
  password_reset_expires TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  deleted_at TIMESTAMP WITH TIME ZONE
);

CREATE TABLE IF NOT EXISTS folders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  parent_id UUID REFERENCES folders(id) ON DELETE CASCADE,
  description TEXT,
  color VARCHAR(7),
  is_public BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  deleted_at TIMESTAMP WITH TIME ZONE
);

CREATE TABLE IF NOT EXISTS files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  folder_id UUID REFERENCES folders(id) ON DELETE SET NULL,
  name VARCHAR(255) NOT NULL,
  original_name VARCHAR(255),
  mime_type VARCHAR(100),
  size BIGINT NOT NULL DEFAULT 0,
  file_hash VARCHAR(64),
  telegram_message_id VARCHAR(255),
  telegram_file_id VARCHAR(255),
  is_starred BOOLEAN DEFAULT false,
  description TEXT,
  tags TEXT[],
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  deleted_at TIMESTAMP WITH TIME ZONE
);

CREATE TABLE IF NOT EXISTS shares (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  file_id UUID NOT NULL REFERENCES files(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  share_token VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255),
  expires_at TIMESTAMP WITH TIME ZONE,
  download_limit INTEGER,
  download_count INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS downloads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  share_id UUID REFERENCES shares(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  ip_address VARCHAR(45),
  user_agent TEXT,
  downloaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token VARCHAR(500) UNIQUE NOT NULL,
  ip_address VARCHAR(45),
  user_agent TEXT,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  revoked_at TIMESTAMP WITH TIME ZONE
);

CREATE TABLE IF NOT EXISTS admin_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID REFERENCES users(id) ON DELETE SET NULL,
  action VARCHAR(100) NOT NULL,
  target_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  target_file_id UUID REFERENCES files(id) ON DELETE SET NULL,
  description TEXT,
  metadata JSONB,
  ip_address VARCHAR(45),
  status VARCHAR(20),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- STEP 3: Enable RLS on all tables (safe to run even if already enabled)
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE storage_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE folders ENABLE ROW LEVEL SECURITY;
ALTER TABLE files ENABLE ROW LEVEL SECURITY;
ALTER TABLE shares ENABLE ROW LEVEL SECURITY;
ALTER TABLE downloads ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_logs ENABLE ROW LEVEL SECURITY;

-- STEP 4: Drop old conflicting RLS policies (ignore errors if they don't exist)
DO $$ BEGIN
  DROP POLICY IF EXISTS "users_select_own" ON users;
  DROP POLICY IF EXISTS "users_update_own" ON users;
  DROP POLICY IF EXISTS "users_insert" ON users;
  DROP POLICY IF EXISTS "folders_select_own" ON folders;
  DROP POLICY IF EXISTS "folders_insert_own" ON folders;
  DROP POLICY IF EXISTS "folders_update_own" ON folders;
  DROP POLICY IF EXISTS "folders_delete_own" ON folders;
  DROP POLICY IF EXISTS "files_select_own" ON files;
  DROP POLICY IF EXISTS "files_insert_own" ON files;
  DROP POLICY IF EXISTS "files_update_own" ON files;
  DROP POLICY IF EXISTS "files_delete_own" ON files;
  DROP POLICY IF EXISTS "shares_select_own" ON shares;
  DROP POLICY IF EXISTS "shares_insert_own" ON shares;
  DROP POLICY IF EXISTS "shares_update_own" ON shares;
  DROP POLICY IF EXISTS "shares_delete_own" ON shares;
  DROP POLICY IF EXISTS "sessions_select_own" ON sessions;
  DROP POLICY IF EXISTS "telegram_select_own" ON telegram_accounts;
  DROP POLICY IF EXISTS "telegram_insert_own" ON telegram_accounts;
  DROP POLICY IF EXISTS "telegram_update_own" ON telegram_accounts;
  DROP POLICY IF EXISTS "admin_logs_admin_only" ON admin_logs;
  DROP POLICY IF EXISTS "storage_stats_own" ON storage_stats;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- STEP 5: Create permissive policies that allow service role to do everything.
-- The backend uses the service role key which bypasses RLS entirely.
-- These policies are for safety/documentation only.

-- Allow service role full access (it bypasses RLS anyway)
-- Allow anon read on shares for public share links
CREATE POLICY "allow_anon_shares_public" ON shares
  FOR SELECT USING (is_active = true);

CREATE POLICY "allow_anon_downloads_insert" ON downloads
  FOR INSERT WITH CHECK (true);

-- STEP 6: Create updated_at triggers
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$ BEGIN
  CREATE TRIGGER trigger_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TRIGGER trigger_files_updated_at
    BEFORE UPDATE ON files
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TRIGGER trigger_folders_updated_at
    BEFORE UPDATE ON folders
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- STEP 7: Create indexes (IF NOT EXISTS)
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_files_user_id ON files(user_id);
CREATE INDEX IF NOT EXISTS idx_files_folder_id ON files(folder_id);
CREATE INDEX IF NOT EXISTS idx_files_created_at ON files(created_at);
CREATE INDEX IF NOT EXISTS idx_files_telegram_id ON files(telegram_message_id);
CREATE INDEX IF NOT EXISTS idx_folders_user_id ON folders(user_id);
CREATE INDEX IF NOT EXISTS idx_folders_parent_id ON folders(parent_id);
CREATE INDEX IF NOT EXISTS idx_shares_share_token ON shares(share_token);
CREATE INDEX IF NOT EXISTS idx_shares_user_id ON shares(user_id);
CREATE INDEX IF NOT EXISTS idx_downloads_share_id ON downloads(share_id);

-- Done! Your DriftIQ database is ready.
SELECT 'DriftIQ database setup complete!' AS status;
