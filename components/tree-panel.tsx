import { TREE, type OrgNode } from "@/lib/tree";

type Organization = { id: string; name: string };
type Person = { id: string; full_name: string; org_id: string };
type Props = { ownOrgId: string; organizations: Organization[]; people: Person[] };

const STATUS_STYLES = {
  own: "border-blue-700 bg-blue-100",
  visible: "border-green-700 bg-green-100",
  hidden: "border-gray-400 bg-gray-200 text-gray-700",
};

export function TreePanel(props: Props) {
  return (
    <section className="rounded border border-gray-300 p-4">
      <h2 className="text-lg font-semibold">Your view of the organization</h2>
      <p className="mb-4 text-sm text-gray-700">
        Blue is you. Green came back from the database. Grey did not.
      </p>
      <ul className="flex justify-center">
        <OrgBranch node={TREE} {...props} />
      </ul>
    </section>
  );
}

function OrgBranch({ node, ...props }: Props & { node: OrgNode }) {
  return (
    <li className="tree-node">
      <OrgBox node={node} {...props} />
      {node.children.length > 0 && (
        <ul className="tree-children w-full">
          {node.children.map((child) => (
            <OrgBranch key={child.id} node={child} {...props} />
          ))}
        </ul>
      )}
    </li>
  );
}

function OrgBox({ node, ownOrgId, organizations, people }: Props & { node: OrgNode }) {
  const returned = organizations.some((org) => org.id === node.id);
  const status = !returned ? "hidden" : node.id === ownOrgId ? "own" : "visible";
  const members = people.filter((person) => person.org_id === node.id);

  return (
    <div className={`w-40 rounded border-2 p-3 text-center ${STATUS_STYLES[status]}`}>
      <div className="font-semibold">{node.name}</div>
      {status === "hidden" ? (
        <div className="text-sm">Hidden</div>
      ) : (
        <ul className="text-sm">
          {members.map((person) => (
            <li key={person.id}>{person.full_name}</li>
          ))}
        </ul>
      )}
    </div>
  );
}
