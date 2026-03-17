-- ============================================
-- 1. plans 테이블 생성
-- ============================================
CREATE TABLE IF NOT EXISTS plans (
  id serial PRIMARY KEY,
  name text NOT NULL UNIQUE,          -- "basic", "standard", "premium"
  display_name text NOT NULL,          -- "베이직", "스탠다드", "프리미엄"
  max_instances int NOT NULL DEFAULT 1,-- 최대 동시 인스타 실행 수
  price_points int NOT NULL DEFAULT 0, -- 포인트 가격
  duration_days int NOT NULL DEFAULT 30,-- 구독 기간(일)
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ============================================
-- 2. 기본 플랜 데이터 삽입
-- ============================================
INSERT INTO plans (name, display_name, max_instances, price_points, duration_days) VALUES
  ('basic',    '베이직',    1, 10000, 30),
  ('standard', '스탠다드',  2, 18000, 30),
  ('premium',  '프리미엄',  3, 25000, 30)
ON CONFLICT (name) DO NOTHING;

-- ============================================
-- 3. subscriptions 테이블에 plan_id 컬럼 추가
-- ============================================
ALTER TABLE subscriptions
  ADD COLUMN IF NOT EXISTS plan_id int REFERENCES plans(id);

-- 기존 구독에 기본 플랜(basic) 연결
UPDATE subscriptions
  SET plan_id = (SELECT id FROM plans WHERE name = 'basic')
  WHERE plan_id IS NULL;

-- ============================================
-- 4. RLS 정책 - plans 테이블
-- ============================================
ALTER TABLE plans ENABLE ROW LEVEL SECURITY;

-- 모든 인증된 사용자가 플랜 목록 조회 가능
CREATE POLICY "plans_select_authenticated" ON plans
  FOR SELECT TO authenticated
  USING (true);

-- ============================================
-- 5. get_current_subscription 함수 수정
--    plan 정보(max_instances, plan_name)를 함께 반환
-- ============================================
CREATE OR REPLACE FUNCTION get_current_subscription(p_user_id text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result json;
BEGIN
  SELECT json_build_object(
    'subscription_id', s.id,
    'start_date', s.start_date,
    'end_date', s.end_date,
    'is_active', (s.end_date > now()),
    'plan_id', s.plan_id,
    'plan_name', COALESCE(p.name, 'basic'),
    'plan_display_name', COALESCE(p.display_name, '베이직'),
    'max_instances', COALESCE(p.max_instances, 1)
  ) INTO result
  FROM subscriptions s
  LEFT JOIN plans p ON p.id = s.plan_id
  WHERE s.user_id = p_user_id
    AND s.end_date > now()
  ORDER BY s.end_date DESC
  LIMIT 1;

  RETURN result;
END;
$$;

-- ============================================
-- 6. add_subscription 함수 수정 (plan_id 지원)
-- ============================================
CREATE OR REPLACE FUNCTION add_subscription(p_user_id text, p_days int, p_plan_id int DEFAULT NULL)
RETURNS int
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_subscription_id int;
  v_existing_end_date timestamptz;
  v_start_date timestamptz;
  v_end_date timestamptz;
  v_plan_id int;
BEGIN
  -- plan_id가 없으면 basic 플랜 사용
  IF p_plan_id IS NULL THEN
    SELECT id INTO v_plan_id FROM plans WHERE name = 'basic' LIMIT 1;
  ELSE
    v_plan_id := p_plan_id;
  END IF;

  -- 기존 활성 구독 확인
  SELECT end_date INTO v_existing_end_date
  FROM subscriptions
  WHERE user_id = p_user_id AND end_date > now()
  ORDER BY end_date DESC
  LIMIT 1;

  IF v_existing_end_date IS NOT NULL THEN
    -- 기존 구독이 있으면 연장
    v_start_date := now();
    v_end_date := v_existing_end_date + (p_days || ' days')::interval;
  ELSE
    v_start_date := now();
    v_end_date := now() + (p_days || ' days')::interval;
  END IF;

  INSERT INTO subscriptions (user_id, start_date, end_date, plan_id)
  VALUES (p_user_id, v_start_date, v_end_date, v_plan_id)
  RETURNING id INTO v_subscription_id;

  -- 이벤트 기록
  INSERT INTO subscription_events (subscription_id, event_type, delta_days, previous_end_date, new_end_date)
  VALUES (
    v_subscription_id,
    'start',
    p_days,
    COALESCE(v_existing_end_date, v_start_date),
    v_end_date
  );

  RETURN v_subscription_id;
END;
$$;

-- ============================================
-- 7. subscribe_with_points 함수 수정 (plan 기반)
-- ============================================
CREATE OR REPLACE FUNCTION subscribe_with_points(p_user_id text, p_plan_type text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_plan plans%ROWTYPE;
  v_current_points int;
BEGIN
  -- 플랜 조회
  SELECT * INTO v_plan FROM plans WHERE name = p_plan_type;
  IF NOT FOUND THEN
    RAISE EXCEPTION '존재하지 않는 플랜입니다: %', p_plan_type;
  END IF;

  -- 현재 포인트 조회
  SELECT COALESCE(SUM(total_amount), 0) INTO v_current_points
  FROM point_events
  WHERE member_id = p_user_id;

  IF v_current_points < v_plan.price_points THEN
    RAISE EXCEPTION '포인트가 부족합니다. 필요: %, 보유: %', v_plan.price_points, v_current_points;
  END IF;

  -- 포인트 차감
  INSERT INTO point_events (member_id, event_type, total_amount)
  VALUES (p_user_id, '구독', -v_plan.price_points);

  -- 구독 생성 (plan_id 포함)
  PERFORM add_subscription(p_user_id, v_plan.duration_days, v_plan.id);
END;
$$;

-- ============================================
-- 8. start_free_trial 함수 수정 (basic 플랜 연결)
-- ============================================
CREATE OR REPLACE FUNCTION start_free_trial(user_id_param text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_plan_id int;
BEGIN
  -- 이미 무료체험 사용했는지 확인
  IF EXISTS (SELECT 1 FROM free_trial_records WHERE user_id = user_id_param) THEN
    RAISE EXCEPTION '이미 무료체험을 사용하셨습니다.';
  END IF;

  -- basic 플랜 ID 조회
  SELECT id INTO v_plan_id FROM plans WHERE name = 'basic' LIMIT 1;

  -- 무료체험 기록
  INSERT INTO free_trial_records (user_id) VALUES (user_id_param);

  -- 3일 구독 생성 (basic 플랜)
  PERFORM add_subscription(user_id_param, 3, v_plan_id);
END;
$$;
