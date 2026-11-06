// The service role key is imported only inside scripts/. Every client in this folder uses the
// anon key and the visitor's own session, so the database applies RLS to everything it runs.
import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "@/lib/database.types";
import { SUPABASE_ANON_KEY, SUPABASE_URL } from "@/lib/env";

export function createClient() {
  return createBrowserClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY);
}
