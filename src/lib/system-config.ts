import { prisma } from "@/lib/prisma";
import { decryptSecret } from "@/lib/secrets";

export type ProviderKey = "azure-ad" | "google" | "oidc";

export const PROVIDER_KEYS: ProviderKey[] = ["azure-ad", "google", "oidc"];

export const PROVIDER_DEFAULT_NAME: Record<ProviderKey, string> = {
  "azure-ad": "Microsoft",
  google:     "Google",
  oidc:       "Single Sign-On",
};

export type ResolvedProvider = {
  key:          ProviderKey;
  name:         string;
  clientId:     string;
  clientSecret: string;
  tenantId:     string | null;
  issuer:       string | null;
  source:       "database" | "env";
};

export type MailSettings = {
  tenantId:      string;
  clientId:      string;
  clientSecret:  string;
  senderEmail:   string;
  source:        "database" | "env";
};

const CACHE_MS = 30_000;
let providerCache: { at: number; value: ResolvedProvider[] } | null = null;
let mailCache:     { at: number; value: MailSettings | null } | null = null;
let domainCache:   { at: number; value: string } | null = null;

export function clearConfigCache() {
  providerCache = null;
  mailCache     = null;
  domainCache   = null;
}

function safeDecrypt(value: string | null, label: string): string | null {
  try {
    return decryptSecret(value);
  } catch (e) {
    console.error(`[CONFIG] Could not decrypt ${label}:`, (e as Error).message);
    return null;
  }
}

function envProvider(key: ProviderKey): ResolvedProvider | null {
  if (key === "azure-ad") {
    const { AZURE_AD_CLIENT_ID, AZURE_AD_CLIENT_SECRET, AZURE_AD_TENANT_ID } = process.env;
    if (!AZURE_AD_CLIENT_ID || !AZURE_AD_CLIENT_SECRET || !AZURE_AD_TENANT_ID) return null;
    return { key, name: PROVIDER_DEFAULT_NAME[key], clientId: AZURE_AD_CLIENT_ID, clientSecret: AZURE_AD_CLIENT_SECRET, tenantId: AZURE_AD_TENANT_ID, issuer: null, source: "env" };
  }
  if (key === "google") {
    const { GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET } = process.env;
    if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) return null;
    return { key, name: PROVIDER_DEFAULT_NAME[key], clientId: GOOGLE_CLIENT_ID, clientSecret: GOOGLE_CLIENT_SECRET, tenantId: null, issuer: null, source: "env" };
  }
  const { OIDC_ISSUER, OIDC_CLIENT_ID, OIDC_CLIENT_SECRET, OIDC_NAME } = process.env;
  if (!OIDC_ISSUER || !OIDC_CLIENT_ID || !OIDC_CLIENT_SECRET) return null;
  return { key, name: OIDC_NAME || PROVIDER_DEFAULT_NAME[key], clientId: OIDC_CLIENT_ID, clientSecret: OIDC_CLIENT_SECRET, tenantId: null, issuer: OIDC_ISSUER, source: "env" };
}

export async function getAuthProviders(): Promise<ResolvedProvider[]> {
  if (providerCache && Date.now() - providerCache.at < CACHE_MS) return providerCache.value;

  let rows: Awaited<ReturnType<typeof prisma.authProviderConfig.findMany>> = [];
  try {
    rows = await prisma.authProviderConfig.findMany();
  } catch (e) {
    console.error("[CONFIG] Could not read sign-in providers:", (e as Error).message);
  }

  const result: ResolvedProvider[] = [];

  for (const key of PROVIDER_KEYS) {
    const row = rows.find((r) => r.provider === key);

    if (!row) {
      const env = envProvider(key);
      if (env) result.push(env);
      continue;
    }

    if (!row.enabled) continue;

    const clientSecret = safeDecrypt(row.clientSecretEnc, `${key} client secret`);
    if (!row.clientId || !clientSecret) continue;
    if (key === "azure-ad" && !row.tenantId) continue;
    if (key === "oidc" && !row.issuer) continue;

    result.push({
      key,
      name:     row.displayName?.trim() || PROVIDER_DEFAULT_NAME[key],
      clientId: row.clientId,
      clientSecret,
      tenantId: row.tenantId,
      issuer:   row.issuer,
      source:   "database",
    });
  }

  providerCache = { at: Date.now(), value: result };
  return result;
}

export async function getMailSettings(): Promise<MailSettings | null> {
  if (mailCache && Date.now() - mailCache.at < CACHE_MS) return mailCache.value;

  let value: MailSettings | null = null;

  try {
    const row = await prisma.mailConfig.findUnique({ where: { id: "default" } });
    if (row?.clientId) {
      const secret = safeDecrypt(row.clientSecretEnc, "mail client secret");
      if (row.enabled && row.tenantId && secret && row.senderEmail) {
        value = { tenantId: row.tenantId, clientId: row.clientId, clientSecret: secret, senderEmail: row.senderEmail, source: "database" };
      }
      mailCache = { at: Date.now(), value };
      return value;
    }
  } catch (e) {
    console.error("[CONFIG] Could not read mail settings:", (e as Error).message);
  }

  const { AZURE_AD_TENANT_ID, AZURE_AD_CLIENT_ID, AZURE_AD_CLIENT_SECRET, GRAPH_SENDER_EMAIL } = process.env;
  if (AZURE_AD_TENANT_ID && AZURE_AD_CLIENT_ID && AZURE_AD_CLIENT_SECRET && GRAPH_SENDER_EMAIL) {
    value = { tenantId: AZURE_AD_TENANT_ID, clientId: AZURE_AD_CLIENT_ID, clientSecret: AZURE_AD_CLIENT_SECRET, senderEmail: GRAPH_SENDER_EMAIL, source: "env" };
  }

  mailCache = { at: Date.now(), value };
  return value;
}

export async function getCompanyDomain(): Promise<string> {
  if (domainCache && Date.now() - domainCache.at < CACHE_MS) return domainCache.value;

  let domain = "";
  try {
    const row = await prisma.mailConfig.findUnique({ where: { id: "default" }, select: { companyDomain: true } });
    domain = row?.companyDomain?.trim() ?? "";
  } catch {}

  const value = (domain || process.env.COMPANY_EMAIL_DOMAIN || "knetgh.com").toLowerCase().replace(/^@/, "");
  domainCache = { at: Date.now(), value };
  return value;
}
