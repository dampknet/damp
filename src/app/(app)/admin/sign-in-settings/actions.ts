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
    const clientId        = input.clientId.trim();
    const tenantId        = input.tenantId.trim();
    const issuer          = input.issuer.trim().replace(/\/$/, "");

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
      `Provider: ${key}. Secret ${newSecret ? "replaced" : "unchanged"}. Changed by ${me.email}.`,
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

    if (key === "azure-ad") {
      const tenant = input.tenantId.trim();
      if (!tenant) return { ok: false, message: "Enter the Tenant ID first." };
      await fetchDiscovery(`https://login.microsoftonline.com/${encodeURIComponent(tenant)}/v2.0/.well-known/openid-configuration`);
      return { ok: true, message: "Tenant found. The client secret is only checked when someone signs in, so try a Microsoft sign-in after saving." };
    }

    if (key === "google") {
      const id = input.clientId.trim();
      if (!id.endsWith(".apps.googleusercontent.com")) {
        return { ok: false, message: "Google client IDs end with .apps.googleusercontent.com — check you copied the right value." };
      }
      await fetchDiscovery("https://accounts.google.com/.well-known/openid-configuration");
      return { ok: true, message: "Client ID format is valid and Google is reachable. Try a Google sign-in after saving." };
    }

    const issuer = input.issuer.trim().replace(/\/$/, "");
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
    const senderEmail     = input.senderEmail.trim().toLowerCase();
    const companyDomain   = input.companyDomain.trim().toLowerCase().replace(/^@/, "");

    if (input.enabled) {
      if (!input.tenantId.trim() || !input.clientId.trim() || !clientSecretEnc || !senderEmail) {
        return { ok: false, message: "Tenant ID, client ID, client secret and sender email are all required." };
      }
    }

    const data = {
      enabled:     input.enabled,
      tenantId:    input.tenantId.trim() || null,
      clientId:    input.clientId.trim() || null,
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
    await audit(me.email, "Email settings updated", `Sender: ${senderEmail || "—"}. Secret ${newSecret ? "replaced" : "unchanged"}. Changed by ${me.email}.`);

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
