-- Supabase SQL Editor에서 실행할 스키마
-- 1. study_sessions 테이블 생성
CREATE TABLE study_sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  language TEXT NOT NULL CHECK (language IN ('english', 'japanese')),
  study_date DATE NOT NULL DEFAULT CURRENT_DATE,
  title TEXT,
  stress_pronunciation TEXT,
  vocabulary TEXT,
  sentence_grammar TEXT,
  comment TEXT,
  raw_input TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. 인덱스
CREATE INDEX idx_sessions_language ON study_sessions(language);
CREATE INDEX idx_sessions_date ON study_sessions(study_date DESC);
CREATE INDEX idx_sessions_created ON study_sessions(created_at DESC);

-- 3. RLS (Row Level Security) - 개인 프로젝트이므로 공개 접근 허용
ALTER TABLE study_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all access" ON study_sessions
  FOR ALL USING (true) WITH CHECK (true);
