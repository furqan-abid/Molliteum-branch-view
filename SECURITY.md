# Security

## Service role key

This key bypasses RLS, so only `scripts/admin-client.ts` reads it, and the seed and tests are its only users. Nothing under `app/`, `components/` or `lib/` references it, and the deployed app does not have it.

## Views

A view normally runs as its owner, who bypasses RLS, so `team_directory` is created with `security_invoker = true` in `supabase/migrations/0001_init.sql`. Check 19 in `scripts/test.ts` proves it returns the caller's five rows and no West rows.

## Storage and realtime

Neither is used here, so neither has any data to leak. Storage would need its own policies on `storage.objects`, and realtime would need its channels authorized, because table policies alone would not cover uploaded files or broadcast messages.

## Stale logins

The caller's org is looked up from `people` on every query by `private.my_org_path()` in `supabase/migrations/0001_init.sql`, never read from the JWT. Check 18 in `scripts/test.ts` moves Sam with their session still open and confirms access changes at once.
