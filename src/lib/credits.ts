import { supabase } from "./supabase";

export async function getCredits(userId: string): Promise<number> {
  const { data } = await supabase
    .from("user_credits")
    .select("balance")
    .eq("user_id", userId)
    .maybeSingle();
  return data?.balance ?? 0;
}

export async function deductCredit(userId: string): Promise<boolean> {
  const { data } = await supabase
    .from("user_credits")
    .select("balance")
    .eq("user_id", userId)
    .maybeSingle();

  const balance = data?.balance ?? 0;
  if (balance <= 0) return false;

  await supabase
    .from("user_credits")
    .update({ balance: balance - 1, updated_at: new Date().toISOString() })
    .eq("user_id", userId);

  return true;
}

export async function createCreditRequest(
  userId: string,
  email: string,
  credits: number,
  amount: number,
): Promise<boolean> {
  const { error } = await supabase.from("credit_requests").insert({
    user_id: userId,
    email,
    credits,
    amount,
  });
  return !error;
}
