import { getMailSettings, type MailSettings } from "@/lib/system-config";

export async function getGraphToken(settings: Pick<MailSettings, "tenantId" | "clientId" | "clientSecret">): Promise<string> {
  const res = await fetch(
    `https://login.microsoftonline.com/${encodeURIComponent(settings.tenantId)}/oauth2/v2.0/token`,
    {
      method:  "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type:    "client_credentials",
        client_id:     settings.clientId,
        client_secret: settings.clientSecret,
        scope:         "https://graph.microsoft.com/.default",
      }),
    }
  );
  const data = await res.json();
  if (!data.access_token) {
    throw new Error(data.error_description?.split("\r\n")[0] ?? data.error ?? "Could not get a Microsoft Graph token.");
  }
  return data.access_token;
}

export async function sendEmail(to: string, subject: string, html: string, override?: MailSettings) {
  const settings = override ?? await getMailSettings();
  if (!settings) throw new Error("Email is not configured. Set it up under Admin → Sign-in & Email Settings.");

  const token = await getGraphToken(settings);

  const res = await fetch(
    `https://graph.microsoft.com/v1.0/users/${encodeURIComponent(settings.senderEmail)}/sendMail`,
    {
      method:  "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        message: {
          subject,
          body:         { contentType: "HTML", content: html },
          toRecipients: [{ emailAddress: { address: to } }],
        },
        saveToSentItems: false,
      }),
    }
  );

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Graph sendMail failed: ${err}`);
  }
}

export function baseTemplate(content: string) {
  return `
    <div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;padding:32px;">
      <div style="background:linear-gradient(90deg,#1d5fa8,#3b82f6);height:4px;border-radius:2px;margin-bottom:32px;"></div>
      ${content}
      <div style="margin-top:32px;padding-top:16px;border-top:1px solid #eee7dd;color:#9c9890;font-size:11px;">
        KNET — Ghana DTT Asset Management Platform
      </div>
    </div>
  `;
}

export async function sendSetPasswordEmail(to: string, setPasswordLink: string, fullName?: string) {
  await sendEmail(
    to,
    "Set your DAMP password — KNET Asset Management",
    baseTemplate(`
      <h1 style="font-size:22px;font-weight:700;color:#1a1814;margin:0 0 8px;">
        Welcome to DAMP${fullName ? `, ${fullName}` : ""}
      </h1>
      <p style="color:#6b655d;font-size:14px;margin:0 0 24px;">
        You've been granted access to the KNET Ghana DTT Asset Management Platform.
        Click below to set your password and get started.
      </p>
      <a href="${setPasswordLink}"
        style="display:inline-block;background:#1a1814;color:white;text-decoration:none;
               padding:12px 24px;border-radius:10px;font-size:14px;font-weight:600;">
        Set My Password →
      </a>
      <p style="margin-top:24px;color:#9c9890;font-size:12px;">
        This link expires in 24 hours. If you didn't expect this, ignore this email.
      </p>
    `)
  );
}

export async function sendCompanyAccessEmail(to: string, fullName?: string) {
  const loginUrl = `${process.env.NEXTAUTH_URL}/auth/login`;
  await sendEmail(
    to,
    "You have been granted access to DAMP — KNET Asset Management",
    baseTemplate(`
      <h1 style="font-size:22px;font-weight:700;color:#1a1814;margin:0 0 8px;">
        Access Granted${fullName ? `, ${fullName}` : ""}
      </h1>
      <p style="color:#6b655d;font-size:14px;margin:0 0 8px;">
        You have been granted access to the KNET Ghana DTT Asset Management Platform.
      </p>
      <p style="color:#6b655d;font-size:14px;margin:0 0 24px;">
        Since you have a KNET company account, sign in with your company single sign-on — no separate password needed.
      </p>
      <a href="${loginUrl}"
        style="display:inline-block;background:#1d5fa8;color:white;text-decoration:none;
               padding:12px 24px;border-radius:10px;font-size:14px;font-weight:600;">
        Sign In →
      </a>
    `)
  );
}
