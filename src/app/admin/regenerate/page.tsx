import { RegeneratePanel } from "@/components/admin/RegeneratePanel";
import { requireAdminUser } from "@/lib/auth/guards";
import Link from "next/link";

export default async function RegenerateAdminPage({
  searchParams,
}: {
  searchParams: Promise<{ ok?: string }>;
}) {
  await requireAdminUser();

  const params = await searchParams;
  const ok = params.ok ? Number(params.ok) : null;

  return (
    <main className="flex min-h-screen items-center justify-center p-8">
      <div className="w-full max-w-lg space-y-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Admin: Regenerate deck</h1>
          <p className="mt-2 text-sm text-neutral-500">
            Samples 10 of 20 clusters, asks the configured OpenAI model for one idea per cluster in
            parallel, and writes the new{" "}
            <code className="rounded bg-neutral-200 px-1 py-0.5 text-xs">Deck</code> as the active
            one. The previous active deck is archived. Existing canvases are not deleted.
          </p>
        </div>

        <RegeneratePanel initialOk={ok} />

        <p className="text-xs text-neutral-400">
          10 OpenAI requests run concurrently (~10-20 seconds total). Watch the activity log for
          per-idea progress and any errors.
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
