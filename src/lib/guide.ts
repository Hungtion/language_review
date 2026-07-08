export type GuideStep = {
  selector: string;
  title: { en: string; ko: string };
  description: { en: string; ko: string };
  position?: "top" | "bottom" | "center" | "right" | "left" | "top-left";
  overlay?: boolean; // label directly on the element, no arrow
  noArrow?: boolean; // hide arrow even when not overlay
  noHighlight?: boolean; // hide highlight border
  tabLabels?: boolean; // render individual labels on each [data-guide-tab] child
};

export const GUIDE_STEPS: Record<string, GuideStep[]> = {
  home: [
    {
      selector: "[data-guide='stats']",
      title: { en: "Study Overview", ko: "학습 현황" },
      description: {
        en: "See your note counts at a glance.\nTap to jump to that language's notes.",
        ko: "학습 노트 현황을 한눈에 볼 수 있어요.\n탭하면 해당 언어 노트로 이동합니다.",
      },
      overlay: true,
    },
    {
      selector: "[data-guide='quick-actions']",
      title: { en: "Quick Actions", ko: "빠른 시작" },
      description: {
        en: "Add new study notes\nor review with flashcards.",
        ko: "새 노트를 입력하거나,\n카드로 복습할 수 있어요.",
      },
      overlay: true,
    },
    {
      selector: "[data-guide='recent-notes']",
      title: { en: "Recent Notes", ko: "최근 노트" },
      description: {
        en: "Your recent study notes appear here.\nTap to view details.",
        ko: "최근 학습 노트가 여기에 표시돼요.\n탭하면 상세 내용을 볼 수 있어요.",
      },
      overlay: true,
      position: "top",
    },
  ],
  add: [
    {
      selector: "[data-guide='add-header']",
      title: { en: "Title / Date / Language", ko: "제목 / 날짜 / 학습언어" },
      description: {
        en: "",
        ko: "",
      },
      overlay: true,
    },
    {
      selector: "[data-guide='add-textarea']",
      title: { en: "Enter Content", ko: "학습내용 입력하기" },
      description: {
        en: "Enter or paste your study content here.",
        ko: "학습 내용을 여기에 입력하거나\n붙여넣기 하세요.",
      },
      overlay: true,
    },
    {
      selector: "[data-guide='add-actions']",
      title: { en: "", ko: "" },
      description: {
        en: "Save to auto-create notes and review cards.",
        ko: "노트와 복습 카드가 자동으로 생성됩니다.",
      },
      position: "right",
    },
  ],
  review: [
    {
      selector: "[data-guide='review-filter-lang']",
      title: { en: "", ko: "" },
      description: {
        en: "Language",
        ko: "언어",
      },
      overlay: true,
    },
    {
      selector: "[data-guide='review-filter-type']",
      title: { en: "", ko: "" },
      description: {
        en: "Type",
        ko: "유형별 필터",
      },
      overlay: true,
    },
    {
      selector: "[data-guide='review-filters-right']",
      title: { en: "", ko: "" },
      description: {
        en: "Shuffle & auto-play TTS.",
        ko: "셔플, 자동재생",
      },
      overlay: true,
    },
    {
      selector: "[data-guide='review-card']",
      title: { en: "Flashcard", ko: "복습 카드" },
      description: {
        en: "Swipe left/right to navigate cards.\nTap to hear pronunciation.",
        ko: "좌우 스와이프로 카드를 넘기세요.\n탭하면 발음을 읽어줍니다.",
      },
      overlay: true,
      position: "top",
    },
    {
      selector: "[data-guide='review-ai']",
      title: { en: "", ko: "" },
      description: {
        en: "AI generates a related example sentence.\nTap [+] to save it.",
        ko: "AI가 관련 예문을 만들어줍니다.\n[+]를 눌러 노트에 저장하세요.",
      },
      overlay: true,
    },
  ],
  notes: [
    {
      selector: "[data-guide='notes-search']",
      title: { en: "", ko: "" },
      description: {
        en: "Search",
        ko: "검색",
      },
      overlay: true,
    },
    {
      selector: "[data-guide='notes-add']",
      title: { en: "", ko: "" },
      description: {
        en: "New Note",
        ko: "새 노트",
      },
      overlay: true,
    },
    {
      selector: "[data-guide='notes-lang']",
      title: { en: "", ko: "" },
      description: {
        en: "Language",
        ko: "언어",
      },
      overlay: true,
    },
    {
      selector: "[data-guide='notes-list']",
      title: { en: "", ko: "" },
      description: {
        en: "Tap a note to view details, edit, or delete.",
        ko: "노트를 탭하면 상세 내용을 보고\n편집/삭제할 수 있어요.",
      },
      overlay: true,
    },
  ],
  nuance: [
    {
      selector: "[data-guide='nuance-langs']",
      title: { en: "", ko: "" },
      description: {
        en: "Choose the language you want to learn.",
        ko: "배우고 싶은 언어를 선택하세요.",
      },
      position: "right",
    },
    {
      selector: "[data-guide='nuance-tone']",
      title: { en: "", ko: "" },
      description: {
        en: "Choose the nuance you want to express.",
        ko: "표현하고 싶은 뉘앙스를 선택하세요.",
      },
      position: "top-left",
    },
    {
      selector: "[data-guide='nuance-screen']",
      title: { en: "", ko: "" },
      description: {
        en: "You can speak in any language.\n\nTranslates Korean naturally,\nand corrects foreign languages\nto match context and nuance.\n\nTap [+] to save expressions to your notes.",
        ko: "어떤 언어로 말해도 좋아요.\n\n한국어는 자연스럽게 번역하고,\n외국어는 상황과 뉘앙스에 맞춰 교정해 드려요.\n\n마음에 드는 표현을 [+]를 눌러 노트에 저장해 보세요.",
      },
      overlay: true,
      position: "bottom",
      noHighlight: true,
    },
  ],
};

const TUTORIAL_PAGES = ["home", "add", "review", "notes", "nuance"];

export function isTutorialActive(): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem("tutorial-dismissed") !== "true";
}

export function dismissTutorial(): void {
  localStorage.setItem("tutorial-dismissed", "true");
  TUTORIAL_PAGES.forEach((p) => {
    localStorage.setItem(`guide-dismissed-${p}`, "true");
    localStorage.setItem(`tutorial-visited-${p}`, "true");
  });
}

export function resetTutorial(): void {
  localStorage.removeItem("tutorial-dismissed");
  TUTORIAL_PAGES.forEach((p) => {
    localStorage.removeItem(`tutorial-visited-${p}`);
    localStorage.removeItem(`guide-dismissed-${p}`);
  });
}

export function markPageVisited(pageKey: string): void {
  localStorage.setItem(`tutorial-visited-${pageKey}`, "true");
}

export function isPageVisited(pageKey: string): boolean {
  if (typeof window === "undefined") return true;
  return localStorage.getItem(`tutorial-visited-${pageKey}`) === "true";
}

export function getUnvisitedPages(): string[] {
  return TUTORIAL_PAGES.filter((p) => !isPageVisited(p));
}

export function isGuideDismissed(pageKey: string): boolean {
  if (typeof window === "undefined") return true;
  // In tutorial mode, show guide for unvisited pages
  if (isTutorialActive() && !isPageVisited(pageKey)) return false;
  return localStorage.getItem(`guide-dismissed-${pageKey}`) === "true";
}

export function dismissGuide(pageKey: string): void {
  localStorage.setItem(`guide-dismissed-${pageKey}`, "true");
  markPageVisited(pageKey);
  // Auto-dismiss tutorial when all pages visited
  if (getUnvisitedPages().length === 0) {
    dismissTutorial();
  }
}
