import { createClient, SupabaseClient } from "@supabase/supabase-js";

// Storage bucket that holds the original uploaded files.
export const KNOWLEDGE_BUCKET = "knowledge";

let cached: SupabaseClient | null = null;

// Server-only client using the service-role key. This bypasses RLS, which is
// fine for Phase 1 (no auth yet) because it is only ever used inside API routes.
export function getServiceClient(): SupabaseClient {
  if (cached) return cached;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error(
      "Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local.",
    );
  }
  cached = createClient(url, key, { auth: { persistSession: false } });
  return cached;
}
