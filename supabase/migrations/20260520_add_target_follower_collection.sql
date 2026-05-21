-- 타겟 유저 팔로워 수집 작업 상태
CREATE TABLE IF NOT EXISTS target_follower_collection_jobs (
  id BIGSERIAL PRIMARY KEY,
  app_user_id TEXT NOT NULL,
  app_user_email TEXT NOT NULL,
  target_username TEXT NOT NULL,
  target_follower_count INTEGER,
  collected_count INTEGER NOT NULL DEFAULT 0,
  configured_daily_limit INTEGER NOT NULL DEFAULT 200,
  adaptive_daily_limit INTEGER NOT NULL DEFAULT 200,
  scroll_delay_ms INTEGER NOT NULL DEFAULT 1800,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'waiting', 'completed', 'failed')),
  last_error TEXT,
  last_run_at TIMESTAMPTZ,
  next_run_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_target_follower_jobs_unique
ON target_follower_collection_jobs(app_user_id, target_username);

CREATE INDEX IF NOT EXISTS idx_target_follower_jobs_app_user_id
ON target_follower_collection_jobs(app_user_id);

CREATE INDEX IF NOT EXISTS idx_target_follower_jobs_email
ON target_follower_collection_jobs(app_user_email);

CREATE INDEX IF NOT EXISTS idx_target_follower_jobs_next_run
ON target_follower_collection_jobs(next_run_at);

-- 실제 수집된 팔로워 목록
CREATE TABLE IF NOT EXISTS target_followers (
  id BIGSERIAL PRIMARY KEY,
  app_user_id TEXT NOT NULL,
  app_user_email TEXT NOT NULL,
  target_username TEXT NOT NULL,
  follower_username TEXT NOT NULL,
  follower_profile_url TEXT,
  source TEXT NOT NULL DEFAULT 'target_followers_modal',
  collected_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_target_followers_unique
ON target_followers(app_user_id, target_username, follower_username);

CREATE INDEX IF NOT EXISTS idx_target_followers_app_user_id
ON target_followers(app_user_id);

CREATE INDEX IF NOT EXISTS idx_target_followers_email
ON target_followers(app_user_email);

CREATE INDEX IF NOT EXISTS idx_target_followers_target_username
ON target_followers(target_username);

CREATE INDEX IF NOT EXISTS idx_target_followers_follower_username
ON target_followers(follower_username);

ALTER TABLE target_follower_collection_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE target_followers ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'target_follower_collection_jobs'
      AND policyname = 'Users can view target follower jobs'
  ) THEN
    EXECUTE 'CREATE POLICY "Users can view target follower jobs"
      ON target_follower_collection_jobs FOR SELECT
      USING (true)';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'target_follower_collection_jobs'
      AND policyname = 'Users can insert target follower jobs'
  ) THEN
    EXECUTE 'CREATE POLICY "Users can insert target follower jobs"
      ON target_follower_collection_jobs FOR INSERT
      WITH CHECK (true)';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'target_follower_collection_jobs'
      AND policyname = 'Users can update target follower jobs'
  ) THEN
    EXECUTE 'CREATE POLICY "Users can update target follower jobs"
      ON target_follower_collection_jobs FOR UPDATE
      USING (true)';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'target_follower_collection_jobs'
      AND policyname = 'Users can delete target follower jobs'
  ) THEN
    EXECUTE 'CREATE POLICY "Users can delete target follower jobs"
      ON target_follower_collection_jobs FOR DELETE
      USING (true)';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'target_followers'
      AND policyname = 'Users can view target followers'
  ) THEN
    EXECUTE 'CREATE POLICY "Users can view target followers"
      ON target_followers FOR SELECT
      USING (true)';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'target_followers'
      AND policyname = 'Users can insert target followers'
  ) THEN
    EXECUTE 'CREATE POLICY "Users can insert target followers"
      ON target_followers FOR INSERT
      WITH CHECK (true)';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'target_followers'
      AND policyname = 'Users can update target followers'
  ) THEN
    EXECUTE 'CREATE POLICY "Users can update target followers"
      ON target_followers FOR UPDATE
      USING (true)';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'target_followers'
      AND policyname = 'Users can delete target followers'
  ) THEN
    EXECUTE 'CREATE POLICY "Users can delete target followers"
      ON target_followers FOR DELETE
      USING (true)';
  END IF;
END $$;
