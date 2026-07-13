# Language LAB - Roadmap & Implementation Plan

## Phase 1: UI/UX Basic Improvements

### 1-1. Empty State (빈 화면 가이드)
- **홈**: 노트 0개일 때 온보딩 카드 표시
  - "아직 작성된 노트가 없습니다"
  - 핵심 흐름 안내: (1) 표현 메모하기 -> (2) 카드로 복습하기 -> (3) 뉘앙스 교정받기
  - [새 노트 추가하기] CTA 버튼
- **노트 목록**: "첫 번째 노트를 작성해보세요!" + [추가] 버튼
- **카드 복습**: "복습할 카드가 없습니다. 노트를 추가하면 자동으로 카드가 만들어집니다." + [노트 추가] 버튼

### 1-2. Menu Terminology (메뉴 명칭 개선)
| 현재 (ko) | 변경 (ko) | 현재 (en) | 변경 (en) |
|-----------|-----------|-----------|-----------|
| 새 노트 | 새 표현 추가 | Add | Add Expression |
| 카드 | 오늘의 복습 | Cards | Review |
| 노트 | 학습 보관함 | Notes | My Notes |
| Nuance | 표현 다듬기 | Nuance | Nuance Chat |

*BottomTab, Nav, i18n.ts 수정 필요*

### 1-3. Skeleton UI (로딩 화면 개선)
- "로딩 중..." 텍스트 -> 카드/리스트 형태 Skeleton placeholder
- 홈: 통계 카드 2개 + 최근 노트 3줄 스켈레톤
- 노트 목록: 카드형 스켈레톤 5줄
- 카드 복습: 카드 영역 스켈레톤
- 공통 컴포넌트: `<Skeleton />` (rounded rect + pulse animation)

### 1-4. Dashboard Layout (홈 화면 개선)
- 상단: 인사말 + 오늘 날짜
- 중단: 통계 카드 (English/Japanese 노트 수) - 유지
- Quick Actions: "오늘의 복습" / "새 표현 추가" - 유지
- 하단: 최근 노트 - 유지
- *Phase 2에서 Streak/달력/Leaf 현황 추가*

---

## Phase 2: Leaf Economy & Streak System

### 2-1. Leaf 이코노미 설계

#### A. 무료 Leaf (데일리 - 소멸형)
- 매일 00:00 자동 충전 5개
- 당일 미사용 시 소멸 (다음날 다시 5개)
- 기존 `ai_daily_usage` 카운트 기반 유지 (DB 변경 없음)
- Nav 표시: `3/5` (게이지형)

#### B. 보상 Leaf (영구 - 누적형)
- 학습 행동/연속학습으로 획득
- 소멸 안 됨, `user_credits.balance`에 합산
- 무료 Leaf 소진 후 자동 사용
- Nav 표시: `+12` (무료 옆에 별도 표시)

#### C. 충전 Leaf (영구 - 누적형)
- 결제로 구매, 보상 Leaf과 동일 pool
- 기존 PayApp 결제 흐름 유지

#### Leaf 소모
| 행동 | 비용 |
|------|------|
| Nuance Chat 1회 | -1 Leaf |
| AI Example (카드) | -1 Leaf |
| AI 문장 추출 (노트 저장) | -1 Leaf |

#### Leaf 획득 (보상)
| 행동 | 보상 |
|------|------|
| 매일 출석 (학습 행동 1회 이상) | +1 Leaf |
| 카드 10장 복습 완료 | +2 Leaf |
| 3일 연속 학습 | +2 Leaf (보너스) |
| 7일 연속 학습 | +5 Leaf (보너스) |
| 30일 연속 학습 | +15 Leaf (보너스) |

### 2-2. "학습 행동" 정의
아래 중 하나 이상 수행 시 해당일 "출석" 인정:
- 노트 1개 이상 추가
- 카드 5장 이상 복습
- Nuance Chat 1회 이상 사용

### 2-3. DB 스키마

```sql
-- 이미 생성됨 (RLS 적용)
create table daily_activity (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id),
  activity_date date not null,
  cards_reviewed int default 0,
  notes_added int default 0,
  nuance_used int default 0,
  leaf_earned int default 0,
  streak_bonus_claimed boolean default false,
  created_at timestamptz default now(),
  unique(user_id, activity_date)
);
```

*user_credits 테이블은 기존 유지 (balance = 보상 + 충전 Leaf)*

### 2-4. Streak 계산 로직
```
1. daily_activity에서 user_id의 최근 레코드를 activity_date DESC로 조회
2. 오늘부터 연속된 날짜 카운트
3. 3/7/30일 달성 시 && streak_bonus_claimed === false -> Leaf 지급
4. streak_bonus_claimed = true로 업데이트
```

### 2-5. Nav Leaf 표시 변경
현재: `🍃 15`
변경: `🍃 3/5 +12`
- 3/5 = 오늘 남은 무료 Leaf
- +12 = 보유 영구 Leaf (보상+충전)

### 2-6. CreditModal 개선
현재: "Leaf가 부족합니다" + [충전하기]
변경:
- "Leaf가 부족해요! 카드를 복습하고 Leaf를 모아볼까요?"
- [카드 복습하러 가기] 버튼 (primary)
- [Leaf 충전하기] 버튼 (secondary)

### 2-7. 학습 달력 (히트맵)
- 홈 화면 통계 카드 아래에 배치
- GitHub 잔디 스타일 or 월간 캘린더
- 학습한 날 = 초록색, 미학습 = 회색
- 연속 학습 일수 표시: "🔥 7일 연속 학습 중!"
- 탭하면 해당 날짜 노트로 이동

### 2-8. 축하 애니메이션
- Leaf 획득 시: 나뭇잎이 떨어지는 애니메이션 + 토스트
- Streak 달성 시 (3/7/30일): 특별 모달
  - "🔥 7일 연속 학습 달성! +5 Leaf 획득!"
  - 화면 중앙 모달 + confetti 효과
- 구현: CSS animation + canvas confetti (lightweight)

---

## Phase 3: Pronunciation Evaluation

### 3-1. Web Speech API 기반 (무료)
- 카드 복습 화면에 [마이크] 버튼 추가
- 사용자가 문장을 읽으면 음성인식
- 인식된 텍스트와 원문을 단어별 비교
- 일치: 초록, 불일치/누락: 빨강으로 표시
- 점수: 일치율 % 표시

### 3-2. 지원 범위
- English: Web Speech API `en-US`
- Japanese: Web Speech API `ja-JP`
- 브라우저 호환: Chrome, Safari (모바일 포함)

### 3-3. 향후 확장 (Azure Speech SDK)
- 음소 단위 발음 점수
- 강세, 유창성, 완전성 평가
- 월 5시간 무료 tier 활용 가능
- Phase 3 이후 사용자 반응 보고 결정

---

## Implementation Priority

```
Phase 1 (UI/UX)     ████████░░  ~2-3 sessions
Phase 2 (Leaf/Streak) ██████████  ~3-4 sessions
Phase 3 (발음평가)    ██████░░░░  ~2 sessions
```

## Files to Modify/Create

### Phase 1
- `src/lib/i18n.ts` - 메뉴 명칭 변경
- `src/components/BottomTab.tsx` - 탭 라벨 변경
- `src/components/Skeleton.tsx` - NEW: 스켈레톤 컴포넌트
- `src/app/page.tsx` - 홈 대시보드 개선 + Empty State
- `src/app/notes/page.tsx` - Empty State
- `src/app/review/page.tsx` - Empty State

### Phase 2
- `src/lib/streak.ts` - NEW: Streak 계산/Leaf 지급 로직
- `src/components/ActivityCalendar.tsx` - NEW: 히트맵 달력
- `src/components/CelebrationModal.tsx` - NEW: 축하 애니메이션
- `src/components/Nav.tsx` - Leaf 표시 변경 (게이지형)
- `src/components/CreditModal.tsx` - 복습 유도 버튼 추가
- `src/app/page.tsx` - Streak/달력 추가
- `src/app/api/streak/route.ts` - NEW: Streak API
- `src/app/review/page.tsx` - 카드 복습 완료 시 activity 기록
- `src/app/add/page.tsx` - 노트 추가 시 activity 기록
- `src/app/nuance/page.tsx` - Nuance 사용 시 activity 기록

### Phase 3
- `src/components/PronunciationTest.tsx` - NEW: 발음평가 UI
- `src/lib/pronunciation.ts` - NEW: 음성인식 + 텍스트 비교
- `src/app/review/page.tsx` - 마이크 버튼 추가
