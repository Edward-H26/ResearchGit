import { env } from "@/env";
import { auth, isAdmin } from "@/lib/auth";
import { type RegenerateProgressEvent, regenerateActiveDeck } from "@/server/deck-service";
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

function encodeEvent(event: RegenerateProgressEvent): Uint8Array {
  return new TextEncoder().encode(`${JSON.stringify(event)}\n`);
}

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  if (!isAllowedOrigin(req.headers)) {
    return NextResponse.json({ error: "forbidden_origin" }, { status: 403 });
  }

  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  if (!isAdmin(session.user.email)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const userId = session.user.id;

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (event: RegenerateProgressEvent) => {
        try {
          controller.enqueue(encodeEvent(event));
        } catch {
          // Client disconnected mid-stream; ignore.
        }
      };
      try {
        await regenerateActiveDeck({
          triggeredByUserId: userId,
          onProgress: send,
        });
      } catch (err) {
        const message = err instanceof Error ? err.message : "Regeneration failed";
        send({ phase: "error", message });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    status: 200,
    headers: {
      "content-type": "application/x-ndjson",
      "cache-control": "no-cache, no-transform",
      "x-accel-buffering": "no",
    },
  });
}
