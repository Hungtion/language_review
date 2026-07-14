export type GuideStep = {
  selector: string;
  title: { en: string; ko: string };
  description: { en: string; ko: string };
  position?: "top" | "bottom" | "center" | "right" | "left" | "top-left" | "bottom-right";
  overlay?: boolean;
  noArrow?: boolean;
  noHighlight?: boolean;
  fontSize?: number;
  tabLabels?: boolean;
};

export const GUIDE_STEPS: Record<string, GuideStep[]> = {
  home: [
    {
      selector: "[data-guide='stats']",
      title: { en: "", ko: "" },
      description: {
        en: "See your stats at a glance.\nTap to jump to Notes, Review, Add, or Leaf.",
        ko: "학습 현황을 한눈에 볼 수 있어요.\n탭하면 노트, 복습, 추가, Leaf로 이동합니다.",
      },
      overlay: true,
    },
    {
      selector: "[data-guide='recent-notes']",
      title: { en: "", ko: "" },
      description: {
        en: "Your recent study notes appear here.\nTap to view details.\nTap the daily quote to save it as a card.",
        ko: "최근 학습 노트가 여기에 표시돼요.\n탭하면 상세 내용을 볼 수 있어요.\n오늘의 명언을 탭하면 카드로 저장됩니다.",
      },
      overlay: true,
      position: "top",
    },
  ],
  add: [
    {
      selector: "[data-guide='add-header']",
      title: { en: "", ko: "" },
      description: { en: "", ko: "" },
      tabLabels: true,
    },
    {
      selector: "[data-guide='add-template']",
      title: { en: "", ko: "" },
      description: {
        en: "Pick a study template by level.\nOPIc / JLPT vocab and sentences included.",
        ko: "레벨별 학습 템플릿을 선택할 수 있어요.\nOPIc / JLPT 어휘와 문장이 포함되어 있습니다.",
      },
      overlay: true,
    },
    {
      selector: "[data-guide='add-textarea']",
      title: { en: "", ko: "" },
      description: {
        en: "Enter or paste your study content.\nEach line becomes a review card.",
        ko: "학습 내용을 입력하거나 붙여넣기 하세요.\n각 줄이 복습 카드로 자동 생성됩니다.",
      },
      overlay: true,
    },
    {
      selector: "[data-guide='add-actions']",
      title: { en: "", ko: "" },
      description: {
        en: "Notes and review cards will be created.",
        ko: "노트와 복습카드가 생성됩니다.",
      },
      position: "top",
    },
  ],
  review: [
    {
      selector: "[data-guide='review-filter-lang']",
      title: { en: "", ko: "" },
      description: { en: "Language", ko: "언어" },
      overlay: true,
    },
    {
      selector: "[data-guide='review-filter-type']",
      title: { en: "", ko: "" },
      description: { en: "Type", ko: "유형별 필터" },
      overlay: true,
    },
    {
      selector: "[data-guide='review-filters-right']",
      title: { en: "", ko: "" },
      description: { en: "", ko: "" },
      tabLabels: true,
    },
    {
      selector: "[data-guide='review-autoplay']",
      title: { en: "", ko: "" },
      description: { en: "", ko: "" },
      tabLabels: true,
    },
    {
      selector: "[data-guide='review-card']",
      title: { en: "", ko: "" },
      description: {
        en: "Swipe left/right to navigate cards.\nTap to hear pronunciation.",
        ko: "좌우 스와이프로 카드를 넘기세요.\n탭하면 발음을 읽어줍니다.",
      },
      overlay: true,
      position: "top",
    },
    {
      selector: "[data-guide='review-mic']",
      title: { en: "", ko: "" },
      description: {
        en: "{icon:mic} to check your pronunciation.",
        ko: "{icon:mic} 으로 내 발음을 체크해 보세요.",
      },
      overlay: true,
      noHighlight: true,
    },
    {
      selector: "[data-guide='review-ai']",
      title: { en: "", ko: "" },
      description: {
        en: "LAB generates a related example sentence.\nTap [+] to save it.",
        ko: "LAB이 관련 예문을 만들어줍니다.\n[+]를 눌러 노트에 저장하세요.",
      },
      overlay: true,
    },
  ],
  notes: [
    {
      selector: "[data-guide='notes-search']",
      title: { en: "", ko: "" },
      description: { en: "Search", ko: "검색" },
      overlay: true,
    },
    {
      selector: "[data-guide='notes-add']",
      title: { en: "", ko: "" },
      description: { en: "Add\nNote", ko: "새 노트" },
      overlay: true,
    },
    {
      selector: "[data-guide='notes-lang']",
      title: { en: "", ko: "" },
      description: { en: "Language", ko: "언어" },
      overlay: true,
    },
    {
      selector: "[data-guide='notes-review']",
      title: { en: "", ko: "" },
      description: {
        en: "Jump to flashcard review.",
        ko: "카드 복습으로 바로 이동합니다.",
      },
      overlay: true,
    },
    {
      selector: "[data-guide='notes-pinned']",
      title: { en: "", ko: "" },
      description: {
        en: "Nuance Chat, LAB Examples, and Daily Quotes\nare always pinned here for quick access.",
        ko: "Nuance Chat, LAB Examples, Daily Quotes가\n항상 여기에 고정되어 바로 볼 수 있어요.",
      },
      overlay: true,
    },
    {
      selector: "[data-guide='notes-list']",
      title: { en: "", ko: "" },
      description: {
        en: "Tap a note to view details.\nSwipe left to share or delete, right to pin.\nPinned notes stay at the top.",
        ko: "노트를 탭하면 상세 내용을 볼 수 있어요.\n왼쪽 스와이프로 공유/삭제, 오른쪽으로 고정.\n고정된 노트는 항상 맨 위에 표시됩니다.",
      },
      overlay: true,
    },
  ],
  nuance: [
    {
      selector: "[data-guide='nuance-langs']",
      title: { en: "", ko: "" },
      description: { en: "Language", ko: "언어" },
      overlay: true,
    },
    {
      selector: "[data-guide='nuance-tone']",
      title: { en: "", ko: "" },
      description: {
        en: "Choose the nuance you want to express.",
        ko: "표현하고 싶은 뉘앙스를 선택하세요.",
      },
    },
    {
      selector: "[data-guide='nuance-screen']",
      title: { en: "", ko: "" },
      description: {
        en: "You can speak in any language.\n\nTranslates Korean naturally,\nand corrects foreign languages\nto match context and nuance.\n\nTap a sentence to hear pronunciation.\nTap [+] to save expressions to your notes.",
        ko: "어떤 언어로 말해도 좋아요.\n\n한국어는 자연스럽게 번역하고,\n외국어는 상황과 뉘앙스에 맞춰 교정해 드려요.\n\n문장을 탭하면 발음을 들을 수 있어요.\n[+]를 눌러 노트에 저장해 보세요.",
      },
      overlay: true,
      position: "bottom",
      noHighlight: true,
      fontSize: 20,
    },
  ],
  "note-detail": [
    {
      selector: "[data-guide='note-header']",
      title: { en: "", ko: "" },
      description: {
        en: "{row:{icon:card}|Review as flashcards}\n{row:{icon:share}|Share this note}\n{row:{icon:delete}|Delete this note}",
        ko: "{row:{icon:card}|노트 복습하기}\n{row:{icon:share}|노트 공유하기}\n{row:{icon:delete}|노트 삭제하기}",
      },
      overlay: true,
    },
    {
      selector: "[data-guide='note-sections']",
      title: { en: "", ko: "" },
      description: {
        en: "{row:{icon:edit}|Bulk edit mode}\n{row:{icon:share}|Copy card}\n{row:{icon:split}|AI splits cards}\n{row:{icon:delete}|Delete card}",
        ko: "{row:{icon:edit}|일괄 편집 모드}\n{row:{icon:share}|카드 복사하기}\n{row:{icon:split}|카드 나누기}\n{row:{icon:delete}|카드 지우기}",
      },
      overlay: true,
      fontSize: 18,
    },
  ],
  settings: [
    {
      selector: "[data-guide='settings-profile']",
      title: { en: "", ko: "" },
      description: {
        en: "My Info",
        ko: "내 정보",
      },
      overlay: true,
    },
    {
      selector: "[data-guide='settings-lang']",
      title: { en: "", ko: "" },
      description: {
        en: "Switch app language\nbetween English and Korean.",
        ko: "앱 언어를 영어/한국어로\n전환할 수 있어요.",
      },
      overlay: true,
    },
    {
      selector: "[data-guide='settings-theme']",
      title: { en: "", ko: "" },
      description: {
        en: "Customize display mode, theme style, and accent color.",
        ko: "화면 모드, 세부 테마, 나만의 컬러를 설정하세요.",
      },
      overlay: true,
    },
    {
      selector: "[data-guide='settings-tts']",
      title: { en: "", ko: "" },
      description: {
        en: "Choose your preferred TTS voice for each language.",
        ko: "언어별 음성(TTS)을 선택할 수 있어요.",
      },
      overlay: true,
    },
    {
      selector: "[data-guide='settings-account']",
      title: { en: "", ko: "" },
      description: {
        en: "Login Info",
        ko: "로그인정보",
      },
      overlay: true,
    },
  ],
};

export function isGuideDismissed(pageKey: string): boolean {
  if (typeof window === "undefined") return true;
  return localStorage.getItem(`guide-dismissed-${pageKey}`) === "true";
}

export function dismissGuide(pageKey: string): void {
  localStorage.setItem(`guide-dismissed-${pageKey}`, "true");
}

export function resetGuide(pageKey: string): void {
  localStorage.removeItem(`guide-dismissed-${pageKey}`);
}
