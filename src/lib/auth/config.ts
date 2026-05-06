import { env } from "@/env";

export function isConfiguredSecret(value: string | null | undefined): value is string {
  return Boolean(value);
}

export function isGoogleAuthConfigured(): boolean {
  return isConfiguredSecret(env.GOOGLE_CLIENT_ID) && isConfiguredSecret(env.GOOGLE_CLIENT_SECRET);
}

export function isAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  return env.ADMIN_EMAILS.includes(email.toLowerCase());
}
