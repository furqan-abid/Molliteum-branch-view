import { admin } from "./admin-client";
import { demoPassword } from "../lib/env";
import { demoEmail, findOrg, TREE, type OrgNode } from "../lib/tree";

const PEOPLE = [
  { name: "Hana", org: "Head office" },
  { name: "Sam", org: "East" },
  { name: "Eli", org: "East" },
  { name: "Wes", org: "West" },
  { name: "Tia", org: "Team 1" },
  { name: "Tom", org: "Team 1" },
  { name: "Uma", org: "Team 2" },
  { name: "Raj", org: "Team 2" },
  { name: "Val", org: "Team 3" },
  { name: "Zed", org: "Team 3" },
];

// Test fixtures, not part of the drawn tree. "Eastern" sits beside East, and its path begins with
// East's, so a text prefix match would wrongly show it to Sam. "Nobody" logs in but has no people row.
const EASTERN: OrgNode = {
  id: "00000000-0000-4000-a000-000000000007",
  name: "Eastern",
  children: [],
};
const NO_PERSON = "Nobody";

// Fixed ids are what make a second run update these rows instead of adding more.
const NOTES = [
  { id: "00000000-0000-4000-b000-000000000001", org: "Team 1", body: "Team 1 note" },
  { id: "00000000-0000-4000-b000-000000000002", org: "Team 2", body: "Team 2 note" },
  { id: "00000000-0000-4000-b000-000000000003", org: "Team 3", body: "Team 3 note" },
];
const VAULT_ROW = {
  id: "00000000-0000-4000-c000-000000000001",
  secret: "If you can read this, RLS failed.",
};

async function seedOrg(node: OrgNode, parentId: string | null): Promise<void> {
  const { error } = await admin
    .from("organizations")
    .upsert({ id: node.id, name: node.name, parent_id: parentId });
  if (error) throw new Error(`Org ${node.name}: ${error.message}`);
  for (const child of node.children) {
    await seedOrg(child, node.id);
  }
}

async function seedAuthUser(name: string, existingIds: Map<string, string>): Promise<string> {
  const email = demoEmail(name);
  const password = demoPassword();
  const existingId = existingIds.get(email);
  if (existingId) {
    // Resetting the password means rotating DEMO_PASSWORD only takes another seed run.
    const { error } = await admin.auth.admin.updateUserById(existingId, { password });
    if (error) throw new Error(`User ${name}: ${error.message}`);
    return existingId;
  }
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (error) throw new Error(`User ${name}: ${error.message}`);
  return data.user.id;
}

async function seedPeople(): Promise<void> {
  const { data, error } = await admin.auth.admin.listUsers({ perPage: 1000 });
  if (error) throw new Error(`List users: ${error.message}`);
  const existingIds = new Map(data.users.map((user) => [user.email ?? "", user.id]));
  await seedAuthUser(NO_PERSON, existingIds);

  for (const person of PEOPLE) {
    const id = await seedAuthUser(person.name, existingIds);
    const { error: personError } = await admin
      .from("people")
      .upsert({ id, full_name: person.name, org_id: findOrg(person.org).id });
    if (personError) throw new Error(`Person ${person.name}: ${personError.message}`);
  }
}

async function seedNotes(): Promise<void> {
  const rows = NOTES.map(({ id, org, body }) => ({ id, org_id: findOrg(org).id, body }));
  const { error } = await admin.from("notes").upsert(rows);
  if (error) throw new Error(`Notes: ${error.message}`);
}

async function seedVault(): Promise<void> {
  const { error } = await admin.from("vault_test").upsert(VAULT_ROW);
  if (error) throw new Error(`Vault: ${error.message}`);
}

async function main(): Promise<void> {
  await seedOrg(TREE, null);
  await seedOrg(EASTERN, TREE.id);
  await seedPeople();
  await seedNotes();
  await seedVault();
  console.log(
    `Seeded 7 organizations, ${PEOPLE.length} people, ${NOTES.length} notes, 1 vault row.`,
  );
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
