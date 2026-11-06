import { redirect } from "next/navigation";
import { logIn } from "@/app/actions";
import { createClient } from "@/lib/supabase/server";
import { LOGINS } from "@/lib/tree";

type Props = { searchParams: Promise<{ error?: string }> };

export default async function LoginPage({ searchParams }: Props) {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (data.user) redirect("/");

  const { error } = await searchParams;

  return (
    <section className="mx-auto max-w-md space-y-4 pt-12">
      <h1 className="text-2xl font-semibold">Branch View</h1>
      <p>Log in as someone, then see what the database will show them.</p>
      {error && (
        <p role="alert" className="rounded border border-red-300 bg-red-50 p-3 text-red-800">
          That login did not work. Please try again.
        </p>
      )}
      <div className="space-y-2">
        {LOGINS.map(({ name, org }) => (
          <form key={name} action={logIn.bind(null, name)}>
            <button
              type="submit"
              className="w-full rounded border border-gray-400 bg-white px-4 py-3 text-left hover:bg-gray-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700"
            >
              Log in as {name} ({org})
            </button>
          </form>
        ))}
      </div>
    </section>
  );
}
