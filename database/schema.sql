-- ============================================================
-- DriftIQ Complete Database Schema + Migration
-- Run this ENTIRE FILE in Supabase SQL Editor
-- It is idempotent — safe to re-run
-- ============================================================

-- STEP 1: Enable extensions
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- STEP 2: Tables
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  username VARCHAR(100) UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  full_name VARCHAR(255),
  avatar_url TEXT,
  role VARCHAR(20) DEFAULT 'user' CHECK (role IN ('user', 'admin')),
  storage_limit BIGINT DEFAULT 5368709120,
  storage_used BIGINT DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  telegram_user_id VARCHAR(100) UNIQUE,
  telegram_status VARCHAR(20) DEFAULT 'disconnected',
  refresh_token TEXT,
  password_reset_token TEXT,
  last_login TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Migration: ensure TEXT columns (expand from VARCHAR(255) if table already exists)
DO $$ BEGIN
  ALTER TABLE users ALTER COLUMN password_hash TYPE TEXT;
EXCEPTION WHEN others THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE users ALTER COLUMN refresh_token TYPE TEXT;
EXCEPTION WHEN others THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE users ALTER COLUMN password_reset_token TYPE TEXT;
EXCEPTION WHEN others THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS folders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  parent_id UUID REFERENCES folders(id) ON DELETE CASCADE,
  color VARCHAR(7),
  is_deleted BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  folder_id UUID REFERENCES folders(id) ON DELETE SET NULL,
  name VARCHAR(255) NOT NULL,
  mime_type VARCHAR(100),
  size BIGINT NOT NULL DEFAULT 0,
  telegram_file_id TEXT NOT NULL,
  is_starred BOOLEAN DEFAULT false,
  is_deleted BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Migration: expand telegram_file_id column
DO $$ BEGIN
  ALTER TABLE files ALTER COLUMN telegram_file_id TYPE TEXT;
EXCEPTION WHEN others THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS shares (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  file_id UUID NOT NULL REFERENCES files(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  share_token TEXT UNIQUE NOT NULL,
  password_hash TEXT,
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

CREATE TABLE IF NOT EXISTS storage_stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  total_files INTEGER DEFAULT 0,
  total_size BIGINT DEFAULT 0,
  total_shares INTEGER DEFAULT 0,
  last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- STEP 3: updated_at triggers
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$ BEGIN
  CREATE TRIGGER trigger_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TRIGGER trigger_files_updated_at BEFORE UPDATE ON files FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TRIGGER trigger_folders_updated_at BEFORE UPDATE ON folders FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TRIGGER trigger_shares_updated_at BEFORE UPDATE ON shares FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- STEP 4: Indexes
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_telegram_user_id ON users(telegram_user_id);
CREATE INDEX IF NOT EXISTS idx_files_user_id ON files(user_id);
CREATE INDEX IF NOT EXISTS idx_files_folder_id ON files(folder_id);
CREATE INDEX IF NOT EXISTS idx_files_is_deleted ON files(is_deleted);
CREATE INDEX IF NOT EXISTS idx_folders_user_id ON folders(user_id);
CREATE INDEX IF NOT EXISTS idx_folders_parent_id ON folders(parent_id);
CREATE INDEX IF NOT EXISTS idx_shares_share_token ON shares(share_token);
CREATE INDEX IF NOT EXISTS idx_shares_user_id ON shares(user_id);
CREATE INDEX IF NOT EXISTS idx_downloads_share_id ON downloads(share_id);

-- STEP 5: RPC Functions
CREATE OR REPLACE FUNCTION increment_download_count(share_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE shares
  SET download_count = COALESCE(download_count, 0) + 1
  WHERE id = share_id;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION get_total_storage_used()
RETURNS BIGINT AS $$
DECLARE
  total BIGINT;
BEGIN
  SELECT SUM(storage_used) INTO total FROM users;
  RETURN COALESCE(total, 0);
END;
$$ LANGUAGE plpgsql;

-- STEP 6: Row Level Security (RLS)
-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE files ENABLE ROW LEVEL SECURITY;
ALTER TABLE folders ENABLE ROW LEVEL SECURITY;
ALTER TABLE shares ENABLE ROW LEVEL SECURITY;
ALTER TABLE downloads ENABLE ROW LEVEL SECURITY;

-- The NestJS backend uses the SERVICE_ROLE_KEY which bypasses RLS entirely.
-- These policies protect direct Supabase client access.
-- Service role bypasses all policies.

-- Allow service role full access (NestJS backend)
CREATE POLICY "service_role_all_users" ON users FOR ALL TO service_role USING (true);
CREATE POLICY "service_role_all_files" ON files FOR ALL TO service_role USING (true);
CREATE POLICY "service_role_all_folders" ON folders FOR ALL TO service_role USING (true);
CREATE POLICY "service_role_all_shares" ON shares FOR ALL TO service_role USING (true);
CREATE POLICY "service_role_all_downloads" ON downloads FOR ALL TO service_role USING (true);

SELECT 'DriftIQ V3 database setup complete!' AS status;
