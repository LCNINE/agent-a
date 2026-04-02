# Agent-A 프로젝트 가이드

## 프로젝트 개요
인스타그램 자동화 Electron 앱. Supabase 인증/구독/플랜 시스템 사용.

## 기술 스택
- Electron + React + TypeScript (electron-vite)
- Supabase (Auth, DB, RLS)
- Zustand (상태관리), TanStack Query/Router
- Playwright/Puppeteer (브라우저 자동화)

## DB 원격 실행 방법
```bash
DB_PW=$(grep DB_PW .env | cut -d= -f2)
DB_URL="postgresql://postgres.xszdgbmgwnaxbyekqons:${DB_PW}@aws-0-ap-northeast-2.pooler.supabase.com:5432/postgres"
npx supabase db query --db-url "$DB_URL" "SQL문"
```

---

## 운영 가이드: 유저 관리 및 구독

### 1. 유저 조회
```sql
SELECT user_id::text, email, name FROM members WHERE email = '이메일주소'
```

### 2. 플랜 종류
| 플랜 | name | max_instances | price_points | duration_days |
|------|------|---------------|--------------|---------------|
| 베이직 | basic | 1개 | 10,000 | 30일 |
| 스탠다드 | standard | 2개 | 18,000 | 30일 |
| 프리미엄 | premium | 3개 | 25,000 | 30일 |

### 3. 신규 구독 생성 (무통장 입금 확인 후)
유저에게 새 구독을 부여할 때:
```sql
-- 1) 유저 ID 확인
SELECT user_id::text FROM members WHERE email = '이메일주소'

-- 2) 플랜 ID 확인 (basic=1, standard=2, premium=3)
SELECT id, name, max_instances FROM plans

-- 3) 구독 생성 (30일 기준)
SELECT add_subscription('유저UUID', 30, 플랜ID)
```

예시 - basic 30일:
```sql
SELECT add_subscription('73aea705-2a6e-4584-9110-34de404a8340', 30, 1)
```

### 4. 플랜 업그레이드 (기존 구독의 플랜 변경)
기존 활성 구독이 있는 유저의 플랜을 변경할 때:
```sql
-- 1) 현재 활성 구독 확인
SELECT s.id, s.plan_id, p.name, s.end_date
FROM subscriptions s
LEFT JOIN plans p ON p.id = s.plan_id
WHERE s.user_id::text = '유저UUID' AND s.end_date > now()
ORDER BY s.end_date DESC LIMIT 1

-- 2) 플랜 변경 (subscription id와 새 plan name 사용)
UPDATE subscriptions
SET plan_id = (SELECT id FROM plans WHERE name = '새플랜이름')
WHERE id = 구독ID
```

예시 - 구독 id=3을 premium으로:
```sql
UPDATE subscriptions SET plan_id = (SELECT id FROM plans WHERE name = 'premium') WHERE id = 3
```

### 5. 구독 연장 (추가 입금 시)
```sql
SELECT add_subscription('유저UUID', 추가일수, 플랜ID)
```
기존 활성 구독이 있으면 end_date가 자동으로 연장됨.

### 6. 구독 취소
```sql
SELECT cancel_subscription('유저UUID')
```

### 7. 전체 운영 흐름 (무통장 입금)
1. 고객이 무통장 입금
2. 입금 확인 후 아래 실행:
   - **신규**: `SELECT add_subscription('UUID', 30, 플랜ID)`
   - **업그레이드**: `UPDATE subscriptions SET plan_id = (SELECT id FROM plans WHERE name = '플랜') WHERE id = 구독ID`
   - **연장**: `SELECT add_subscription('UUID', 30, 플랜ID)`
3. 고객에게 완료 안내

---

## 주요 파일 구조
- `src/renderer/src/supabase/client.ts` - Supabase 클라이언트
- `src/renderer/src/service/subscription/` - 구독 서비스/쿼리
- `src/renderer/src/pages/HomePage/AgentController.tsx` - 에이전트 시작/중지 + 인스턴스 제한
- `src/renderer/src/pages/HomePage/HomePage.tsx` - 메인 페이지 + 플랜 표시
- `src/main/agent/managers/AgentManager.ts` - 에이전트 매니저
- `src/main/ipcHandlers.ts` - IPC 핸들러 (멀티 에이전트 Map)
- `supabase/migrations/` - DB 마이그레이션 SQL 파일

---

## 릴리스 방법

태그 푸시 시 GitHub Actions가 자동으로 Windows 빌드 + 릴리스 업로드합니다.

```bash
npm version patch   # 버전 업 (1.0.51 → 1.0.52)
git push origin main --tags
```

- `patch`: 1.0.51 → 1.0.52 (버그 수정)
- `minor`: 1.0.51 → 1.1.0 (기능 추가)
- `major`: 1.0.51 → 2.0.0 (대규모 변경)
