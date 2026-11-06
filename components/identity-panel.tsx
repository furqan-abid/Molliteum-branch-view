import { logOut } from "@/app/actions";

type Props = { name: string; orgName: string };

export function IdentityPanel({ name, orgName }: Props) {
  return (
    <section className="flex items-center justify-between rounded border border-gray-300 p-4">
      <h1 className="text-xl font-semibold">
        You are {name}. You sit in {orgName}.
      </h1>
      <form action={logOut}>
        <button
          type="submit"
          className="rounded border border-gray-400 px-4 py-2 hover:bg-gray-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700"
        >
          Log out
        </button>
      </form>
    </section>
  );
}
