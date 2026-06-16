import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export type StudySession = {
  id: string;
  language: 'english' | 'japanese';
  study_date: string;
  title: string | null;
  stress_pronunciation: string | null;
  vocabulary: string | null;
  sentence_grammar: string | null;
  comment: string | null;
  raw_input: string;
  created_at: string;
};
