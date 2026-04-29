import { env } from "@/env";
import { auth } from "@/lib/auth";
import { getLiveblocks } from "@/lib/liveblocks/server";
import { NextResponse } from "next/server";

function parseRequestedRoom(body: unknown): string | null {
  if (
    typeof body === "object" &&
    body !== null &&
    "room" in body &&
    typeof body.room === "string" &&
    body.room.startsWith("canvas:")
  ) {
    return body.room;
  }
  return null;
}

export async function POST(req: Request) {
  if (!env.LIVEBLOCKS_SECRET_KEY.startsWith("sk_")) {
    return NextResponse.json(
      {
        error: "liveblocks_not_configured",
        message:
          "Set LIVEBLOCKS_SECRET_KEY in .env.local (must start with sk_dev_ or sk_prod_) and restart the dev server.",
      },
      { status: 503 },
    );
  }

  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let roomId: string | null = null;
  try {
    roomId = parseRequestedRoom(await req.json());
  } catch {
    roomId = null;
  }
  if (!roomId) {
    return NextResponse.json({ error: "invalid_room" }, { status: 400 });
  }

  const userId = session.user.id;
  const userName = session.user.name ?? session.user.email ?? userId;
  const userImage = session.user.image ?? null;

  const liveblocks = getLiveblocks();
  const liveSession = liveblocks.prepareSession(userId, {
    userInfo: { name: userName, avatarUrl: userImage },
  });

  liveSession.allow(roomId, liveSession.FULL_ACCESS);

  const { body, status } = await liveSession.authorize();
  return new NextResponse(body, {
    status,
    headers: { "content-type": "application/json" },
  });
}
