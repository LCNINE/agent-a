-- jungsik.jeong@lcnine.kr 계정을 프리미엄 플랜으로 설정
-- 기존 활성 구독이 있으면 plan_id를 premium으로 변경
-- 없으면 새로 30일 프리미엄 구독 생성

DO $$
DECLARE
  v_user_id text;
  v_premium_plan_id int;
  v_existing_sub_id int;
BEGIN
  -- 유저 ID 조회
  SELECT user_id INTO v_user_id
  FROM members
  WHERE email = 'jungsik.jeong@lcnine.kr';

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION '해당 이메일의 사용자를 찾을 수 없습니다: jungsik.jeong@lcnine.kr';
  END IF;

  -- 프리미엄 플랜 ID 조회
  SELECT id INTO v_premium_plan_id
  FROM plans
  WHERE name = 'premium';

  -- 기존 활성 구독 확인
  SELECT id INTO v_existing_sub_id
  FROM subscriptions
  WHERE user_id = v_user_id AND end_date > now()
  ORDER BY end_date DESC
  LIMIT 1;

  IF v_existing_sub_id IS NOT NULL THEN
    -- 기존 구독의 플랜을 프리미엄으로 변경
    UPDATE subscriptions
    SET plan_id = v_premium_plan_id
    WHERE id = v_existing_sub_id;

    RAISE NOTICE '기존 구독(id=%)을 프리미엄으로 변경했습니다.', v_existing_sub_id;
  ELSE
    -- 새 프리미엄 구독 30일 생성
    INSERT INTO subscriptions (user_id, start_date, end_date, plan_id)
    VALUES (v_user_id, now(), now() + interval '30 days', v_premium_plan_id);

    RAISE NOTICE '새 프리미엄 구독을 30일간 생성했습니다.';
  END IF;
END;
$$;
