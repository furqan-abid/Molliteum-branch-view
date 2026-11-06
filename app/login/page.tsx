import { redirect } from "next/navigation";
import { logIn } from "@/app/actions";
import { LoginButtons } from "@/components/login-buttons";
import { createClient } from "@/lib/supabase/server";

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
      <form action={logIn}>
        <LoginButtons />
      </form>
    </section>
  );
}
