// The service role key is deliberately absent. It is read only inside scripts/.
export function requireEnv(name: string, value: string | undefined = process.env[name]): string {
  if (!value) {
    throw new Error(`Missing environment variable ${name}. See .env.example.`);
  }
  return value;
}

// Next.js inlines NEXT_PUBLIC_ variables only where they are written out in full,
// so these must pass process.env.NAME directly rather than look it up by name.
export const SUPABASE_URL = requireEnv(
  "NEXT_PUBLIC_SUPABASE_URL",
  process.env.NEXT_PUBLIC_SUPABASE_URL,
);
export const SUPABASE_ANON_KEY = requireEnv(
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
);

// A function rather than a constant, so importing this file in the browser does not throw:
// the password is not public, and only server code ever calls this.
export function demoPassword(): string {
  return requireEnv("DEMO_PASSWORD");
}
