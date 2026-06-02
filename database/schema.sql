-- DriftIQ Production Database Schema
-- Run this SQL in Supabase SQL Editor to create all tables

-- Drop existing tables (careful in production!)
-- DROP TABLE IF EXISTS admin_logs CASCADE;
-- DROP TABLE IF EXISTS storage_stats CASCADE;
-- DROP TABLE IF EXISTS downloads CASCADE;
-- DROP TABLE IF EXISTS shares CASCADE;
-- DROP TABLE IF EXISTS files CASCADE;
-- DROP TABLE IF EXISTS folders CASCADE;
-- DROP TABLE IF EXISTS telegram_accounts CASCADE;
-- DROP TABLE IF EXISTS sessions CASCADE;
-- DROP TABLE IF EXISTS users CASCADE;

-- ============================================
-- USERS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  username VARCHAR(100) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  full_name VARCHAR(255),
  avatar_url TEXT,
  role VARCHAR(20) DEFAULT 'user', -- 'user' or 'admin'
  storage_limit BIGINT DEFAULT 5368709120, -- 5GB
  storage_used BIGINT DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  telegram_status VARCHAR(20) DEFAULT 'disconnected', -- 'connected', 'disconnected'
  last_login TIMESTAMP WITH TIME ZONE,
  password_reset_token VARCHAR(255),
  password_reset_expires TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  deleted_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_is_active ON users(is_active);

-- ============================================
-- TELEGRAM ACCOUNTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS telegram_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  bot_token VARCHAR(255) NOT NULL,
  channel_id VARCHAR(100) NOT NULL,
  is_connected BOOLEAN DEFAULT false,
  connection_token VARCHAR(255),
  expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_telegram_user_id ON telegram_accounts(user_id);
CREATE INDEX idx_telegram_connected ON telegram_accounts(is_connected);

-- ============================================
-- FOLDERS TABLE
-- ============================================
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
  deleted_at TIMESTAMP WITH TIME ZONE,
  CONSTRAINT unique_folder_name_per_parent UNIQUE (user_id, parent_id, name)
);

CREATE INDEX idx_folders_user_id ON folders(user_id);
CREATE INDEX idx_folders_parent_id ON folders(parent_id);
CREATE INDEX idx_folders_created_at ON folders(created_at);

-- ============================================
-- FILES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  folder_id UUID REFERENCES folders(id) ON DELETE SET NULL,
  name VARCHAR(255) NOT NULL,
  original_name VARCHAR(255),
  mime_type VARCHAR(100),
  size BIGINT NOT NULL, -- in bytes
  file_hash VARCHAR(64), -- SHA-256
  telegram_message_id VARCHAR(255), -- Telegram message ID where file is stored
  telegram_file_id VARCHAR(255), -- Telegram file ID
  is_starred BOOLEAN DEFAULT false,
  description TEXT,
  tags VARCHAR(255)[], -- Array of tags
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  deleted_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_files_user_id ON files(user_id);
CREATE INDEX idx_files_folder_id ON files(folder_id);
CREATE INDEX idx_files_created_at ON files(created_at);
CREATE INDEX idx_files_mime_type ON files(mime_type);
CREATE INDEX idx_files_telegram_id ON files(telegram_message_id);
CREATE INDEX idx_files_is_starred ON files(is_starred);

-- ============================================
-- SHARES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS shares (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  file_id UUID NOT NULL REFERENCES files(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  share_token VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255), -- Optional password protection
  expires_at TIMESTAMP WITH TIME ZONE,
  download_limit INTEGER, -- NULL = unlimited
  download_count INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_shares_share_token ON shares(share_token);
CREATE INDEX idx_shares_file_id ON shares(file_id);
CREATE INDEX idx_shares_user_id ON shares(user_id);
CREATE INDEX idx_shares_is_active ON shares(is_active);

-- ============================================
-- DOWNLOADS TABLE (for tracking)
-- ============================================
CREATE TABLE IF NOT EXISTS downloads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  share_id UUID REFERENCES shares(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  ip_address VARCHAR(45),
  user_agent TEXT,
  downloaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_downloads_share_id ON downloads(share_id);
CREATE INDEX idx_downloads_downloaded_at ON downloads(downloaded_at);

-- ============================================
-- SESSIONS TABLE
-- ============================================
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

CREATE INDEX idx_sessions_user_id ON sessions(user_id);
CREATE INDEX idx_sessions_token ON sessions(token);
CREATE INDEX idx_sessions_expires_at ON sessions(expires_at);

-- ============================================
-- ADMIN LOGS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS admin_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID REFERENCES users(id) ON DELETE SET NULL,
  action VARCHAR(100) NOT NULL, -- 'delete_user', 'delete_file', 'reset_password', etc
  target_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  target_file_id UUID REFERENCES files(id) ON DELETE SET NULL,
  description TEXT,
  metadata JSONB, -- Additional data
  ip_address VARCHAR(45),
  status VARCHAR(20), -- 'success', 'failed'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_admin_logs_admin_id ON admin_logs(admin_id);
CREATE INDEX idx_admin_logs_action ON admin_logs(action);
CREATE INDEX idx_admin_logs_created_at ON admin_logs(created_at);

-- ============================================
-- STORAGE STATS TABLE (cached)
-- ============================================
CREATE TABLE IF NOT EXISTS storage_stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  total_files INTEGER DEFAULT 0,
  total_size BIGINT DEFAULT 0,
  total_shares INTEGER DEFAULT 0,
  last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_storage_stats_user_id ON storage_stats(user_id);

-- ============================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================

-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE telegram_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE folders ENABLE ROW LEVEL SECURITY;
ALTER TABLE files ENABLE ROW LEVEL SECURITY;
ALTER TABLE shares ENABLE ROW LEVEL SECURITY;
ALTER TABLE downloads ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE storage_stats ENABLE ROW LEVEL SECURITY;

-- Users: Can only read their own user record
CREATE POLICY "users_select_own" ON users
  FOR SELECT USING (auth.uid()::uuid = id OR (SELECT role FROM users WHERE id = auth.uid()::uuid) = 'admin');

CREATE POLICY "users_update_own" ON users
  FOR UPDATE USING (auth.uid()::uuid = id);

-- Folders: Can only access own folders
CREATE POLICY "folders_select_own" ON folders
  FOR SELECT USING (user_id = auth.uid()::uuid);

CREATE POLICY "folders_insert_own" ON folders
  FOR INSERT WITH CHECK (user_id = auth.uid()::uuid);

CREATE POLICY "folders_update_own" ON folders
  FOR UPDATE USING (user_id = auth.uid()::uuid);

CREATE POLICY "folders_delete_own" ON folders
  FOR DELETE USING (user_id = auth.uid()::uuid);

-- Files: Can only access own files
CREATE POLICY "files_select_own" ON files
  FOR SELECT USING (user_id = auth.uid()::uuid);

CREATE POLICY "files_insert_own" ON files
  FOR INSERT WITH CHECK (user_id = auth.uid()::uuid);

CREATE POLICY "files_update_own" ON files
  FOR UPDATE USING (user_id = auth.uid()::uuid);

CREATE POLICY "files_delete_own" ON files
  FOR DELETE USING (user_id = auth.uid()::uuid);

-- Shares: Can only access own shares
CREATE POLICY "shares_select_own" ON shares
  FOR SELECT USING (user_id = auth.uid()::uuid);

CREATE POLICY "shares_insert_own" ON shares
  FOR INSERT WITH CHECK (user_id = auth.uid()::uuid);

CREATE POLICY "shares_update_own" ON shares
  FOR UPDATE USING (user_id = auth.uid()::uuid);

CREATE POLICY "shares_delete_own" ON shares
  FOR DELETE USING (user_id = auth.uid()::uuid);

-- Sessions: Can only access own sessions
CREATE POLICY "sessions_select_own" ON sessions
  FOR SELECT USING (user_id = auth.uid()::uuid);

-- Telegram Accounts: Can only access own accounts
CREATE POLICY "telegram_select_own" ON telegram_accounts
  FOR SELECT USING (user_id = auth.uid()::uuid);

CREATE POLICY "telegram_insert_own" ON telegram_accounts
  FOR INSERT WITH CHECK (user_id = auth.uid()::uuid);

CREATE POLICY "telegram_update_own" ON telegram_accounts
  FOR UPDATE USING (user_id = auth.uid()::uuid);

-- Admin Logs: Only admins can view
CREATE POLICY "admin_logs_admin_only" ON admin_logs
  FOR SELECT USING ((SELECT role FROM users WHERE id = auth.uid()::uuid) = 'admin');

-- Storage Stats: Can only view own
CREATE POLICY "storage_stats_own" ON storage_stats
  FOR SELECT USING (user_id = auth.uid()::uuid);

-- ============================================
-- FUNCTIONS
-- ============================================

-- Function to update user's updated_at timestamp
CREATE OR REPLACE FUNCTION update_user_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to update file's updated_at timestamp
CREATE OR REPLACE FUNCTION update_file_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to update folder's updated_at timestamp
CREATE OR REPLACE FUNCTION update_folder_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
CREATE TRIGGER trigger_user_updated_at BEFORE UPDATE ON users
FOR EACH ROW EXECUTE FUNCTION update_user_updated_at();

CREATE TRIGGER trigger_file_updated_at BEFORE UPDATE ON files
FOR EACH ROW EXECUTE FUNCTION update_file_updated_at();

CREATE TRIGGER trigger_folder_updated_at BEFORE UPDATE ON folders
FOR EACH ROW EXECUTE FUNCTION update_folder_updated_at();

-- ============================================
-- INITIAL DATA (Optional)
-- ============================================

-- Create admin user (CHANGE PASSWORD IMMEDIATELY)
-- Password: admin123 (bcrypt hash)
INSERT INTO users (email, username, password_hash, full_name, role)
VALUES (
  'admin@driftiq.com',
  'admin',
  '$2a$10$jvHlXvnc8y9BhCxYPZFV0eJ.2J5YY1YY1YY1YY1YY1YY1YY1YY1YY', -- Replace with actual bcrypt hash
  'Administrator',
  'admin'
) ON CONFLICT (email) DO NOTHING;

