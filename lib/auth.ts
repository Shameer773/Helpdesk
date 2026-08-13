import type { SupabaseClient, User } from "@supabase/supabase-js";
import { getServerSupabase } from "./supabase-server";

export type Role = "admin" | "user";

export type AuthContext = {
  user: User;
  role: Role;
  isAdmin: boolean;
};

// Emails listed in ADMIN_EMAILS are always treated as admins. This is the
// bootstrap mechanism (the first admin has no one to grant them the role) and a
// safety net if the profiles table ever gets out of sync.
function adminEmails(): string[] {
  return (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
}

export function isAdminEmail(email?: string | null): boolean {
  if (!email) return false;
  return adminEmails().includes(email.toLowerCase());
}

// Resolve a user's role: admin if their email is allowlisted or their profile
// row says so, otherwise a normal user.
export async function resolveRole(
  supabase: SupabaseClient,
  user: User,
): Promise<Role> {
  if (isAdminEmail(user.email)) return "admin";
  const { data } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();
  return data?.role === "admin" ? "admin" : "user";
}

// The signed-in user (with role) for the current request, or null if not logged
// in. Use inside Server Components and Route Handlers.
export async function getAuthContext(): Promise<AuthContext | null> {
  const supabase = await getServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const role = await resolveRole(supabase, user);
  return { user, role, isAdmin: role === "admin" };
}
