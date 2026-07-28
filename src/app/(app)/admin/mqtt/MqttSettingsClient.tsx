"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { useThemeMode } from "@/context/ThemeContext";
import { ArrowLeft, Wifi, WifiOff, Loader2 } from "lucide-react";

type MqttConfig = {
  id:             string;
  connectionName: string;
  clusterUrl:     string;
  mqttPort:       number;
  websocketPort:  number;
  username:       string;
  password:       string;
} | null;

export default function MqttSettingsClient({
  config, action,
}: {
  config: MqttConfig;
  action: (formData: FormData) => void;
}) {
  const { mode }     = useThemeMode();
  const dark          = mode === "dark";
  const searchParams  = useSearchParams();
  const error         = searchParams.get("error");
  const success       = searchParams.get("success");

  const [testing,    setTesting]    = useState(false);
  const [testResult, setTestResult] = useState<"ok" | "fail" | null>(null);

  const inputCls = dark
    ? "w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-slate-100 outline-none placeholder:text-slate-500 focus:border-sky-500/50"
    : "w-full rounded-xl border border-[#ddd5c9] bg-white px-3 py-2.5 text-sm outline-none focus:border-[#1a1814]";

  const handleTest = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const res = await fetch("/api/admin/mqtt/test", { method: "POST" });
      setTestResult(res.ok ? "ok" : "fail");
    } catch {
      setTestResult("fail");
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className={dark
      ? "min-h-screen bg-[linear-gradient(135deg,#0d1117_0%,#0f1923_50%,#0d1117_100%)] text-slate-200"
      : "min-h-screen bg-[linear-gradient(180deg,#fbf8f3_0%,#f5f2ed_48%,#f2ede5_100%)]"
    }>
      <div className="mx-auto max-w-3xl px-4 py-8 md:px-6">

        {/* Header */}
        <section className={dark
          ? "relative overflow-hidden rounded-[28px] border border-white/10 bg-white/5 p-6 backdrop-blur-xl"
          : "relative overflow-hidden rounded-[28px] border border-[#e7ded3] bg-white/95 p-6 shadow-[0_16px_40px_rgba(26,24,20,0.06)]"
        }>
          <div className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-[linear-gradient(90deg,#1d5fa8,#3b82f6,#10b981)]" />

          <Link href="/admin" className={dark
            ? "mb-4 inline-flex items-center gap-2 text-sm font-medium text-slate-400 hover:underline"
            : "mb-4 inline-flex items-center gap-2 text-sm font-medium text-[#6f6a62] hover:underline"
          }>
            <ArrowLeft size={16} /> Back to Admin
          </Link>

          <div className="flex items-center gap-4 mt-2">
            <div className={dark
              ? "flex h-12 w-12 items-center justify-center rounded-2xl border border-blue-500/20 bg-blue-500/10"
              : "flex h-12 w-12 items-center justify-center rounded-2xl border border-blue-200 bg-blue-50"
            }>
              <Wifi size={22} className={dark ? "text-blue-400" : "text-blue-700"} />
            </div>
            <div>
              <h1 className={dark ? "text-2xl font-semibold text-slate-100" : "text-2xl font-semibold text-[#1a1814]"}>
                HiveMQ Cloud Connection
              </h1>
              <p className={dark ? "mt-1 text-sm text-slate-400" : "mt-1 text-sm text-[#857f76]"}>
                Configure MQTT connection for live fuel level data from all 42 sites.
              </p>
            </div>
          </div>

          {/* Status banner */}
          {config ? (
            <div className={dark
              ? "mt-5 flex items-center gap-2 rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-2.5 text-sm text-emerald-300"
              : "mt-5 flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-sm text-emerald-700"
            }>
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              Configuration saved — {config.connectionName || config.clusterUrl}
            </div>
          ) : (
            <div className={dark
              ? "mt-5 flex items-center gap-2 rounded-xl border border-amber-500/20 bg-amber-500/10 px-4 py-2.5 text-sm text-amber-300"
              : "mt-5 flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-2.5 text-sm text-amber-700"
            }>
              <span className="h-2 w-2 rounded-full bg-amber-500" />
              Not configured yet — fill in the details below
            </div>
          )}

          {success && (
            <div className={dark
              ? "mt-3 rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-2.5 text-sm text-emerald-300"
              : "mt-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-sm text-emerald-700"
            }>{success}</div>
          )}
          {error && (
            <div className={dark
              ? "mt-3 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-2.5 text-sm text-red-300"
              : "mt-3 rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-700"
            }>{error}</div>
          )}
        </section>

        {/* Form */}
        <section className={dark
          ? "mt-5 overflow-hidden rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl"
          : "mt-5 overflow-hidden rounded-2xl border border-[#e6ddd1] bg-white shadow-sm"
        }>
          <div className={dark ? "border-b border-white/8 px-6 py-4" : "border-b border-[#eee7dd] px-6 py-4"}>
            <div className={dark ? "text-sm font-semibold text-slate-100" : "text-sm font-semibold text-[#1a1814]"}>
              Connection Settings
            </div>
          </div>

          <form action={action} className="p-6 space-y-5">

            {/* Connection Name */}
            <Field label="Connection Name" dark={dark}>
              <input name="connectionName"
                defaultValue={config?.connectionName ?? ""}
                placeholder="e.g. KNET DTT Fuel Monitor"
                className={inputCls} />
            </Field>

            {/* Cluster URL */}
            <Field label="HiveMQ Cluster URL" dark={dark} required>
              <input name="clusterUrl" required
                defaultValue={config?.clusterUrl ?? ""}
                placeholder="example.s1.eu.hivemq.cloud"
                className={inputCls} />
            </Field>

            {/* Ports */}
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Secure MQTT Port" dark={dark}>
                <input name="mqttPort" type="number"
                  defaultValue={config?.mqttPort ?? 8883}
                  className={inputCls} />
              </Field>
              <Field label="Secure WebSocket Port" dark={dark}>
                <input name="websocketPort" type="number"
                  defaultValue={config?.websocketPort ?? 8884}
                  className={inputCls} />
              </Field>
            </div>

            {/* Credentials */}
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Username" dark={dark} required>
                <input name="username" required
                  defaultValue={config?.username ?? ""}
                  placeholder="admin"
                  className={inputCls} />
              </Field>
              <Field label="Password" dark={dark} required>
                <input name="password" type="password" required
                  defaultValue={config?.password ?? ""}
                  placeholder="••••••••••"
                  className={inputCls} />
              </Field>
            </div>

            {/* Topic info */}
            <div className={dark
              ? "rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-xs text-slate-400"
              : "rounded-xl border border-[#e7dfd4] bg-[#fffdf9] px-4 py-3 text-xs text-[#6b655d]"
            }>
              <div className={dark ? "mb-1 font-semibold text-slate-300" : "mb-1 font-semibold text-[#1a1814]"}>
                Topic format
              </div>
              The subscriber reads fuel data from{" "}
              <code className={dark ? "rounded bg-white/10 px-1 font-mono text-sky-400" : "rounded bg-[#f0ece6] px-1 font-mono text-blue-700"}>
                {"{siteName}/fuel"}
              </code>{" "}
              for each of your 42 sites. The site name in the topic must match the site name in the system. Payload is a plain number e.g.{" "}
              <code className={dark ? "rounded bg-white/10 px-1 font-mono text-sky-400" : "rounded bg-[#f0ece6] px-1 font-mono text-blue-700"}>
                67.5
              </code>
            </div>

            <div className="flex flex-wrap items-center gap-3 pt-2">
              <button type="submit" className={dark
                ? "inline-flex items-center gap-2 rounded-xl bg-[linear-gradient(135deg,#1d5fa8,#3b82f6)] px-5 py-2.5 text-sm font-bold text-white hover:opacity-90"
                : "inline-flex items-center gap-2 rounded-xl bg-[#1a1814] px-5 py-2.5 text-sm font-bold text-white hover:bg-[#2d2924]"
              }>
                Save Configuration
              </button>

              {config && (
                <button type="button" onClick={handleTest} disabled={testing}
                  className={dark
                    ? "inline-flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-5 py-2.5 text-sm font-bold text-emerald-300 hover:bg-emerald-500/20 disabled:opacity-40"
                    : "inline-flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-5 py-2.5 text-sm font-bold text-emerald-700 hover:bg-emerald-100 disabled:opacity-40"
                  }
                >
                  {testing
                    ? <><Loader2 size={15} className="animate-spin" /> Testing…</>
                    : <><Wifi size={15} /> Test HiveMQ Connection</>
                  }
                </button>
              )}

              {testResult === "ok" && (
                <span className={dark ? "text-sm font-semibold text-emerald-400" : "text-sm font-semibold text-emerald-700"}>
                  ✓ Connection successful
                </span>
              )}
              {testResult === "fail" && (
                <span className={dark ? "text-sm font-semibold text-red-400" : "text-sm font-semibold text-red-700"}>
                  ✗ Connection failed — check credentials
                </span>
              )}
            </div>
          </form>
        </section>

        
      </div>
    </div>
  );
}

function Field({ label, children, dark, required }: {
  label: string; children: React.ReactNode; dark: boolean; required?: boolean;
}) {
  return (
    <div>
      <label className={dark ? "mb-1.5 block text-xs font-medium text-slate-400" : "mb-1.5 block text-xs font-medium text-gray-600"}>
        {label}{required && <span className="ml-0.5 text-red-500">*</span>}
      </label>
      {children}
    </div>
  );
}
