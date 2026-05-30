import NextAuth, { NextAuthOptions, getServerSession } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { compare } from "bcryptjs";
import { db } from "./db";
import { normalizeUsername } from "./lib/username";

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        account: { label: "Username or Email", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.account || !credentials?.password) return null;
        const account = String(credentials.account).trim();
        const normalizedAccount = normalizeUsername(account);

        let user = await db.user.findUnique({ where: { email: account } });
        if (!user) {
          user = await db.user.findFirst({
            where: { name: account },
          });
        }
        if (!user) {
          const candidates = await db.user.findMany({
            where: { name: { not: null } },
          });
          user =
            candidates.find((candidate) =>
              candidate.name ? normalizeUsername(candidate.name) === normalizedAccount : false
            ) || null;
        }
        if (!user) return null;
        const passwordsMatch = await compare(credentials.password, user.password);
        if (passwordsMatch) {
          return { id: user.id, email: user.email, name: user.name, role: user.role };
        }
        return null;
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }: any) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
      }

      // Keep role in sync with database so privilege changes take effect
      // without requiring users to clear cookies manually.
      if (token?.email) {
        const latestUser = await db.user.findUnique({
          where: { email: token.email as string },
          select: { id: true, role: true },
        });
        if (latestUser) {
          token.id = latestUser.id;
          token.role = latestUser.role;
        }
      }

      return token;
    },
    async session({ session, token }: any) {
      if (token) {
        session.user.id = token.id as string;
        session.user.role = token.role as string;
      }
      return session;
    },
  },
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt",
  },
  secret: process.env.NEXTAUTH_SECRET,
};

export const auth = () => getServerSession(authOptions);
