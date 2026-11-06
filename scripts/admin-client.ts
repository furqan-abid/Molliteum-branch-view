import { createClient } from "@supabase/supabase-js";
import type { Database } from "../lib/database.types";
import { requireEnv, SUPABASE_URL } from "../lib/env";

// This bypasses RLS, so it is the only file that reads the service role key, and it stays in scripts/.
export const admin = createClient<Database>(SUPABASE_URL, requireEnv("SUPABASE_SERVICE_ROLE_KEY"), {
  auth: { persistSession: false, autoRefreshToken: false },
});
