import type { NextAuthConfig } from "next-auth";

// Edge-safe config (no Prisma / bcrypt) — used by middleware and shared with the
// full server auth. Route protection lives in the `authorized` callback.
// NOT: "/api/ingest/health" webhook'u session'sız cihaz push'ları içindir; kendi
// Bearer-token doğrulamasını yapar. "/api/health" ile karışmaz (farklı yol).
const PUBLIC_PREFIXES = [
  "/login",
  "/register",
  "/api/register",
  "/api/health",
  "/api/ingest/health",
  "/api/cron/",
];

export const authConfig = {
  pages: { signIn: "/login" },
  session: { strategy: "jwt" },
  providers: [],
  callbacks: {
    authorized({ auth, request }) {
      const isLoggedIn = !!auth?.user;
      const { pathname } = request.nextUrl;
      const isPublic = PUBLIC_PREFIXES.some((p) => pathname.startsWith(p));
      if (isPublic) return true;
      return isLoggedIn;
    },
    jwt({ token, user }) {
      if (user) token.uid = (user as { id?: string }).id;
      return token;
    },
    session({ session, token }) {
      if (token.uid && session.user) {
        (session.user as { id?: string }).id = token.uid as string;
      }
      return session;
    },
  },
} satisfies NextAuthConfig;
