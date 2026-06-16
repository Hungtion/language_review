import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export type NuanceResult = {
  language: string;
  translation: string;
  nuance: string;
  alternatives: string[];
};

export type NuanceChat = {
  id: string;
  user_id: string;
  input_text: string;
  results: NuanceResult[];
  target_langs: string[];
  tone: string;
  created_at: string;
};

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
