ALTER TABLE target_follower_collection_jobs
ADD COLUMN IF NOT EXISTS target_group TEXT;

ALTER TABLE target_followers
ADD COLUMN IF NOT EXISTS target_group TEXT;

CREATE INDEX IF NOT EXISTS idx_target_follower_jobs_group
ON target_follower_collection_jobs(app_user_id, target_group);

CREATE INDEX IF NOT EXISTS idx_target_followers_group
ON target_followers(app_user_id, target_group);
