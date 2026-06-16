-- 1. user_id 컬럼 추가
ALTER TABLE study_sessions ADD COLUMN user_id UUID REFERENCES auth.users(id);

-- 2. 기존 RLS 정책 삭제
DROP POLICY IF EXISTS "Allow all access" ON study_sessions;

-- 3. 새 RLS 정책: 자기 데이터만 조회/수정 가능
CREATE POLICY "Users can view own data"
  ON study_sessions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own data"
  ON study_sessions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own data"
  ON study_sessions FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own data"
  ON study_sessions FOR DELETE
  USING (auth.uid() = user_id);

-- 4. user_id 인덱스
CREATE INDEX idx_sessions_user ON study_sessions(user_id);
