// Hardcoded because the database will not return the orgs a user may not see,
// and the screen has to draw those as "Hidden". Holds names and layout only, never who can see what.
// The seed reads these ids too, so the screen and the database cannot disagree.
export type OrgNode = {
  id: string;
  name: string;
  children: OrgNode[];
};

const TEAM_1: OrgNode = {
  id: "00000000-0000-4000-a000-000000000004",
  name: "Team 1",
  children: [],
};
const TEAM_2: OrgNode = {
  id: "00000000-0000-4000-a000-000000000005",
  name: "Team 2",
  children: [],
};
const TEAM_3: OrgNode = {
  id: "00000000-0000-4000-a000-000000000006",
  name: "Team 3",
  children: [],
};
const EAST: OrgNode = {
  id: "00000000-0000-4000-a000-000000000002",
  name: "East",
  children: [TEAM_1, TEAM_2],
};
const WEST: OrgNode = {
  id: "00000000-0000-4000-a000-000000000003",
  name: "West",
  children: [TEAM_3],
};

export const TREE: OrgNode = {
  id: "00000000-0000-4000-a000-000000000001",
  name: "Head office",
  children: [EAST, WEST],
};

// Parents come before children, because an org's path is built from its parent's path.
export function flattenTree(node: OrgNode = TREE): OrgNode[] {
  return [node, ...node.children.flatMap((child) => flattenTree(child))];
}

export function findOrg(name: string): OrgNode {
  const org = flattenTree().find((node) => node.name === name);
  if (!org) throw new Error(`No organization named ${name}`);
  return org;
}

// The five people the login page offers, one from each level and branch of the tree.
export const LOGINS = [
  { name: "Hana", org: "Head office" },
  { name: "Sam", org: "East" },
  { name: "Wes", org: "West" },
  { name: "Tia", org: "Team 1" },
  { name: "Val", org: "Team 3" },
];

export function demoEmail(firstName: string): string {
  return `${firstName.toLowerCase()}@example.com`;
}
