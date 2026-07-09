import type { StudySession } from "./supabase";

const STORAGE_KEY = "guest-notes";

export function getGuestNotes(): StudySession[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
  } catch {
    return [];
  }
}

export function addGuestNote(note: Omit<StudySession, "id" | "created_at">): StudySession {
  const full: StudySession = {
    ...note,
    id: crypto.randomUUID(),
    created_at: new Date().toISOString(),
  };
  const notes = getGuestNotes();
  notes.unshift(full);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(notes));
  return full;
}

export function deleteGuestNote(id: string): void {
  const notes = getGuestNotes().filter((n) => n.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(notes));
}
