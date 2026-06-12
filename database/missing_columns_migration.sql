-- ============================================================
-- DriftIQ Robust Migration for Missing Columns
-- ============================================================

DO $$ 
BEGIN
  -- 1. USERS TABLE MISSING COLUMNS
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'username') THEN
    ALTER TABLE users ADD COLUMN username VARCHAR(100) UNIQUE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'full_name') THEN
    ALTER TABLE users ADD COLUMN full_name VARCHAR(255);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'avatar_url') THEN
    ALTER TABLE users ADD COLUMN avatar_url TEXT;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'role') THEN
    ALTER TABLE users ADD COLUMN role VARCHAR(20) DEFAULT 'user';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'storage_limit') THEN
    ALTER TABLE users ADD COLUMN storage_limit BIGINT DEFAULT 5368709120;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'storage_used') THEN
    ALTER TABLE users ADD COLUMN storage_used BIGINT DEFAULT 0;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'is_active') THEN
    ALTER TABLE users ADD COLUMN is_active BOOLEAN DEFAULT true;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'telegram_user_id') THEN
    ALTER TABLE users ADD COLUMN telegram_user_id VARCHAR(100) UNIQUE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'telegram_status') THEN
    ALTER TABLE users ADD COLUMN telegram_status VARCHAR(20) DEFAULT 'disconnected';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'refresh_token') THEN
    ALTER TABLE users ADD COLUMN refresh_token TEXT;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'password_reset_token') THEN
    ALTER TABLE users ADD COLUMN password_reset_token TEXT;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'last_login') THEN
    ALTER TABLE users ADD COLUMN last_login TIMESTAMP WITH TIME ZONE;
  END IF;

  -- 2. FILES TABLE MISSING COLUMNS
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'files' AND column_name = 'is_deleted') THEN
    ALTER TABLE files ADD COLUMN is_deleted BOOLEAN DEFAULT false;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'files' AND column_name = 'is_starred') THEN
    ALTER TABLE files ADD COLUMN is_starred BOOLEAN DEFAULT false;
  END IF;

  -- 3. FOLDERS TABLE MISSING COLUMNS
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'folders' AND column_name = 'is_deleted') THEN
    ALTER TABLE folders ADD COLUMN is_deleted BOOLEAN DEFAULT false;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'folders' AND column_name = 'color') THEN
    ALTER TABLE folders ADD COLUMN color VARCHAR(7);
  END IF;

  -- 4. SHARES TABLE MISSING COLUMNS
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'shares' AND column_name = 'download_count') THEN
    ALTER TABLE shares ADD COLUMN download_count INTEGER DEFAULT 0;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'shares' AND column_name = 'is_active') THEN
    ALTER TABLE shares ADD COLUMN is_active BOOLEAN DEFAULT true;
  END IF;

END $$;
