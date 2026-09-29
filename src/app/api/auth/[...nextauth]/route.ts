import NextAuth, { type NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import AzureADProvider     from "next-auth/providers/azure-ad";
import { PrismaAdapter }   from "@auth/prisma-adapter";
import { prisma }          from "@/lib/prisma";
import bcrypt              from "bcryptjs";

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  session: { strategy: "jwt" },

  providers: [

   
    CredentialsProvider({
      name: "Email & Password",
      credentials: {
        email:    { label: "Email",    type: "email"    },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        const email = credentials.email.toLowerCase().trim();

        const profile = await prisma.userProfile.findUnique({
          where:  { email },
          select: { id: true, email: true, fullName: true, role: true, passwordHash: true },
        });

       
        if (!profile) {
          await prisma.activityLog.create({
            data: {
              type:       "USER_LOGIN",
              title:      "Failed login — account not found",
              details:    `Email: ${email} attempted to sign in but has no account.`,
              actorEmail: email,
            },
          }).catch(() => {});
          return null;
        }

        if (!profile.passwordHash) {
          await prisma.activityLog.create({
            data: {
              type:       "USER_LOGIN",
              title:      "Failed login — no password set",
              details:    `${email} tried email/password but has no password (SSO user?).`,
              actorEmail: email,
            },
          }).catch(() => {});
          return null;
        }

        const valid = await bcrypt.compare(credentials.password, profile.passwordHash);

    
        if (!valid) {
          await prisma.activityLog.create({
            data: {
              type:       "USER_LOGIN",
              title:      "Failed login — wrong password",
              details:    `${email} entered an incorrect password.`,
              actorEmail: email,
            },
          }).catch(() => {});
          return null;
        }

       
        await prisma.activityLog.create({
          data: {
            type:       "USER_LOGIN",
            title:      `${profile.fullName ?? email} signed in`,
            details:    `Signed in via email/password.`,
            actorEmail: email,
          },
        }).catch(() => {});

        return {
          id:    profile.id,
          email: profile.email,
          name:  profile.fullName ?? profile.email,
        };
      },
    }),


    AzureADProvider({
      clientId:     process.env.AZURE_AD_CLIENT_ID!,
      clientSecret: process.env.AZURE_AD_CLIENT_SECRET!,
      tenantId:     process.env.AZURE_AD_TENANT_ID!,
      authorization: {
        params: { scope: "openid profile email offline_access" },
      },
    }),
  ],

  callbacks: {

    async signIn({ user, account }) {
      if (!user.email) return false;

      const email   = user.email.toLowerCase();
      const profile = await prisma.userProfile.findUnique({
        where:  { email },
        select: { id: true },
      });

      if (!profile) return "/auth/login?error=not_invited";

      
      if (account?.provider === "azure-ad" && user.name) {
        await prisma.userProfile.update({
          where: { email },
          data:  { fullName: user.name },
        });
      }

      return true;
    },

   
    async jwt({ token, user }) {
      if (user?.email) {
        const profile = await prisma.userProfile.findUnique({
          where:  { email: user.email.toLowerCase() },
          select: { id: true, role: true, fullName: true },
        });
        token.role     = profile?.role     ?? "VIEWER";
        token.fullName = profile?.fullName ?? user.name ?? "";
        token.userId   = profile?.id       ?? "";
      }
      return token;
    },

    
    async session({ session, token }) {
      if (session.user) {
        session.user.role     = token.role     as string;
        session.user.fullName = token.fullName as string;
        session.user.id       = token.userId   as string;
      }
      return session;
    },
  },

  pages: {
    signIn: "/auth/login",
    error:  "/auth/error",
  },
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };