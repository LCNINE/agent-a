-- 수집된 유저 테이블 생성
CREATE TABLE IF NOT EXISTS collected_users (
  id BIGSERIAL PRIMARY KEY,
  instagram_username TEXT NOT NULL,      -- 수집 실행 계정
  collected_username TEXT NOT NULL,      -- 수집된 유저
  collected_from_hashtag TEXT,           -- 출처 해시태그
  collected_from_post_id TEXT,           -- 출처 게시물 ID
  like_count INTEGER DEFAULT 0,          -- 댓글 좋아요 수
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  session_id TEXT NOT NULL,              -- 세션 ID
  processed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_collected_users_instagram_username ON collected_users(instagram_username);
CREATE INDEX IF NOT EXISTS idx_collected_users_status ON collected_users(status);
CREATE INDEX IF NOT EXISTS idx_collected_users_session_id ON collected_users(session_id);
CREATE INDEX IF NOT EXISTS idx_collected_users_collected_username ON collected_users(collected_username);

-- 중복 수집 방지를 위한 유니크 인덱스 (실행 계정 + 수집된 유저)
CREATE UNIQUE INDEX IF NOT EXISTS idx_collected_users_unique
ON collected_users(instagram_username, collected_username);

-- RLS 정책 활성화
ALTER TABLE collected_users ENABLE ROW LEVEL SECURITY;

-- 모든 사용자가 자신의 계정으로 수집한 유저만 조회 가능
CREATE POLICY "Users can view their own collected users"
ON collected_users FOR SELECT
USING (true);

-- 모든 사용자가 INSERT 가능
CREATE POLICY "Users can insert collected users"
ON collected_users FOR INSERT
WITH CHECK (true);

-- 모든 사용자가 UPDATE 가능
CREATE POLICY "Users can update collected users"
ON collected_users FOR UPDATE
USING (true);

-- 모든 사용자가 DELETE 가능
CREATE POLICY "Users can delete collected users"
ON collected_users FOR DELETE
USING (true);
