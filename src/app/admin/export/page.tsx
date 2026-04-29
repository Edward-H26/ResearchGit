import { auth, isAdmin } from "@/lib/auth";
import Link from "next/link";
import { redirect } from "next/navigation";

export default async function ExportAdminPage() {
  const session = await auth();
  if (!session?.user) redirect("/");
  if (!isAdmin(session.user.email)) redirect("/");

  return (
    <main className="flex min-h-screen items-center justify-center p-8">
      <div className="w-full max-w-lg space-y-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Admin: Researcher export</h1>
          <p className="mt-2 text-sm text-neutral-500">
            Download the full active deck (ideas, versions, anchor papers, sticky notes, telemetry
            events) as a single JSON file. Use this for offline analysis in pandas / Jupyter.
          </p>
        </div>

        <a
          href="/api/admin/export"
          className="inline-flex items-center justify-center gap-2 rounded-2xl bg-neutral-950 px-6 py-3 text-sm font-medium text-white transition hover:bg-neutral-800"
          download
        >
          Download JSON
        </a>

        <p className="text-xs text-neutral-400">
          Includes up to 50 000 telemetry events and all idea versions.
        </p>

        <Link
          href="/"
          className="block text-sm text-neutral-600 underline-offset-4 hover:underline"
        >
          ← Back home
        </Link>
      </div>
    </main>
  );
}
