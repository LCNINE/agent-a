-- collected_users 테이블에서 status 관련 컬럼 제거
-- 이제 comment_history 테이블을 기반으로 처리 상태를 판단합니다.

-- status 컬럼 제거
ALTER TABLE collected_users DROP COLUMN IF EXISTS status;

-- session_id 컬럼 제거 (더 이상 세션별 추적 불필요)
ALTER TABLE collected_users DROP COLUMN IF EXISTS session_id;

-- processed_at 컬럼 제거 (comment_history 기반으로 처리 여부 판단)
ALTER TABLE collected_users DROP COLUMN IF EXISTS processed_at;

-- 불필요해진 인덱스 제거
DROP INDEX IF EXISTS idx_collected_users_status;
DROP INDEX IF EXISTS idx_collected_users_session_id;
