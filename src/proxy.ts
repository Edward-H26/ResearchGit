import { auth, isAdmin } from "@/lib/auth";
import { NextResponse } from "next/server";

export default auth((req) => {
  const path = req.nextUrl.pathname;

  if (path.startsWith("/admin")) {
    const email = req.auth?.user?.email;
    if (!isAdmin(email ?? null)) {
      return NextResponse.redirect(new URL("/", req.nextUrl));
    }
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/admin/:path*"],
};
