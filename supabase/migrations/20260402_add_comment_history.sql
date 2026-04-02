-- 댓글 기록 테이블 생성
-- 인스타 계정별로 게시물 중복 체크를 위한 테이블
CREATE TABLE IF NOT EXISTS comment_history (
  id BIGSERIAL PRIMARY KEY,
  instagram_username TEXT NOT NULL,      -- 인스타그램 계정 username
  post_id TEXT NOT NULL,                 -- 게시물 ID (ABC123 형태)
  post_author TEXT,                      -- 게시물 작성자 (선택적)
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 중복 방지 인덱스 (인스타 계정 + 게시물 조합이 유일해야 함)
CREATE UNIQUE INDEX IF NOT EXISTS comment_history_unique
ON comment_history (instagram_username, post_id);

-- 조회 성능 인덱스
CREATE INDEX IF NOT EXISTS comment_history_username_idx
ON comment_history (instagram_username);

-- RLS 활성화
ALTER TABLE comment_history ENABLE ROW LEVEL SECURITY;

-- 누구나 INSERT 가능 (anon key 사용)
CREATE POLICY "Anyone can insert" ON comment_history
  FOR INSERT WITH CHECK (true);

-- 누구나 SELECT 가능
CREATE POLICY "Anyone can select" ON comment_history
  FOR SELECT USING (true);

-- 30일 지난 기록만 삭제 가능
CREATE POLICY "Anyone can delete old records" ON comment_history
  FOR DELETE USING (created_at < NOW() - INTERVAL '30 days');
