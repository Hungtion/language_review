export type ParsedNote = {
  stress_pronunciation: string | null;
  vocabulary: string | null;
  sentence_grammar: string | null;
  comment: string | null;
};

const SECTION_PATTERNS = [
  { key: 'stress_pronunciation', patterns: ['Stress and Pronunciation', 'Stress & Pronunciation', '발음'] },
  { key: 'vocabulary', patterns: ['Vocabulary', '어휘', '단어'] },
  { key: 'sentence_grammar', patterns: ['Sentence Structure & Grammar', 'Sentence Structure and Grammar', 'Grammar', '문법'] },
  { key: 'comment', patterns: ['Comment', 'Comments', '코멘트', '메모'] },
] as const;

export function parseRawInput(raw: string): ParsedNote {
  const result: ParsedNote = {
    stress_pronunciation: null,
    vocabulary: null,
    sentence_grammar: null,
    comment: null,
  };

  const lines = raw.split('\n');
  let currentKey: keyof ParsedNote | null = null;
  const sectionContent: Record<string, string[]> = {};

  for (const line of lines) {
    const trimmed = line.trim();

    // Check if this line is a section header
    let matched = false;
    for (const section of SECTION_PATTERNS) {
      if (section.patterns.some(p => trimmed.toLowerCase() === p.toLowerCase())) {
        currentKey = section.key as keyof ParsedNote;
        sectionContent[currentKey] = [];
        matched = true;
        break;
      }
    }

    if (!matched && currentKey) {
      sectionContent[currentKey].push(line);
    }
  }

  // Join content and trim
  for (const [key, lines] of Object.entries(sectionContent)) {
    const content = lines.join('\n').trim();
    if (content) {
      result[key as keyof ParsedNote] = content;
    }
  }

  return result;
}

export type VocabEntry = {
  term: string;
  definition: string;
  example: string | null;
};

export function parseVocabulary(vocabText: string): VocabEntry[] {
  const entries: VocabEntry[] = [];
  const lines = vocabText.split('\n').filter(l => l.trim());

  let currentEntry: Partial<VocabEntry> = {};

  for (const line of lines) {
    const trimmed = line.trim();

    // Pattern: "word (part of speech) = definition"
    const mainMatch = trimmed.match(/^([^(=]+)\s*\(([^)]+)\)\s*[=:]\s*(.+)/);
    if (mainMatch) {
      if (currentEntry.term) {
        entries.push(currentEntry as VocabEntry);
      }
      currentEntry = {
        term: `${mainMatch[1].trim()} (${mainMatch[2].trim()})`,
        definition: mainMatch[3].trim(),
        example: null,
      };
      continue;
    }

    // Pattern: "word = definition" (without part of speech)
    const simpleMatch = trimmed.match(/^([^=:]+)\s*[=:]\s*(.+)/);
    if (simpleMatch && !trimmed.startsWith('-->') && !trimmed.startsWith('->')) {
      if (currentEntry.term) {
        entries.push(currentEntry as VocabEntry);
      }
      currentEntry = {
        term: simpleMatch[1].trim(),
        definition: simpleMatch[2].trim(),
        example: null,
      };
      continue;
    }

    // Pattern: "--> example sentence" or "-> example"
    const exampleMatch = trimmed.match(/^-+>\s*(.+)/);
    if (exampleMatch && currentEntry.term) {
      currentEntry.example = exampleMatch[1].trim();
      continue;
    }
  }

  if (currentEntry.term) {
    entries.push(currentEntry as VocabEntry);
  }

  return entries;
}

export function parseSentences(grammarText: string): string[] {
  return grammarText
    .split('\n')
    .map(l => l.trim())
    .filter(l => l.length > 0 && !l.match(/^[-=]+$/));
}
