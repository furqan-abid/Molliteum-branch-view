"use client";

import { useFormStatus } from "react-dom";
import { Spinner } from "@/components/spinner";
import { LOGINS } from "@/lib/tree";

// All five buttons share one form, so a login in progress disables the others
// and form data shows which one was clicked.
export function LoginButtons() {
  const { pending, data } = useFormStatus();
  const chosen = data?.get("firstName");

  return (
    <div className="space-y-2">
      {LOGINS.map(({ name, org }) => (
        <button
          key={name}
          type="submit"
          name="firstName"
          value={name}
          disabled={pending}
          className="flex w-full items-center justify-between rounded border border-gray-400 bg-white px-4 py-3 text-left transition-colors hover:bg-gray-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700 disabled:cursor-not-allowed disabled:hover:bg-white [&:disabled:not([aria-busy=true])]:opacity-50"
          aria-busy={chosen === name}
        >
          {chosen === name ? `Logging in as ${name}...` : `Log in as ${name} (${org})`}
          {chosen === name && <Spinner />}
        </button>
      ))}
    </div>
  );
}
