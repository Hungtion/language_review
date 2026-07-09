import { supabase } from "./supabase";

/** Sign in anonymously if not already signed in. Returns the user or null. */
export async function ensureUser() {
  const { data: { session } } = await supabase.auth.getSession();
  if (session?.user) return session.user;

  const { data, error } = await supabase.auth.signInAnonymously();
  if (error) return null;
  return data.user;
}
