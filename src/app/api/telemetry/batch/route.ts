import { env } from "@/env";
import { auth } from "@/lib/auth";
import { TelemetryBatchSchema } from "@/lib/telemetry/types";
import { writeEventBatch } from "@/server/telemetry-service";
import { NextResponse } from "next/server";

function isAllowedOrigin(headers: Headers): boolean {
  const candidate = headers.get("origin") ?? headers.get("referer");
  if (!candidate) return false;
  try {
    return new URL(candidate).host === new URL(env.AUTH_URL).host;
  } catch {
    return false;
  }
}

export async function POST(req: Request) {
  if (!isAllowedOrigin(req.headers)) {
    return NextResponse.json({ error: "forbidden_origin" }, { status: 403 });
  }

  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ ok: true, count: 0, skipped: "unauthorized" });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const parsed = TelemetryBatchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "invalid_payload", issues: parsed.error.issues },
      { status: 400 },
    );
  }

  const count = await writeEventBatch({
    userId: session.user.id,
    events: parsed.data.events,
  });

  return NextResponse.json({ ok: true, count });
}
