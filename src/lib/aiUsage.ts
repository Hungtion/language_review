import { supabase } from "./supabase";
import { deductCredit } from "./credits";

const DAILY_FREE_LIMIT = 3;

export async function getAiUsage(userId: string): Promise<{ count: number; remaining: number }> {
  const today = new Date().toISOString().split("T")[0];

  const { data } = await supabase
    .from("ai_usage")
    .select("count")
    .eq("user_id", userId)
    .eq("usage_date", today)
    .maybeSingle();

  const count = data?.count || 0;
  return { count, remaining: Math.max(0, DAILY_FREE_LIMIT - count) };
}

/** Returns true if AI can be used (free or credit). Increments usage. */
export async function useAiCredit(userId: string): Promise<"free" | "credit" | "none"> {
  const { remaining } = await getAiUsage(userId);

  if (remaining > 0) {
    await incrementAiUsage(userId);
    return "free";
  }

  const ok = await deductCredit(userId);
  if (ok) {
    await incrementAiUsage(userId);
    return "credit";
  }

  return "none";
}

export async function incrementAiUsage(userId: string): Promise<void> {
  const today = new Date().toISOString().split("T")[0];

  const { data } = await supabase
    .from("ai_usage")
    .select("count")
    .eq("user_id", userId)
    .eq("usage_date", today)
    .maybeSingle();

  if (data) {
    await supabase
      .from("ai_usage")
      .update({ count: data.count + 1 })
      .eq("user_id", userId)
      .eq("usage_date", today);
  } else {
    await supabase
      .from("ai_usage")
      .insert({ user_id: userId, usage_date: today, count: 1 });
  }
}

export async function resetAiUsage(userId: string): Promise<void> {
  const today = new Date().toISOString().split("T")[0];

  const { data } = await supabase
    .from("ai_usage")
    .select("count")
    .eq("user_id", userId)
    .eq("usage_date", today)
    .maybeSingle();

  if (data) {
    await supabase
      .from("ai_usage")
      .update({ count: 0 })
      .eq("user_id", userId)
      .eq("usage_date", today);
  }
}

export const DAILY_LIMIT = DAILY_FREE_LIMIT;
export const GUEST_LIMIT = 5;

/** Guest: track usage in localStorage (no DB) */
export function getGuestUsage(): { count: number; remaining: number } {
  const count = parseInt(localStorage.getItem("guest-ai-used") || "0", 10);
  return { count, remaining: Math.max(0, GUEST_LIMIT - count) };
}

export function incrementGuestUsage(): { count: number; remaining: number } {
  const count = parseInt(localStorage.getItem("guest-ai-used") || "0", 10) + 1;
  localStorage.setItem("guest-ai-used", String(count));
  return { count, remaining: Math.max(0, GUEST_LIMIT - count) };
}
