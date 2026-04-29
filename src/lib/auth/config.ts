import { env } from "@/env";

const PLACEHOLDER_PREFIXES = ["placeholder-", "dev-only-"];

export function isConfiguredSecret(value: string | null | undefined): value is string {
  if (!value) return false;
  return !PLACEHOLDER_PREFIXES.some((prefix) => value.startsWith(prefix));
}

export function isGoogleAuthConfigured(): boolean {
  return isConfiguredSecret(env.GOOGLE_CLIENT_ID) && isConfiguredSecret(env.GOOGLE_CLIENT_SECRET);
}

export function isAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  return env.ADMIN_EMAILS.includes(email.toLowerCase());
}
