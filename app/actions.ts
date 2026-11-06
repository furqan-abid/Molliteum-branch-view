"use server";

import { redirect } from "next/navigation";
import { demoPassword } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";
import { demoEmail, LOGINS } from "@/lib/tree";

// Signing in on the server keeps the demo password out of the browser.
// The name comes from the client, so it is checked against the offered logins.
export async function logIn(formData: FormData): Promise<void> {
  const firstName = formData.get("firstName");
  if (typeof firstName !== "string" || !LOGINS.some((login) => login.name === firstName)) {
    redirect("/login?error=1");
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: demoEmail(firstName),
    password: demoPassword(),
  });
  redirect(error ? "/login?error=1" : "/");
}

export async function logOut(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
