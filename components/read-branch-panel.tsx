"use client";

import { useState, type FormEvent } from "react";
import { Spinner } from "@/components/spinner";
import { createClient } from "@/lib/supabase/browser";
import { flattenTree } from "@/lib/tree";

const ORGS = flattenTree();

function describeRows(names: string[]): string {
  if (names.length === 0) return "The database returned 0 rows";
  const noun = names.length === 1 ? "row" : "rows";
  return `The database returned ${names.length} ${noun}: ${names.join(", ")}`;
}

// Runs in the browser on purpose: the query goes straight to the database as the logged-in
// person, with no server code of ours in between, and can be watched in the network tab.
export function ReadBranchPanel() {
  const [orgId, setOrgId] = useState(ORGS[0]?.id ?? "");
  const [result, setResult] = useState("");
  const [running, setRunning] = useState(false);

  async function runQuery(event: FormEvent) {
    event.preventDefault();
    setRunning(true);
    const { data, error } = await createClient()
      .from("people")
      .select("full_name")
      .eq("org_id", orgId)
      .order("full_name");
    setResult(
      error
        ? `The query failed: ${error.message}`
        : describeRows((data ?? []).map((person) => person.full_name)),
    );
    setRunning(false);
  }

  return (
    <section className="rounded border border-gray-300 p-4">
      <h2 className="mb-3 text-lg font-semibold">Try to read another branch</h2>
      <form onSubmit={runQuery} className="flex flex-wrap items-center gap-3">
        <label htmlFor="org">Organization</label>
        <select
          id="org"
          value={orgId}
          onChange={(event) => setOrgId(event.target.value)}
          className="rounded border border-gray-400 bg-white px-3 py-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700"
        >
          {ORGS.map((org) => (
            <option key={org.id} value={org.id}>
              {org.name}
            </option>
          ))}
        </select>
        <button
          type="submit"
          disabled={running}
          aria-busy={running}
          className="flex items-center gap-2 rounded border border-gray-400 px-4 py-2 transition-colors hover:bg-gray-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700 disabled:cursor-not-allowed"
        >
          {running && <Spinner />}
          Ask the database
        </button>
      </form>
      <p aria-live="polite" className="mt-3 font-mono text-sm">
        {running ? "Asking the database..." : result}
      </p>
    </section>
  );
}
