import { logOut } from "@/app/actions";
import { LogOutButton } from "@/components/log-out-button";

type Props = { name: string; orgName: string };

export function IdentityPanel({ name, orgName }: Props) {
  return (
    <section className="flex items-center justify-between rounded border border-gray-300 p-4">
      <h1 className="text-xl font-semibold">
        You are {name}. You sit in {orgName}.
      </h1>
      <form action={logOut}>
        <LogOutButton />
      </form>
    </section>
  );
}
