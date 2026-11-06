import { createClient, type PostgrestError, type SupabaseClient } from "@supabase/supabase-js";
import { admin } from "./admin-client";
import type { Database } from "../lib/database.types";
import { demoPassword, SUPABASE_ANON_KEY, SUPABASE_URL } from "../lib/env";
import { demoEmail, findOrg } from "../lib/tree";

type Client = SupabaseClient<Database>;
type Result<T> = { data: T[] | null; error: PostgrestError | null };

const REFUSED = "42501";
const EASTERN_PATH = "head_office.eastern";

function anonClient(): Client {
  return createClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

// Signing in once per person keeps repeat runs under Supabase's sign-in rate limit.
const sessions = new Map<string, Client>();

async function signInAs(name: string): Promise<Client> {
  const open = sessions.get(name);
  if (open) return open;
  const client = anonClient();
  const { error } = await client.auth.signInWithPassword({
    email: demoEmail(name),
    password: demoPassword(),
  });
  if (error) throw new Error(`Sign-in as ${name}: ${error.message}`);
  sessions.set(name, client);
  return client;
}

// A failed query must never count as "0 rows", or a broken connection would pass every check.
function rows<T>({ data, error }: Result<T>): T[] {
  if (error) throw new Error(`Query failed: ${error.message}`);
  if (!data) throw new Error("Query returned no data");
  return data;
}

function assertSame(actual: (string | null)[], expected: string[]): void {
  const got = [...actual].sort().join(", ");
  const want = [...expected].sort().join(", ");
  if (got !== want) throw new Error(`expected [${want}], got [${got}]`);
}

async function visiblePeople(client: Client): Promise<string[]> {
  return rows(await client.from("people").select("full_name")).map((p) => p.full_name);
}

// The positive twin of every negative: "0 rows" proves nothing unless the rows really exist.
// These read through the service role, which sees everything.
async function idsThatExist(names: string[]): Promise<string[]> {
  const found = rows(await admin.from("people").select("id").in("full_name", names));
  if (found.length !== names.length) {
    throw new Error(`Twin failed, not all of these exist: ${names.join(", ")}`);
  }
  return found.map((p) => p.id);
}

async function assertAllTablesHaveRows(): Promise<void> {
  const counts = {
    organizations: rows(await admin.from("organizations").select("id")).length,
    people: rows(await admin.from("people").select("id")).length,
    notes: rows(await admin.from("notes").select("id")).length,
    vault_test: rows(await admin.from("vault_test").select("id")).length,
    team_directory: rows(await admin.from("team_directory").select("full_name")).length,
  };
  const empty = Object.entries(counts).filter(([, count]) => count === 0);
  if (empty.length > 0) throw new Error(`Twin failed, empty: ${empty.map(([t]) => t).join(", ")}`);
}

async function idOf(name: string): Promise<string> {
  const [id] = await idsThatExist([name]);
  if (!id) throw new Error(`Twin failed, ${name} does not exist`);
  return id;
}

async function assertHidden(viewer: string, names: string[]): Promise<void> {
  const ids = await idsThatExist(names);
  const client = await signInAs(viewer);
  const found = rows(await client.from("people").select("full_name").in("id", ids));
  assertSame(
    found.map((p) => p.full_name),
    [],
  );
}

async function assertSeesNothing(client: Client): Promise<void> {
  await assertAllTablesHaveRows();
  const counts = {
    organizations: rows(await client.from("organizations").select("id")).length,
    people: rows(await client.from("people").select("id")).length,
    notes: rows(await client.from("notes").select("id")).length,
    vault_test: rows(await client.from("vault_test").select("id")).length,
    team_directory: rows(await client.from("team_directory").select("full_name")).length,
  };
  const leaks = Object.entries(counts).filter(([, count]) => count > 0);
  if (leaks.length > 0) throw new Error(`rows returned from: ${leaks.map(([t]) => t).join(", ")}`);
}

async function samSeesOnlyTheirBranch(): Promise<void> {
  assertSame(await visiblePeople(await signInAs("Sam")), ["Sam", "Tia", "Tom", "Uma", "Raj"]);
}

async function samCannotFetchWestById(): Promise<void> {
  await assertHidden("Sam", ["Wes", "Val", "Zed"]);
}

async function samCannotFetchHanaById(): Promise<void> {
  await assertHidden("Sam", ["Hana"]);
}

async function samSeesOnlyTheirOrgs(): Promise<void> {
  const sam = await signInAs("Sam");
  const orgs = rows(await sam.from("organizations").select("name"));
  assertSame(
    orgs.map((o) => o.name),
    ["East", "Team 1", "Team 2"],
  );
}

async function wesSeesOnlyTheirBranch(): Promise<void> {
  assertSame(await visiblePeople(await signInAs("Wes")), ["Wes", "Val", "Zed"]);
}

async function hanaSeesEveryone(): Promise<void> {
  assertSame(await visiblePeople(await signInAs("Hana")), [
    "Hana",
    "Sam",
    "Eli",
    "Wes",
    "Tia",
    "Tom",
    "Uma",
    "Raj",
    "Val",
    "Zed",
  ]);
}

async function tiaSeesOnlyThemself(): Promise<void> {
  await idsThatExist(["Tom"]);
  assertSame(await visiblePeople(await signInAs("Tia")), ["Tia"]);
}

async function tiaCannotSeeSideways(): Promise<void> {
  await assertHidden("Tia", ["Uma", "Raj"]);
}

async function tiaCannotSeeUpwards(): Promise<void> {
  await assertHidden("Tia", ["Sam", "Hana"]);
}

async function samCannotSeeTheirOwnOrgPeer(): Promise<void> {
  await assertHidden("Sam", ["Eli"]);
}

async function signedOutSeesNothing(): Promise<void> {
  await assertSeesNothing(anonClient());
}

async function loginWithNoPersonSeesNothing(): Promise<void> {
  await assertSeesNothing(await signInAs("Nobody"));
}

async function samCannotReadVault(): Promise<void> {
  if (rows(await admin.from("vault_test").select("id")).length === 0) {
    throw new Error("Twin failed, vault_test is empty");
  }
  const sam = await signInAs("Sam");
  assertSame(
    rows(await sam.from("vault_test").select("secret")).map((v) => v.secret),
    [],
  );
}

async function snapshotPeople(): Promise<string> {
  const all = rows(await admin.from("people").select("id, full_name, org_id").order("id"));
  return JSON.stringify(all);
}

async function samCannotWritePeople(): Promise<void> {
  const sam = await signInAs("Sam");
  const tiaId = await idOf("Tia");
  const before = await snapshotPeople();

  // Insert is checked by code, because a foreign key error would also "fail" without proving anything.
  const insert = await sam
    .from("people")
    .insert({ id: tiaId, full_name: "Intruder", org_id: findOrg("West").id });
  if (insert.error?.code !== REFUSED) {
    throw new Error(`insert was not refused: ${insert.error?.message ?? "it succeeded"}`);
  }

  // Sam can read Tia, so these zero-row results come from the missing write policies, not visibility.
  const update = await sam
    .from("people")
    .update({ full_name: "Intruder" })
    .eq("id", tiaId)
    .select();
  assertSame(
    rows(update).map((p) => p.full_name),
    [],
  );
  const remove = await sam.from("people").delete().eq("id", tiaId).select();
  assertSame(
    rows(remove).map((p) => p.full_name),
    [],
  );

  if ((await snapshotPeople()) !== before) throw new Error("the people table changed");
}

async function samCannotMoveThemself(): Promise<void> {
  const sam = await signInAs("Sam");
  const before = await snapshotPeople();
  const visibleBefore = await visiblePeople(sam);

  const { error } = await sam
    .from("people")
    .update({ org_id: findOrg("Head office").id })
    .eq("id", await idOf("Sam"));
  if (error?.code !== REFUSED) {
    throw new Error(`update was not refused: ${error?.message ?? "it returned no error"}`);
  }

  if ((await snapshotPeople()) !== before) throw new Error("the people table changed");
  assertSame(await visiblePeople(sam), visibleBefore);
}

async function samSeesNotesForTheirTeamsOnly(): Promise<void> {
  const allNotes = rows(await admin.from("notes").select("org_id"));
  if (!allNotes.some((n) => n.org_id === findOrg("Team 3").id)) {
    throw new Error("Twin failed, Team 3 has no note");
  }
  const sam = await signInAs("Sam");
  const notes = rows(await sam.from("notes").select("org_id"));
  assertSame(
    notes.map((n) => n.org_id),
    [findOrg("Team 1").id, findOrg("Team 2").id],
  );
}

async function samCannotSeeLookalikeOrg(): Promise<void> {
  const eastern = rows(await admin.from("organizations").select("id").eq("path", EASTERN_PATH));
  if (eastern.length !== 1) throw new Error(`Twin failed, no org at ${EASTERN_PATH}`);
  const sam = await signInAs("Sam");
  const seen = rows(await sam.from("organizations").select("name").eq("path", EASTERN_PATH));
  assertSame(
    seen.map((o) => o.name),
    [],
  );
}

async function moveSam(orgName: string): Promise<void> {
  const { error } = await admin
    .from("people")
    .update({ org_id: findOrg(orgName).id })
    .eq("id", await idOf("Sam"));
  if (error) throw new Error(`Moving Sam to ${orgName}: ${error.message}`);
}

async function accessToken(client: Client): Promise<string> {
  const { data, error } = await client.auth.getSession();
  if (error || !data.session) throw new Error("Expected an open session");
  return data.session.access_token;
}

async function movingSamAppliesWithoutNewLogin(): Promise<void> {
  const sam = await signInAs("Sam");
  const tokenBefore = await accessToken(sam);
  try {
    await moveSam("West");
    assertSame(await visiblePeople(sam), ["Sam", "Val", "Zed"]);
    if ((await accessToken(sam)) !== tokenBefore) {
      throw new Error("the session changed during the check");
    }
  } finally {
    await moveSam("East");
  }
}

async function directoryViewObeysRls(): Promise<void> {
  const everyone = rows(await admin.from("team_directory").select("org_name"));
  if (!everyone.some((d) => d.org_name === "West")) {
    throw new Error("Twin failed, the view has no West rows");
  }
  const sam = await signInAs("Sam");
  const directory = rows(await sam.from("team_directory").select("full_name"));
  assertSame(
    directory.map((d) => d.full_name),
    ["Sam", "Tia", "Tom", "Uma", "Raj"],
  );
}

async function callMyOrgPath(headers: Record<string, string>): Promise<number> {
  const token = await accessToken(await signInAs("Sam"));
  const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/my_org_path`, {
    method: "POST",
    headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${token}`, ...headers },
  });
  return response.status;
}

// Both checks use exact statuses, because any other failure, such as a bad key, would also look "unreachable".
async function privateSchemaIsNotExposed(): Promise<void> {
  const status = await callMyOrgPath({ "Content-Profile": "private" });
  if (status !== 406) throw new Error(`expected HTTP 406, got ${status}`);
}

async function myOrgPathIsNotAPublicRpc(): Promise<void> {
  const status = await callMyOrgPath({});
  if (status !== 404) throw new Error(`expected HTTP 404, got ${status}`);
}

// Scoped to this demo's tables because the Supabase project is shared with an unrelated app.
// In a project of its own, drop the filter so that the check covers every public table.
const DEMO_TABLES = ["organizations", "people", "notes", "vault_test"];

async function everyDemoTableHasForcedRls(): Promise<void> {
  const allTables = rows(await admin.rpc("rls_status"));
  const tables = allTables.filter((t) => DEMO_TABLES.includes(t.table_name));
  if (tables.length !== DEMO_TABLES.length) {
    throw new Error(`Twin failed, expected ${DEMO_TABLES.length} tables, got ${tables.length}`);
  }

  const unprotected = tables.filter((t) => !t.rls_enabled || !t.rls_forced);
  if (unprotected.length > 0) {
    throw new Error(`not enabled and forced: ${unprotected.map((t) => t.table_name).join(", ")}`);
  }

  const sam = await signInAs("Sam");
  const { error } = await sam.rpc("rls_status");
  if (error?.code !== REFUSED) throw new Error("rls_status should be refused for signed-in users");
}

const CHECKS: [string, () => Promise<void>][] = [
  ["Sam sees exactly Sam, Tia, Tom, Uma, Raj", samSeesOnlyTheirBranch],
  ["Sam asks for Wes, Val and Zed by id and gets 0 rows", samCannotFetchWestById],
  ["Sam asks for Hana by id and gets 0 rows", samCannotFetchHanaById],
  ["Sam sees only East, Team 1, Team 2 in organizations", samSeesOnlyTheirOrgs],
  ["Wes sees exactly Wes, Val, Zed", wesSeesOnlyTheirBranch],
  ["Hana sees all ten people", hanaSeesEveryone],
  ["Tia sees only Tia, not Tom in the same team", tiaSeesOnlyThemself],
  ["Tia cannot see Uma or Raj in Team 2 (lateral)", tiaCannotSeeSideways],
  ["Tia cannot see Sam or Hana (upward)", tiaCannotSeeUpwards],
  ["Sam cannot see Eli, who is also in East (strict mode)", samCannotSeeTheirOwnOrgPeer],
  ["A signed-out client sees 0 rows in every table and the view", signedOutSeesNothing],
  [
    "A login with no people row sees 0 rows in every table and the view",
    loginWithNoPersonSeesNothing,
  ],
  ["Sam selects from vault_test and gets 0 rows", samCannotReadVault],
  ["Sam cannot insert, update or delete a person", samCannotWritePeople],
  ["Sam cannot change their own org_id, and sees the same people after", samCannotMoveThemself],
  ["Sam sees notes for Team 1 and Team 2 only", samSeesNotesForTheirTeamsOnly],
  [
    "Sam cannot see Eastern, whose path starts with East's (prefix safety)",
    samCannotSeeLookalikeOrg,
  ],
  ["Moving Sam to West changes what Sam sees with no new login", movingSamAppliesWithoutNewLogin],
  ["Sam reads team_directory and gets the same five people", directoryViewObeysRls],
  ["Sam cannot reach my_org_path in the private schema", privateSchemaIsNotExposed],
  ["Sam calls /rest/v1/rpc/my_org_path and it is not found", myOrgPathIsNotAPublicRpc],
  ["All four demo tables have RLS enabled and forced", everyDemoTableHasForcedRls],
];

async function main(): Promise<void> {
  let failures = 0;
  for (const [index, [name, check]] of CHECKS.entries()) {
    try {
      await check();
      console.log(`PASS  ${index + 1}. ${name}`);
    } catch (error) {
      failures += 1;
      console.log(`FAIL  ${index + 1}. ${name}: ${error instanceof Error ? error.message : error}`);
    }
  }
  console.log(`\n${CHECKS.length - failures} of ${CHECKS.length} passed`);
  process.exit(failures === 0 ? 0 : 1);
}

void main();
