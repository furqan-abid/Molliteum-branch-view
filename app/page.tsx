import { redirect } from "next/navigation";
import { IdentityPanel } from "@/components/identity-panel";
import { ReadBranchPanel } from "@/components/read-branch-panel";
import { TreePanel } from "@/components/tree-panel";
import { createClient } from "@/lib/supabase/server";

export default async function HomePage() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) redirect("/login");

  const [me, organizations, people] = await Promise.all([
    supabase.from("people").select("full_name, org_id").eq("id", data.user.id).maybeSingle(),
    supabase.from("organizations").select("id, name"),
    supabase.from("people").select("id, full_name, org_id").order("full_name"),
  ]);

  const failure = me.error ?? organizations.error ?? people.error;
  if (failure) return <LoadError message={`The database query failed: ${failure.message}`} />;
  if (!me.data) return <LoadError message="This login has no matching person in the database." />;

  const ownOrg = organizations.data?.find((org) => org.id === me.data?.org_id);

  return (
    <>
      <IdentityPanel name={me.data.full_name} orgName={ownOrg?.name ?? "an unknown organization"} />
      <TreePanel
        ownOrgId={me.data.org_id}
        organizations={organizations.data ?? []}
        people={people.data ?? []}
      />
      <ReadBranchPanel />
    </>
  );
}

function LoadError({ message }: { message: string }) {
  return (
    <p role="alert" className="rounded border border-red-300 bg-red-50 p-3 text-red-800">
      {message}
    </p>
  );
}
