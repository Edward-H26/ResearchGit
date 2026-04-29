import { auth, isAdmin } from "@/lib/auth";
import { buildResearchExport } from "@/server/export-service";
import { NextResponse } from "next/server";

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  if (!isAdmin(session.user.email)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const payload = await buildResearchExport();

  return new NextResponse(JSON.stringify(payload, null, 2), {
    status: 200,
    headers: {
      "content-type": "application/json",
      "content-disposition": `attachment; filename="researchgit-export-${new Date()
        .toISOString()
        .replace(/[:.]/g, "-")}.json"`,
    },
  });
}
