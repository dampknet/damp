"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { useThemeMode } from "@/context/ThemeContext";
import {
  saveProvider, testProvider, saveMail, testMail,
  type ActionResult, type ProviderInput,
} from "./actions";
import { ArrowLeft, Copy, Loader2, Lock, Mail, ShieldCheck, KeyRound, AlertTriangle } from "lucide-react";

export type ProviderView = {
  key:         "azure-ad" | "google" | "oidc";
  defaultName: string;
  enabled:     boolean;
  displayName: string;
  clientId:    string;
  tenantId:    string;
  issuer:      string;
  hasSecret:   boolean;
  source:      "database" | "env" | "none";
  active:      boolean;
  updatedBy:   string | null;
  updatedAt:   string | null;
  callbackUrl: string;
};

export type MailView = {
  enabled:       boolean;
  tenantId:      string;
  clientId:      string;
  senderEmail:   string;
  companyDomain: string;
  hasSecret:     boolean;
  source:        "database" | "env" | "none";
  active:        boolean;
  updatedBy:     string | null;
};

const PROVIDER_INFO: Record<ProviderView["key"], { title: string; help: string; console: string }> = {
  "azure-ad": {
    title:   "Microsoft Entra ID",
    help:    "Company Microsoft 365 accounts.",
    console: "Azure Portal → App registrations → your app → Authentication → Redirect URIs",
  },
  google: {
    title:   "Google",
    help:    "Gmail and Google Workspace accounts.",
    console: "Google Cloud Console → APIs & Services → Credentials → OAuth client → Authorised redirect URIs",
  },
  oidc: {
    title:   "Generic OIDC",
    help:    "Okta, Auth0, Keycloak, Authentik, Ping, JumpCloud, OneLogin, AWS Cognito, Zoho and any other OpenID Connect provider.",
    console: "Your provider's application settings → Sign-in redirect URIs",
  },
};

function useStyles(dark: boolean) {
  return {
    page:    dark ? "min-h-screen bg-[linear-gradient(135deg,#0d1117_0%,#0f1923_50%,#0d1117_100%)] text-slate-200" : "min-h-screen bg-[linear-gradient(180deg,#fbf8f3_0%,#f5f2ed_48%,#f2ede5_100%)]",
    card:    dark ? "overflow-hidden rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl" : "overflow-hidden rounded-2xl border border-[#e6ddd1] bg-white shadow-sm",
    txt:     dark ? "text-slate-100"   : "text-[#1a1814]",
    muted:   dark ? "text-slate-500"   : "text-[#8b857c]",
    border:  dark ? "border-white/10"  : "border-[#e7dfd4]",
    label:   dark ? "mb-1.5 block text-[11px] font-semibold text-slate-400" : "mb-1.5 block text-[11px] font-semibold text-[#6b655d]",
    input:   dark
      ? "w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-slate-100 outline-none placeholder:text-slate-600 focus:border-sky-500/50 disabled:opacity-50"
      : "w-full rounded-xl border border-[#ddd5c9] bg-white px-3 py-2.5 text-sm text-[#1a1814] outline-none placeholder:text-[#b3aca2] focus:border-[#1d5fa8] disabled:opacity-50",
    btnMain: dark
      ? "inline-flex items-center gap-2 rounded-xl bg-[linear-gradient(135deg,#1d5fa8,#3b82f6)] px-4 py-2 text-sm font-bold text-white hover:opacity-90 disabled:opacity-50"
      : "inline-flex items-center gap-2 rounded-xl bg-[#1a1814] px-4 py-2 text-sm font-bold text-white hover:bg-[#2d2924] disabled:opacity-50",
    btnSub:  dark
      ? "inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-slate-200 hover:bg-white/10 disabled:opacity-50"
      : "inline-flex items-center gap-2 rounded-xl border border-[#ddd5c9] bg-white px-4 py-2 text-sm font-semibold text-[#1a1814] hover:bg-[#faf7f2] disabled:opacity-50",
  };
}

function StatusPill({ dark, active, source }: { dark: boolean; active: boolean; source: string }) {
  const cls = active
    ? dark ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300" : "border-emerald-200 bg-emerald-50 text-emerald-700"
    : dark ? "border-slate-500/30 bg-slate-500/10 text-slate-400"       : "border-slate-200 bg-slate-50 text-slate-600";
  const text = active ? (source === "env" ? "Active · from .env" : "Active") : source === "none" ? "Not configured" : "Off";
  return <span className={`rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide ${cls}`}>{text}</span>;
}

function Toggle({ checked, onChange, disabled, label }: { checked: boolean; onChange: (v: boolean) => void; disabled?: boolean; label: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition disabled:opacity-50 ${checked ? "bg-emerald-500" : "bg-slate-400/50"}`}
    >
      <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition ${checked ? "translate-x-5" : "translate-x-0.5"}`} />
    </button>
  );
}

function ResultBox({ dark, result }: { dark: boolean; result: ActionResult | null }) {
  if (!result) return null;
  const cls = result.ok
    ? dark ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-300" : "border-emerald-200 bg-emerald-50 text-emerald-700"
    : dark ? "border-red-500/20 bg-red-500/10 text-red-300"             : "border-red-200 bg-red-50 text-red-700";
  return <div className={`rounded-xl border px-3 py-2.5 text-xs ${cls}`}>{result.message}</div>;
}

function CopyField({ dark, value, label }: { dark: boolean; value: string; label: string }) {
  const [copied, setCopied] = useState(false);
  const s = useStyles(dark);
  return (
    <div>
      <label className={s.label}>{label}</label>
      <div className="flex gap-2">
        <input readOnly value={value} aria-label={label} className={`${s.input} font-mono text-xs`} />
        <button
          type="button"
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(value);
              setCopied(true);
              setTimeout(() => setCopied(false), 2000);
            } catch {}
          }}
          className={s.btnSub}
        >
          <Copy size={13} /> {copied ? "Copied" : "Copy"}
        </button>
      </div>
    </div>
  );
}

function ProviderCard({ dark, provider, encryptionReady }: { dark: boolean; provider: ProviderView; encryptionReady: boolean }) {
  const s    = useStyles(dark);
  const info = PROVIDER_INFO[provider.key];

  const [form, setForm] = useState<ProviderInput>({
    enabled:      provider.enabled,
    displayName:  provider.displayName,
    clientId:     provider.clientId,
    clientSecret: "",
    tenantId:     provider.tenantId,
    issuer:       provider.issuer,
  });
  const [result,  setResult]  = useState<ActionResult | null>(null);
  const [pending, start]      = useTransition();
  const [busy,    setBusy]    = useState<"save" | "test" | null>(null);

  const set = <K extends keyof ProviderInput>(k: K, v: ProviderInput[K]) => setForm((f) => ({ ...f, [k]: v }));

  const run = (kind: "save" | "test") => {
    setBusy(kind);
    setResult(null);
    start(async () => {
      const res = kind === "save" ? await saveProvider(provider.key, form) : await testProvider(provider.key, form);
      setResult(res);
      if (kind === "save" && res.ok) set("clientSecret", "");
      setBusy(null);
    });
  };

  const secretPlaceholder = provider.hasSecret
    ? "Saved — leave blank to keep the current secret"
    : provider.source === "env" ? "Currently read from .env — enter a value to store it here" : "Paste the client secret";

  return (
    <section className={s.card}>
      <div className={`flex items-start justify-between gap-4 border-b ${s.border} px-6 py-4`}>
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className={`text-base font-bold ${s.txt}`}>{info.title}</span>
            <StatusPill dark={dark} active={provider.active} source={provider.source} />
          </div>
          <p className={`mt-1 text-xs ${s.muted}`}>{info.help}</p>
        </div>
        <div className="flex items-center gap-2">
          <span className={`text-xs font-semibold ${s.muted}`}>{form.enabled ? "On" : "Off"}</span>
          <Toggle checked={form.enabled} onChange={(v) => set("enabled", v)} label={`Use ${info.title} for sign-in`} />
        </div>
      </div>

      <div className="space-y-4 p-6">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className={s.label}>Button label on login page</label>
            <input value={form.displayName} onChange={(e) => set("displayName", e.target.value)}
              placeholder={provider.defaultName} className={s.input} />
          </div>

          {provider.key === "azure-ad" && (
            <div>
              <label className={s.label}>Tenant ID</label>
              <input value={form.tenantId} onChange={(e) => set("tenantId", e.target.value)}
                placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx" className={`${s.input} font-mono`} />
            </div>
          )}

          {provider.key === "oidc" && (
            <div>
              <label className={s.label}>Issuer URL</label>
              <input value={form.issuer} onChange={(e) => set("issuer", e.target.value)}
                placeholder="https://yourcompany.okta.com" className={`${s.input} font-mono`} />
            </div>
          )}
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className={s.label}>Client ID</label>
            <input value={form.clientId} onChange={(e) => set("clientId", e.target.value)}
              autoComplete="off" className={`${s.input} font-mono`} />
          </div>
          <div>
            <label className={s.label}>Client secret</label>
            <input type="password" value={form.clientSecret} onChange={(e) => set("clientSecret", e.target.value)}
              autoComplete="new-password" disabled={!encryptionReady}
              placeholder={secretPlaceholder} className={s.input} />
          </div>
        </div>

        <CopyField dark={dark} value={provider.callbackUrl} label="Redirect / callback URL — paste this into the provider" />
        <p className={`-mt-2 text-[11px] ${s.muted}`}>{info.console}</p>

        <ResultBox dark={dark} result={result} />

        <div className="flex flex-wrap items-center gap-2 pt-1">
          <button type="button" onClick={() => run("save")} disabled={pending} className={s.btnMain}>
            {busy === "save" ? <Loader2 size={14} className="animate-spin" /> : <ShieldCheck size={14} />} Save
          </button>
          <button type="button" onClick={() => run("test")} disabled={pending} className={s.btnSub}>
            {busy === "test" ? <Loader2 size={14} className="animate-spin" /> : <KeyRound size={14} />} Test
          </button>
          {provider.updatedBy && (
            <span className={`ml-auto text-[11px] ${s.muted}`} suppressHydrationWarning>
              Last changed by {provider.updatedBy}
              {provider.updatedAt ? ` · ${new Date(provider.updatedAt).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" })}` : ""}
            </span>
          )}
        </div>
      </div>
    </section>
  );
}

function MailCard({ dark, mail, encryptionReady }: { dark: boolean; mail: MailView; encryptionReady: boolean }) {
  const s = useStyles(dark);

  const [form, setForm] = useState({
    enabled:       mail.enabled,
    tenantId:      mail.tenantId,
    clientId:      mail.clientId,
    clientSecret:  "",
    senderEmail:   mail.senderEmail,
    companyDomain: mail.companyDomain,
  });
  const [result,  setResult] = useState<ActionResult | null>(null);
  const [pending, start]     = useTransition();
  const [busy,    setBusy]   = useState<"save" | "test" | "send" | null>(null);

  const set = (k: keyof typeof form, v: string | boolean) => setForm((f) => ({ ...f, [k]: v }));

  const run = (kind: "save" | "test" | "send") => {
    setBusy(kind);
    setResult(null);
    start(async () => {
      const res = kind === "save" ? await saveMail(form) : await testMail(kind === "send");
      setResult(res);
      if (kind === "save" && res.ok) set("clientSecret", "");
      setBusy(null);
    });
  };

  return (
    <section className={s.card}>
      <div className={`flex items-start justify-between gap-4 border-b ${s.border} px-6 py-4`}>
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <Mail size={16} className={s.muted} />
            <span className={`text-base font-bold ${s.txt}`}>Email (Microsoft Graph)</span>
            <StatusPill dark={dark} active={mail.active} source={mail.source} />
          </div>
          <p className={`mt-1 text-xs ${s.muted}`}>Sends invites and set-password links. Uses an app registration with the Mail.Send application permission.</p>
        </div>
        <div className="flex items-center gap-2">
          <span className={`text-xs font-semibold ${s.muted}`}>{form.enabled ? "On" : "Off"}</span>
          <Toggle checked={form.enabled} onChange={(v) => set("enabled", v)} label="Send email" />
        </div>
      </div>

      <div className="space-y-4 p-6">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className={s.label}>Tenant ID</label>
            <input value={form.tenantId} onChange={(e) => set("tenantId", e.target.value)} className={`${s.input} font-mono`} />
          </div>
          <div>
            <label className={s.label}>Client ID</label>
            <input value={form.clientId} onChange={(e) => set("clientId", e.target.value)} className={`${s.input} font-mono`} />
          </div>
          <div>
            <label className={s.label}>Client secret</label>
            <input type="password" value={form.clientSecret} onChange={(e) => set("clientSecret", e.target.value)}
              autoComplete="new-password" disabled={!encryptionReady}
              placeholder={mail.hasSecret ? "Saved — leave blank to keep the current secret" : mail.source === "env" ? "Currently read from .env" : "Paste the client secret"}
              className={s.input} />
          </div>
          <div>
            <label className={s.label}>Send from</label>
            <input type="email" value={form.senderEmail} onChange={(e) => set("senderEmail", e.target.value)}
              placeholder="noreply@knetgh.com" className={s.input} />
          </div>
        </div>

        <div className="sm:max-w-xs">
          <label className={s.label}>Company email domain</label>
          <input value={form.companyDomain} onChange={(e) => set("companyDomain", e.target.value)}
            placeholder="knetgh.com" className={`${s.input} font-mono`} />
          <p className={`mt-1 text-[11px] ${s.muted}`}>Invited users on this domain are told to use single sign-on instead of setting a password.</p>
        </div>

        <ResultBox dark={dark} result={result} />

        <div className="flex flex-wrap items-center gap-2 pt-1">
          <button type="button" onClick={() => run("save")} disabled={pending} className={s.btnMain}>
            {busy === "save" ? <Loader2 size={14} className="animate-spin" /> : <ShieldCheck size={14} />} Save
          </button>
          <button type="button" onClick={() => run("test")} disabled={pending} className={s.btnSub}>
            {busy === "test" ? <Loader2 size={14} className="animate-spin" /> : <KeyRound size={14} />} Test Connection
          </button>
          <button type="button" onClick={() => run("send")} disabled={pending} className={s.btnSub}>
            {busy === "send" ? <Loader2 size={14} className="animate-spin" /> : <Mail size={14} />} Send Me a Test Email
          </button>
        </div>
      </div>
    </section>
  );
}

export default function SignInSettingsClient({
  providers, mail, encryptionReady,
}: {
  providers:       ProviderView[];
  mail:            MailView;
  encryptionReady: boolean;
}) {
  const { mode } = useThemeMode();
  const dark     = mode === "dark";
  const s        = useStyles(dark);

  return (
    <div className={s.page}>
      <div className="mx-auto max-w-4xl px-4 py-8 md:px-6">
        <section className={`${s.card} relative p-6`}>
          <div className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-[linear-gradient(90deg,#1d5fa8,#3b82f6,#c8611a)]" />
          <Link href="/admin" className={`mb-4 inline-flex items-center gap-2 text-sm font-medium ${s.muted} hover:underline`}>
            <ArrowLeft size={16} /> Back to Admin
          </Link>
          <h1 className={`text-2xl font-semibold tracking-tight ${s.txt}`}>Sign-in & Email Settings</h1>
          <p className={`mt-1 text-sm ${s.muted}`}>
            Choose which identity providers appear on the login page and manage their credentials. Secrets are encrypted and never shown again after saving.
          </p>
        </section>

        {!encryptionReady && (
          <div className={dark
            ? "mt-5 flex items-start gap-3 rounded-2xl border border-amber-500/30 bg-amber-500/10 px-5 py-4 text-sm text-amber-200"
            : "mt-5 flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm text-amber-800"
          }>
            <AlertTriangle size={18} className="mt-0.5 shrink-0" />
            <div>
              <div className="font-semibold">Encryption key not set</div>
              <div className="mt-0.5 text-xs">
                Add <code className="font-mono">CONFIG_ENCRYPTION_KEY</code> (at least 32 characters) to the environment and restart. Until then, secrets can't be saved here.
              </div>
            </div>
          </div>
        )}

        <section className={`${s.card} mt-5`}>
          <div className="flex items-start justify-between gap-4 px-6 py-4">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <Lock size={16} className={s.muted} />
                <span className={`text-base font-bold ${s.txt}`}>Email & Password</span>
                <StatusPill dark={dark} active source="database" />
              </div>
              <p className={`mt-1 text-xs ${s.muted}`}>
                Always on and can't be switched off, so emergency accounts and local passwords keep working when every other provider is down.
              </p>
            </div>
            <Toggle checked onChange={() => {}} disabled label="Email and password sign-in (always on)" />
          </div>
        </section>

        <div className="mt-5 space-y-5">
          {providers.map((p) => (
            <ProviderCard key={p.key} dark={dark} provider={p} encryptionReady={encryptionReady} />
          ))}
          <MailCard dark={dark} mail={mail} encryptionReady={encryptionReady} />
        </div>

        <p className={`mt-6 text-center text-xs ${s.muted}`}>
          Changes take effect within 30 seconds. Only invited users can sign in, whichever provider they use.
        </p>
      </div>
    </div>
  );
}
