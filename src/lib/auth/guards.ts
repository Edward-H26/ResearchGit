import "server-only";

import { auth, isAdmin } from "@/lib/auth";
import { redirect } from "next/navigation";

export async function requireSessionUser() {
  const session = await auth();
  if (!session?.user) {
    redirect("/");
  }
  return session.user;
}

export async function requireAdminUser() {
  const user = await requireSessionUser();
  if (!isAdmin(user.email)) {
    redirect("/");
  }
  return user;
}
