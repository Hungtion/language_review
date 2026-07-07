import { supabase } from "./supabase";

const DAILY_FREE_LIMIT = 5;

export async function getAiUsage(userId: string): Promise<{ count: number; remaining: number }> {
  const today = new Date().toISOString().split("T")[0];

  const { data } = await supabase
    .from("ai_usage")
    .select("count")
    .eq("user_id", userId)
    .eq("usage_date", today)
    .single();

  const count = data?.count || 0;
  return { count, remaining: Math.max(0, DAILY_FREE_LIMIT - count) };
}

export async function incrementAiUsage(userId: string): Promise<void> {
  const today = new Date().toISOString().split("T")[0];

  const { data } = await supabase
    .from("ai_usage")
    .select("count")
    .eq("user_id", userId)
    .eq("usage_date", today)
    .single();

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
    .single();

  if (data) {
    await supabase
      .from("ai_usage")
      .update({ count: 0 })
      .eq("user_id", userId)
      .eq("usage_date", today);
  }
}

export const DAILY_LIMIT = DAILY_FREE_LIMIT;
