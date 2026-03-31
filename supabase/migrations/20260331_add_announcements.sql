-- ============================================
-- 공지사항 테이블 생성
-- ============================================
CREATE TABLE IF NOT EXISTS announcements (
  id serial PRIMARY KEY,
  title text NOT NULL,
  content text NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ============================================
-- RLS 정책
-- ============================================
ALTER TABLE announcements ENABLE ROW LEVEL SECURITY;

-- 인증된 사용자는 활성 공지만 조회 가능
CREATE POLICY "announcements_select_authenticated" ON announcements
  FOR SELECT TO authenticated
  USING (is_active = true);
