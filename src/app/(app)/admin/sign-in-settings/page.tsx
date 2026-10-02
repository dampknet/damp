import { prisma }             from "@/lib/prisma";
import { requireMasterAdmin } from "@/lib/auth";
import { hasEncryptionKey }   from "@/lib/secrets";
import {
  PROVIDER_KEYS, PROVIDER_DEFAULT_NAME, getAuthProviders, getMailSettings, getCompanyDomain,
} from "@/lib/system-config";
import SignInSettingsClient, { type ProviderView, type MailView } from "./SignInSettingsClient";

export default async function SignInSettingsPage() {
  await requireMasterAdmin();

  const [rows, mailRow, active, mail, domain] = await Promise.all([
    prisma.authProviderConfig.findMany(),
    prisma.mailConfig.findUnique({ where: { id: "default" } }),
    getAuthProviders(),
    getMailSettings(),
    getCompanyDomain(),
  ]);

  const baseUrl = (process.env.NEXTAUTH_URL ?? "").replace(/\/$/, "");

  const providers: ProviderView[] = PROVIDER_KEYS.map((key) => {
    const row     = rows.find((r) => r.provider === key);
    const running = active.find((p) => p.key === key);

    return {
      key,
      defaultName: PROVIDER_DEFAULT_NAME[key],
      enabled:     row ? row.enabled : !!running,
      displayName: row?.displayName ?? "",
      clientId:    row?.clientId ?? (running?.source === "env" ? running.clientId : ""),
      tenantId:    row?.tenantId ?? (running?.source === "env" ? running.tenantId ?? "" : ""),
      issuer:      row?.issuer   ?? (running?.source === "env" ? running.issuer   ?? "" : ""),
      hasSecret:   !!row?.clientSecretEnc,
      source:      row ? "database" : running ? "env" : "none",
      active:      !!running,
      updatedBy:   row?.updatedBy ?? null,
      updatedAt:   row?.updatedAt?.toISOString() ?? null,
      callbackUrl: `${baseUrl}/api/auth/callback/${key}`,
    };
  });

  const mailView: MailView = {
    enabled:       mailRow ? mailRow.enabled : true,
    tenantId:      mailRow?.tenantId    ?? (mail?.source === "env" ? mail.tenantId    : ""),
    clientId:      mailRow?.clientId    ?? (mail?.source === "env" ? mail.clientId    : ""),
    senderEmail:   mailRow?.senderEmail ?? (mail?.source === "env" ? mail.senderEmail : ""),
    companyDomain: domain,
    hasSecret:     !!mailRow?.clientSecretEnc,
    source:        mailRow?.clientId ? "database" : mail ? "env" : "none",
    active:        !!mail,
    updatedBy:     mailRow?.updatedBy ?? null,
  };

  return (
    <SignInSettingsClient
      providers={providers}
      mail={mailView}
      encryptionReady={hasEncryptionKey()}
    />
  );
}
