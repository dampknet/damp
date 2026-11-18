"use server";

import { revalidatePath }    from "next/cache";
import { prisma }            from "@/lib/prisma";
import { getCurrentProfile } from "@/lib/auth";
import { encryptSecret, hasEncryptionKey } from "@/lib/secrets";
import {
  PROVIDER_KEYS, PROVIDER_DEFAULT_NAME, clearConfigCache, getMailSettings,
  type ProviderKey,
} from "@/lib/system-config";
import { getGraphToken, sendEmail, baseTemplate } from "@/lib/mailer";

export type ActionResult = { ok: boolean; message: string };

export type ProviderInput = {
  enabled:      boolean;
  displayName:  string;
  clientId:     string;
  clientSecret: string;
  tenantId:     string;
  issuer:       string;
};

export type MailInput = {
  enabled:       boolean;
  tenantId:      string;
  clientId:      string;
  clientSecret:  string;
  senderEmail:   string;
  companyDomain: string;
};

async function requireMaster() {
  const me = await getCurrentProfile();
  if (!me?.isMasterAdmin) throw new Error("Only a master admin can change sign-in settings.");
  return me;
}

async function audit(actor: string, title: string, details: string) {
  await prisma.activityLog.create({
    data: { type: "SYSTEM_EVENT", title, details, actorEmail: actor, entityType: "SECURITY" },
  }).catch(() => {});
}

// The page never receives saved values (only a masked hint), so a blank field means
// "keep what is saved": database first, then the .env fallback.
function keep(typed: string, saved?: string | null, env?: string) {
  return typed.trim() || saved || env || "";
}

function resolveProvider(
  key: ProviderKey,
  input: { clientId: string; tenantId: string; issuer: string },
  saved: { clientId: string | null; tenantId: string | null; issuer: string | null } | null,
) {
  const e = process.env;
  const envClientId = key === "google" ? e.GOOGLE_CLIENT_ID : key === "oidc" ? e.OIDC_CLIENT_ID : e.AZURE_AD_CLIENT_ID;
  return {
    clientId: keep(input.clientId, saved?.clientId, envClientId),
    tenantId: key === "azure-ad" ? keep(input.tenantId, saved?.tenantId, e.AZURE_AD_TENANT_ID) : "",
    issuer:   key === "oidc" ? keep(input.issuer, saved?.issuer, e.OIDC_ISSUER).replace(/\/$/, "") : "",
  };
}

function changedFields(fields: Record<string, string>) {
  const changed = Object.entries(fields).filter(([, v]) => v.trim()).map(([k]) => k);
  return changed.length ? `Changed: ${changed.join(", ")}.` : "No values changed.";
}

function isHttpsUrl(value: string) {
  try {
    return new URL(value).protocol === "https:";
  } catch {
    return false;
  }
}

async function fetchDiscovery(url: string) {
  const res = await fetch(url, { cache: "no-store", signal: AbortSignal.timeout(8000) });
  if (!res.ok) throw new Error(`The provider answered with status ${res.status}.`);
  const json = await res.json();
  if (!json.authorization_endpoint || !json.token_endpoint) {
    throw new Error("The address responded, but it isn't an OpenID Connect provider.");
  }
  return json as { issuer: string };
}

export async function saveProvider(key: ProviderKey, input: ProviderInput): Promise<ActionResult> {
  try {
    const me = await requireMaster();
    if (!PROVIDER_KEYS.includes(key)) return { ok: false, message: "Unknown provider." };

    const existing  = await prisma.authProviderConfig.findUnique({ where: { provider: key } });
    const newSecret = input.clientSecret.trim();

    if (newSecret && !hasEncryptionKey()) {
      return { ok: false, message: "CONFIG_ENCRYPTION_KEY is not set, so secrets cannot be stored safely. Add it to the environment first." };
    }

    const clientSecretEnc = newSecret ? encryptSecret(newSecret) : existing?.clientSecretEnc ?? null;
    const { clientId, tenantId, issuer } = resolveProvider(key, input, existing);

    if (input.enabled) {
      if (!clientId)        return { ok: false, message: "Client ID is required to turn this provider on." };
      if (!clientSecretEnc) return { ok: false, message: "Client secret is required to turn this provider on." };
      if (key === "azure-ad" && !tenantId) return { ok: false, message: "Tenant ID is required for Microsoft." };
      if (key === "oidc" && !isHttpsUrl(issuer)) return { ok: false, message: "Issuer URL must be a valid https:// address." };
    }

    await prisma.authProviderConfig.upsert({
      where:  { provider: key },
      create: {
        provider:    key,
        enabled:     input.enabled,
        displayName: input.displayName.trim() || null,
        clientId:    clientId || null,
        clientSecretEnc,
        tenantId:    tenantId || null,
        issuer:      issuer   || null,
        updatedBy:   me.email,
      },
      update: {
        enabled:     input.enabled,
        displayName: input.displayName.trim() || null,
        clientId:    clientId || null,
        clientSecretEnc,
        tenantId:    tenantId || null,
        issuer:      issuer   || null,
        updatedBy:   me.email,
      },
    });

    clearConfigCache();

    const name = input.displayName.trim() || PROVIDER_DEFAULT_NAME[key];
    await audit(
      me.email,
      `Sign-in provider ${input.enabled ? "enabled" : "disabled"}: ${name}`,
      `Provider: ${key}. ${changedFields({ "Client ID": input.clientId, "Tenant ID": input.tenantId, "Issuer URL": input.issuer, "Client secret": input.clientSecret })} Changed by ${me.email}.`,
    );

    revalidatePath("/admin/sign-in-settings");
    return { ok: true, message: `${name} settings saved${input.enabled ? " — it now appears on the login page" : " — it is now off"}.` };
  } catch (e) {
    return { ok: false, message: (e as Error).message };
  }
}

export async function testProvider(key: ProviderKey, input: ProviderInput): Promise<ActionResult> {
  try {
    await requireMaster();

    const saved = await prisma.authProviderConfig.findUnique({ where: { provider: key } });
    const ids   = resolveProvider(key, input, saved);

    if (key === "azure-ad") {
      const tenant = ids.tenantId;
      if (!tenant) return { ok: false, message: "Enter the Tenant ID first." };
      await fetchDiscovery(`https://login.microsoftonline.com/${encodeURIComponent(tenant)}/v2.0/.well-known/openid-configuration`);
      return { ok: true, message: "Tenant found. The client secret is only checked when someone signs in, so try a Microsoft sign-in after saving." };
    }

    if (key === "google") {
      const id = ids.clientId;
      if (!id.endsWith(".apps.googleusercontent.com")) {
        return { ok: false, message: "Google client IDs end with .apps.googleusercontent.com — check you copied the right value." };
      }
      await fetchDiscovery("https://accounts.google.com/.well-known/openid-configuration");
      return { ok: true, message: "Client ID format is valid and Google is reachable. Try a Google sign-in after saving." };
    }

    const issuer = ids.issuer;
    if (!isHttpsUrl(issuer)) return { ok: false, message: "Issuer URL must be a valid https:// address." };
    const doc = await fetchDiscovery(`${issuer}/.well-known/openid-configuration`);
    return { ok: true, message: `Provider found (${doc.issuer}). Try a sign-in after saving to confirm the client ID and secret.` };
  } catch (e) {
    const msg = (e as Error).name === "TimeoutError" ? "The provider didn't respond within 8 seconds." : (e as Error).message;
    return { ok: false, message: msg };
  }
}

export async function saveMail(input: MailInput): Promise<ActionResult> {
  try {
    const me = await requireMaster();

    const existing  = await prisma.mailConfig.findUnique({ where: { id: "default" } });
    const newSecret = input.clientSecret.trim();

    if (newSecret && !hasEncryptionKey()) {
      return { ok: false, message: "CONFIG_ENCRYPTION_KEY is not set, so secrets cannot be stored safely. Add it to the environment first." };
    }

    const clientSecretEnc = newSecret ? encryptSecret(newSecret) : existing?.clientSecretEnc ?? null;
    const e               = process.env;
    const tenantId        = keep(input.tenantId, existing?.tenantId, e.AZURE_AD_TENANT_ID);
    const clientId        = keep(input.clientId, existing?.clientId, e.AZURE_AD_CLIENT_ID);
    const senderEmail     = keep(input.senderEmail, existing?.senderEmail, e.GRAPH_SENDER_EMAIL).toLowerCase();
    const companyDomain   = keep(input.companyDomain, existing?.companyDomain, e.COMPANY_EMAIL_DOMAIN).toLowerCase().replace(/^@/, "");

    if (input.enabled) {
      if (!tenantId || !clientId || !clientSecretEnc || !senderEmail) {
        return { ok: false, message: "Tenant ID, client ID, client secret and sender email are all required." };
      }
    }

    const data = {
      enabled:     input.enabled,
      tenantId:    tenantId || null,
      clientId:    clientId || null,
      clientSecretEnc,
      senderEmail: senderEmail   || null,
      companyDomain: companyDomain || null,
      updatedBy:   me.email,
    };

    await prisma.mailConfig.upsert({
      where:  { id: "default" },
      create: { id: "default", ...data },
      update: data,
    });

    clearConfigCache();
    await audit(me.email, "Email settings updated", `${changedFields({ "Tenant ID": input.tenantId, "Client ID": input.clientId, "Client secret": input.clientSecret, "Send from": input.senderEmail, "Company domain": input.companyDomain })} Changed by ${me.email}.`);

    revalidatePath("/admin/sign-in-settings");
    return { ok: true, message: "Email settings saved." };
  } catch (e) {
    return { ok: false, message: (e as Error).message };
  }
}

export async function testMail(sendTest: boolean): Promise<ActionResult> {
  try {
    const me = await requireMaster();
    clearConfigCache();

    const settings = await getMailSettings();
    if (!settings) return { ok: false, message: "Email isn't configured yet. Save the settings first." };

    await getGraphToken(settings);

    if (!sendTest) {
      return { ok: true, message: `Connected to Microsoft Graph${settings.source === "env" ? " using the .env values" : ""}. Credentials are valid.` };
    }

    await sendEmail(
      me.email,
      "DAMP test email",
      baseTemplate(`<p style="color:#1a1814;font-size:14px;">Email is working. This test was sent from the DAMP sign-in settings page.</p>`),
      settings,
    );
    return { ok: true, message: `Test email sent to ${me.email} from ${settings.senderEmail}.` };
  } catch (e) {
    return { ok: false, message: (e as Error).message };
  }
}
