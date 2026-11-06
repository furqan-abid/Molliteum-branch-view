"use client";

import { useFormStatus } from "react-dom";
import { Spinner } from "@/components/spinner";

export function LogOutButton() {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      aria-busy={pending}
      className="flex items-center gap-2 rounded border border-gray-400 px-4 py-2 transition-colors hover:bg-gray-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700 disabled:cursor-not-allowed"
    >
      {pending && <Spinner />}
      {pending ? "Logging out..." : "Log out"}
    </button>
  );
}
