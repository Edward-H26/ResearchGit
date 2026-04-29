import { env } from "@/env";
import { isAdminEmail, isGoogleAuthConfigured } from "@/lib/auth/config";
import { mergeUserNode } from "@/server/user-service";
import NextAuth from "next-auth";
import Google from "next-auth/providers/google";

export const { handlers, auth, signIn, signOut } = NextAuth({
  secret: env.AUTH_SECRET,
  providers: [
    Google({
      clientId: env.GOOGLE_CLIENT_ID,
      clientSecret: env.GOOGLE_CLIENT_SECRET,
      authorization: { params: { prompt: "consent", access_type: "offline" } },
    }),
  ],
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
      }
      return token;
    },
    async session({ session, token }) {
      if (token.id && typeof token.id === "string") {
        session.user.id = token.id;
      }
      return session;
    },
  },
});

export function isAdmin(email: string | null | undefined): boolean {
  return isAdminEmail(email);
}

export { isGoogleAuthConfigured };
