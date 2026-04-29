import { auth, isGoogleAuthConfigured, signIn, signOut } from "@/lib/auth";
import Link from "next/link";

export default async function Home() {
  const session = await auth();
  const user = session?.user ?? null;
  const googleAuthReady = isGoogleAuthConfigured();

  return (
    <main className="flex min-h-screen items-center justify-center p-8">
      <div className="w-full max-w-md text-center">
        <h1 className="text-4xl font-semibold tracking-tight">ResearchGit</h1>
        <p className="mt-3 text-neutral-500">Co-design probe for crowdsourced research ideation.</p>

        {user ? (
          <div className="mt-8 space-y-4">
            <p className="text-sm text-neutral-600">
              Signed in as{" "}
              <span className="font-medium text-neutral-900">{user.name ?? user.email}</span>
            </p>
            <div className="flex flex-col items-center gap-3">
              <Link
                href="/deck"
                className="inline-flex items-center justify-center rounded-2xl bg-neutral-950 px-6 py-3 text-sm font-medium text-white transition hover:bg-neutral-800"
              >
                Open the deck
              </Link>
              <form
                action={async () => {
                  "use server";
                  await signOut({ redirectTo: "/" });
                }}
              >
                <button
                  type="submit"
                  className="text-xs text-neutral-500 underline-offset-4 hover:text-neutral-900 hover:underline"
                >
                  Sign out
                </button>
              </form>
            </div>
          </div>
        ) : (
          <div className="mt-8 space-y-3">
            {googleAuthReady ? (
              <form
                action={async () => {
                  "use server";
                  await signIn("google", { redirectTo: "/deck" });
                }}
              >
                <button
                  type="submit"
                  className="inline-flex items-center justify-center gap-2 rounded-2xl bg-neutral-950 px-6 py-3 text-sm font-medium text-white transition hover:bg-neutral-800"
                >
                  <span aria-hidden="true">G</span>
                  <span>Sign in with Google</span>
                </button>
              </form>
            ) : (
              <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                Google auth is not configured. Set `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` to
                enable sign-in.
              </div>
            )}
          </div>
        )}
      </div>
    </main>
  );
}
