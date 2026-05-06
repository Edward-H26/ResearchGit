import { env } from "@/env";
import { isAdminEmail, isConfiguredSecret, isGoogleAuthConfigured } from "@/lib/auth/config";
import { getUserSummary, mergeUserNode } from "@/server/user-service";
import NextAuth from "next-auth";
import Google from "next-auth/providers/google";

const googleClientId = env.GOOGLE_CLIENT_ID;
const googleClientSecret = env.GOOGLE_CLIENT_SECRET;
const authSecret = env.AUTH_SECRET;
const providers =
  isConfiguredSecret(googleClientId) && isConfiguredSecret(googleClientSecret)
    ? [
        Google({
          clientId: googleClientId,
          clientSecret: googleClientSecret,
          authorization: { params: { prompt: "consent", access_type: "offline" } },
        }),
      ]
    : [];

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...(authSecret ? { secret: authSecret } : {}),
  providers,
  session: { strategy: "jwt" },
  pages: {
    signIn: "/",
  },
  callbacks: {
    async jwt({ token, account, profile, user }) {
      if (account?.provider === "google" && profile?.sub) {
        const merged = await mergeUserNode({
          googleId: profile.sub,
          email: typeof profile.email === "string" ? profile.email : (user?.email ?? ""),
          name:
            typeof profile.name === "string"
              ? profile.name
              : typeof user?.name === "string"
                ? user.name
                : "",
          avatarUrl:
            typeof profile.picture === "string"
              ? profile.picture
              : typeof user?.image === "string"
                ? user.image
                : "",
        });
        token.id = merged.id;
        token.googleId = profile.sub;
        token.matchedAuthorName = merged.matchedAuthorName;
      }
      return token;
    },
    async session({ session, token }) {
      if (token.id && typeof token.id === "string") {
        session.user.id = token.id;
        const user = await getUserSummary(token.id);
        session.user.matchedAuthorName = user?.matchedAuthorName ?? null;
        if (user?.matchedAuthorName) {
          session.user.name = user.matchedAuthorName;
        }
      }
      return session;
    },
  },
});

export function isAdmin(email: string | null | undefined): boolean {
  return isAdminEmail(email);
}

export { isGoogleAuthConfigured };
