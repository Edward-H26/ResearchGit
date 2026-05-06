import { auth } from "@/lib/auth";
import { markOnboardingCompleted } from "@/server/user-service";
import { NextResponse } from "next/server";

export async function POST() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  await markOnboardingCompleted(session.user.id);
  return NextResponse.json({ ok: true });
}
