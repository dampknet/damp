import NextAuth, { type NextAuthOptions } from "next-auth";
import type { Provider } from "next-auth/providers/index";
import CredentialsProvider from "next-auth/providers/credentials";
import AzureADProvider     from "next-auth/providers/azure-ad";
import GoogleProvider      from "next-auth/providers/google";
import { PrismaAdapter }   from "@auth/prisma-adapter";
import { prisma }          from "@/lib/prisma";
import bcrypt              from "bcryptjs";
import { getRequestInfo, formatRequestInfo, type RequestInfo } from "@/lib/request-info";
import { getAuthProviders, type ResolvedProvider } from "@/lib/system-config";

const MAX_FAILED_ATTEMPTS = 3;
const LOCK_MINUTES        = 5;

const METHOD_LABEL: Record<string, string> = {
  credentials: "Local password",
  "azure-ad":  "Microsoft Entra ID",
  google:      "Google",
};

async function methodLabel(provider?: string | null) {
  if (!provider) return "Unknown method";
  if (provider === "oidc") {
    const oidc = (await getAuthProviders()).find((p) => p.key === "oidc");
    return oidc ? `${oidc.name} (OIDC)` : "OIDC";
  }
  return METHOD_LABEL[provider] ?? provider;
}

async function logAuthEvent({
  type = "USER_LOGIN",
  title,
  email,
  details,
  security,
  info,
}: {
  type?:    "USER_LOGIN" | "USER_LOGOUT";
  title:    string;
  email:    string;
  details?: string;
  security: boolean;
  info?:    RequestInfo;
}) {
  const req = info ?? await getRequestInfo();
  await prisma.activityLog.create({
    data: {
      type,
      title,
      details:    details ? `${details} | ${formatRequestInfo(req)}` : formatRequestInfo(req),
      actorEmail: email,
      entityType: security ? "SECURITY" : "AUTH",
      entityId:   req.ip,
    },
  }).catch(() => {});
}

const credentialsProvider = CredentialsProvider({
  name: "Email & Password",
  credentials: {
    email:    { label: "Email",    type: "email"    },
    password: { label: "Password", type: "password" },
  },
  async authorize(credentials) {
    if (!credentials?.email || !credentials?.password) return null;

    const email = credentials.email.toLowerCase().trim();
    const now   = new Date();

    const profile = await prisma.userProfile.findUnique({
      where:  { email },
      select: {
        id:               true,
        email:            true,
        fullName:         true,
        passwordHash:     true,
        isSuspended:      true,
        lockedUntil:      true,
        failedLoginCount: true,
        accessExpiresAt:  true,
      },
    });

    if (!profile) {
      await logAuthEvent({
        title:    "Failed login — account not found",
        email,
        details:  `${email} is not registered on the platform.`,
        security: true,
      });
      return null;
    }

    if (profile.isSuspended) {
      await logAuthEvent({
        title:    "Blocked login — account suspended",
        email,
        details:  `${email} tried to sign in while suspended.`,
        security: true,
      });
      throw new Error("Suspended");
    }

    if (profile.accessExpiresAt && profile.accessExpiresAt <= now) {
      await logAuthEvent({
        title:    "Blocked login — account access expired",
        email,
        details:  `${email} tried to sign in after access expired on ${profile.accessExpiresAt.toISOString()}.`,
        security: true,
      });
      throw new Error("Expired");
    }

    if (profile.lockedUntil && profile.lockedUntil > now) {
      const minutes = Math.max(1, Math.ceil((profile.lockedUntil.getTime() - now.getTime()) / 60000));
      await logAuthEvent({
        title:    "Blocked login — account locked",
        email,
        details:  `${email} tried to sign in while locked. ${minutes} minute(s) remaining.`,
        security: true,
      });
      throw new Error(`Locked:${minutes}`);
    }

    if (!profile.passwordHash) {
      await logAuthEvent({
        title:    "Failed login — no local password",
        email,
        details:  `${email} tried a password login but has no local password set.`,
        security: true,
      });
      return null;
    }

    const valid = await bcrypt.compare(credentials.password, profile.passwordHash);

    if (!valid) {
      const attempts = profile.failedLoginCount + 1;

      if (attempts >= MAX_FAILED_ATTEMPTS) {
        await prisma.userProfile.update({
          where: { id: profile.id },
          data: {
            failedLoginCount: 0,
            lockedUntil:      new Date(now.getTime() + LOCK_MINUTES * 60000),
          },
        });
        await logAuthEvent({
          title:    `Account locked — ${MAX_FAILED_ATTEMPTS} failed attempts`,
          email,
          details:  `${email} locked for ${LOCK_MINUTES} minutes after ${MAX_FAILED_ATTEMPTS} wrong passwords.`,
          security: true,
        });
        throw new Error(`Locked:${LOCK_MINUTES}`);
      }

      await prisma.userProfile.update({
        where: { id: profile.id },
        data:  { failedLoginCount: attempts },
      });
      await logAuthEvent({
        title:    `Failed login — wrong password (attempt ${attempts} of ${MAX_FAILED_ATTEMPTS})`,
        email,
        details:  `${email} entered an incorrect password.`,
        security: true,
      });
      return null;
    }

    return {
      id:    profile.id,
      email: profile.email,
      name:  profile.fullName ?? profile.email,
    };
  },
});

function buildExternalProvider(p: ResolvedProvider): Provider {
  if (p.key === "azure-ad") {
    return AzureADProvider({
      clientId:     p.clientId,
      clientSecret: p.clientSecret,
      tenantId:     p.tenantId!,
      name:         p.name,
      allowDangerousEmailAccountLinking: true,
      authorization: { params: { scope: "openid profile email offline_access" } },
    });
  }

  if (p.key === "google") {
    return GoogleProvider({
      clientId:     p.clientId,
      clientSecret: p.clientSecret,
      name:         p.name,
      allowDangerousEmailAccountLinking: true,
    });
  }

  return {
    id:          "oidc",
    name:        p.name,
    type:        "oauth",
    wellKnown:   `${p.issuer!.replace(/\/$/, "")}/.well-known/openid-configuration`,
    clientId:    p.clientId,
    clientSecret: p.clientSecret,
    idToken:     true,
    checks:      ["pkce", "state"],
    authorization: { params: { scope: "openid email profile" } },
    allowDangerousEmailAccountLinking: true,
    profile(profile: any) {
      return {
        id:    profile.sub,
        name:  profile.name ?? profile.preferred_username ?? profile.email,
        email: profile.email,
      };
    },
  } as Provider;
}

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  session: { strategy: "jwt" },

  providers: [credentialsProvider],

  callbacks: {
    async signIn({ user, account }) {
      if (!user.email) return false;

      const email  = user.email.toLowerCase();
      const method = await methodLabel(account?.provider);
      const info   = await getRequestInfo();

      const profile = await prisma.userProfile.findUnique({
        where:  { email },
        select: { id: true, fullName: true, isSuspended: true, isEmergency: true, accessExpiresAt: true },
      });

      if (!profile) {
        await logAuthEvent({
          title:    `Failed login — not invited (${method})`,
          email,
          details:  `${email} authenticated with ${method} but has no access to the platform.`,
          security: true,
          info,
        });
        return "/auth/login?error=not_invited";
      }

      if (profile.isSuspended) {
        await logAuthEvent({
          title:    `Blocked login — account suspended (${method})`,
          email,
          details:  `${email} tried to sign in with ${method} while suspended.`,
          security: true,
          info,
        });
        return "/auth/login?error=Suspended";
      }

      if (profile.accessExpiresAt && profile.accessExpiresAt.getTime() <= Date.now()) {
        await logAuthEvent({
          title:    `Blocked login — account access expired (${method})`,
          email,
          details:  `${email} tried to sign in with ${method} after access expired.`,
          security: true,
          info,
        });
        return "/auth/login?error=Expired";
      }

      const updateName = account?.provider !== "credentials" && !!user.name && !profile.isEmergency;

      await prisma.userProfile.update({
        where: { email },
        data: {
          failedLoginCount: 0,
          lockedUntil:      null,
          lastLoginAt:      new Date(),
          lastLoginIp:      info.ip,
          lastLoginMethod:  method,
          ...(updateName ? { fullName: user.name } : {}),
        },
      });

      await logAuthEvent({
        title:    profile.isEmergency
          ? `${email} signed in via ${method} (Created Account)`
          : `${profile.fullName ?? user.name ?? email} signed in via ${method}`,
        email,
        ...(profile.isEmergency ? { details: "Login credentials were set up from Create Account." } : {}),
        security: false,
        info,
      });

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

  events: {
    async signOut({ token }) {
      const email = (token?.email as string | undefined)?.toLowerCase();
      if (!email) return;
      await logAuthEvent({
        type:     "USER_LOGOUT",
        title:    `${(token?.fullName as string | undefined) || email} signed out`,
        email,
        security: false,
      });
    },
  },

  pages: {
    signIn: "/auth/login",
    error:  "/auth/error",
  },
};

async function handler(req: Request, ctx: any) {
  const external = (await getAuthProviders()).map(buildExternalProvider);
  return NextAuth(req as any, ctx, { ...authOptions, providers: [credentialsProvider, ...external] });
}

export { handler as GET, handler as POST };
