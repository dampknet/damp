import { headers } from "next/headers";

export type RequestInfo = {
  ip:        string;
  os:        string;
  browser:   string;
  device:    string;
  userAgent: string;
};

const UNKNOWN: RequestInfo = {
  ip:        "unknown",
  os:        "Unknown OS",
  browser:   "Unknown browser",
  device:    "Unknown device",
  userAgent: "",
};

function detectOs(ua: string): string {
  const win = ua.match(/Windows NT ([\d.]+)/);
  if (win) {
    const map: Record<string, string> = {
      "10.0": "Windows 10/11",
      "6.3":  "Windows 8.1",
      "6.2":  "Windows 8",
      "6.1":  "Windows 7",
    };
    return map[win[1]] ?? "Windows";
  }

  const ios = ua.match(/(iPhone|iPad|iPod).*?OS (\d+)[_\d]*/);
  if (ios) return `iOS ${ios[2]}`;

  const android = ua.match(/Android (\d+(\.\d+)?)/);
  if (android) return `Android ${android[1]}`;

  if (/CrOS/.test(ua)) return "ChromeOS";

  const mac = ua.match(/Mac OS X (\d+)[_.](\d+)/);
  if (mac) return `macOS ${mac[1]}.${mac[2]}`;

  if (/Ubuntu/i.test(ua)) return "Ubuntu Linux";
  if (/Linux/.test(ua))   return "Linux";

  return "Unknown OS";
}

function detectBrowser(ua: string): string {
  const rules: [RegExp, string][] = [
    [/Edg(?:e|A|iOS)?\/(\d+)/,   "Edge"],
    [/OPR\/(\d+)/,               "Opera"],
    [/SamsungBrowser\/(\d+)/,    "Samsung Internet"],
    [/Firefox\/(\d+)/,           "Firefox"],
    [/FxiOS\/(\d+)/,             "Firefox"],
    [/CriOS\/(\d+)/,             "Chrome"],
    [/Chrome\/(\d+)/,            "Chrome"],
    [/Version\/(\d+).*Safari/,   "Safari"],
  ];
  for (const [re, name] of rules) {
    const m = ua.match(re);
    if (m) return `${name} ${m[1]}`;
  }
  return "Unknown browser";
}

function detectDevice(ua: string): string {
  if (/iPad|Tablet/i.test(ua))                         return "Tablet";
  if (/Mobi|iPhone|iPod|Android.*Mobile/i.test(ua))    return "Mobile";
  if (/Android/i.test(ua))                             return "Tablet";
  return ua ? "Desktop" : "Unknown device";
}

export function parseUserAgent(ua: string): Omit<RequestInfo, "ip"> {
  return {
    os:        detectOs(ua),
    browser:   detectBrowser(ua),
    device:    detectDevice(ua),
    userAgent: ua,
  };
}

export async function getRequestInfo(): Promise<RequestInfo> {
  try {
    const h  = await headers();
    const ua = h.get("user-agent") ?? "";
    const ip =
      h.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      h.get("x-real-ip") ||
      h.get("cf-connecting-ip") ||
      "unknown";

    return { ip, ...parseUserAgent(ua) };
  } catch {
    return UNKNOWN;
  }
}

export function formatRequestInfo(info: RequestInfo): string {
  return `IP: ${info.ip} | OS: ${info.os} | Browser: ${info.browser} | Device: ${info.device}`;
}
