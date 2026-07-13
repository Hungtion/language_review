import { supabase } from "./supabase";

export type DailyActivity = {
  activity_date: string;
  cards_reviewed: number;
  notes_added: number;
  nuance_used: number;
  leaf_earned: number;
  streak_bonus_claimed: boolean;
};

const STREAK_REWARDS: Record<number, number> = {
  3: 2,
  7: 5,
  14: 8,
  30: 15,
};

/** Check if a day counts as "studied" */
function isStudyDay(a: DailyActivity): boolean {
  return a.notes_added >= 1 || a.cards_reviewed >= 5 || a.nuance_used >= 1;
}

/** Calculate streak from activity records (sorted DESC by date) */
export function calculateStreak(activities: DailyActivity[]): number {
  if (activities.length === 0) return 0;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayStr = today.toISOString().split("T")[0];

  // Check if today or yesterday has activity (allow "today not yet done")
  const firstDate = activities[0]?.activity_date;
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().split("T")[0];

  if (firstDate !== todayStr && firstDate !== yesterdayStr) return 0;

  let streak = 0;
  const startDate = new Date(firstDate);

  for (let i = 0; i < activities.length; i++) {
    const expected = new Date(startDate);
    expected.setDate(expected.getDate() - i);
    const expectedStr = expected.toISOString().split("T")[0];

    if (activities[i].activity_date !== expectedStr) break;
    if (!isStudyDay(activities[i])) break;
    streak++;
  }

  return streak;
}

/** Get streak reward for a given streak count, returns 0 if not a milestone */
export function getStreakReward(streak: number): number {
  return STREAK_REWARDS[streak] || 0;
}

/** Get all streak milestones */
export function getStreakMilestones(): { days: number; reward: number }[] {
  return Object.entries(STREAK_REWARDS).map(([days, reward]) => ({
    days: Number(days),
    reward,
  }));
}

/** Record a study action for today */
export async function recordActivity(
  userId: string,
  action: "card_review" | "note_add" | "nuance_use",
  count: number = 1,
): Promise<{ streak: number; leafEarned: number; milestone: number | null }> {
  const today = new Date().toISOString().split("T")[0];

  // Upsert today's activity
  const { data: existing } = await supabase
    .from("daily_activity")
    .select("*")
    .eq("user_id", userId)
    .eq("activity_date", today)
    .maybeSingle();

  const updates: Record<string, number> = {};
  if (action === "card_review") updates.cards_reviewed = (existing?.cards_reviewed || 0) + count;
  if (action === "note_add") updates.notes_added = (existing?.notes_added || 0) + count;
  if (action === "nuance_use") updates.nuance_used = (existing?.nuance_used || 0) + count;

  if (existing) {
    await supabase
      .from("daily_activity")
      .update(updates)
      .eq("user_id", userId)
      .eq("activity_date", today);
  } else {
    await supabase
      .from("daily_activity")
      .insert({ user_id: userId, activity_date: today, ...updates });
  }

  // Get recent activities for streak calculation
  const { data: activities } = await supabase
    .from("daily_activity")
    .select("*")
    .eq("user_id", userId)
    .order("activity_date", { ascending: false })
    .limit(60);

  // Re-fetch today's data after update
  const { data: todayData } = await supabase
    .from("daily_activity")
    .select("*")
    .eq("user_id", userId)
    .eq("activity_date", today)
    .maybeSingle();

  const allActivities = activities || [];
  // Replace today's entry with fresh data
  const idx = allActivities.findIndex((a) => a.activity_date === today);
  if (idx >= 0 && todayData) allActivities[idx] = todayData;

  const streak = calculateStreak(allActivities as DailyActivity[]);

  // Check daily leaf (first qualifying action of the day)
  let leafEarned = 0;
  let milestone: number | null = null;

  if (todayData && !todayData.leaf_earned && isStudyDay(todayData as DailyActivity)) {
    leafEarned = 1; // Daily attendance leaf

    // Check streak milestone
    const reward = getStreakReward(streak);
    if (reward > 0 && !todayData.streak_bonus_claimed) {
      leafEarned += reward;
      milestone = streak;
      await supabase
        .from("daily_activity")
        .update({ leaf_earned: leafEarned, streak_bonus_claimed: true })
        .eq("user_id", userId)
        .eq("activity_date", today);
    } else {
      await supabase
        .from("daily_activity")
        .update({ leaf_earned: leafEarned })
        .eq("user_id", userId)
        .eq("activity_date", today);
    }

    // Add to user_credits balance
    const { data: credit } = await supabase
      .from("user_credits")
      .select("balance")
      .eq("user_id", userId)
      .maybeSingle();

    if (credit) {
      await supabase
        .from("user_credits")
        .update({ balance: credit.balance + leafEarned, updated_at: new Date().toISOString() })
        .eq("user_id", userId);
    } else {
      await supabase
        .from("user_credits")
        .insert({ user_id: userId, balance: leafEarned });
    }
  }

  return { streak, leafEarned, milestone };
}

/** Get activity data for calendar (last N days) */
export async function getActivityCalendar(
  userId: string,
  days: number = 90,
): Promise<DailyActivity[]> {
  const since = new Date();
  since.setDate(since.getDate() - days);
  const sinceStr = since.toISOString().split("T")[0];

  const { data } = await supabase
    .from("daily_activity")
    .select("activity_date, cards_reviewed, notes_added, nuance_used, leaf_earned, streak_bonus_claimed")
    .eq("user_id", userId)
    .gte("activity_date", sinceStr)
    .order("activity_date", { ascending: true });

  return (data || []) as DailyActivity[];
}
