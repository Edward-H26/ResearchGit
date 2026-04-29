"use server";

import { auth } from "@/lib/auth";
import { markOnboardingCompleted } from "@/server/user-service";

export async function markOnboardingCompletedAction(): Promise<void> {
  const session = await auth();
  if (!session?.user?.id) return;
  await markOnboardingCompleted(session.user.id);
}
