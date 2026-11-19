// Report periods: ready-made ranges plus a custom From–To. Both ends are inclusive (whole days).

export const PERIOD_OPTIONS = [
  { value: "TODAY",      label: "Today"      },
  { value: "THIS_WEEK",  label: "This week"  },
  { value: "LAST_WEEK",  label: "Last week"  },
  { value: "THIS_MONTH", label: "This month" },
  { value: "LAST_MONTH", label: "Last month" },
  { value: "THIS_YEAR",  label: "This year"  },
  { value: "LAST_YEAR",  label: "Last year"  },
  { value: "CUSTOM",     label: "Custom dates…" },
] as const;

export type PeriodKey = (typeof PERIOD_OPTIONS)[number]["value"];

export type ResolvedPeriod = { start: Date; end: Date; label: string; slug: string };

const DAY = 86_400_000;
const fmt = (d: Date) => d.toLocaleDateString("en-GB");
const endOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);

function parseDay(value?: string | null) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value ?? "");
  if (!m) return null;
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  return isNaN(d.getTime()) || d.getMonth() !== Number(m[2]) - 1 ? null : d;
}

export function resolvePeriod(key: string, from?: string | null, to?: string | null): ResolvedPeriod | { error: string } {
  const now   = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const monday = new Date(today.getTime() - ((today.getDay() + 6) % 7) * DAY);

  switch (key) {
    case "TODAY":
      return { start: today, end: endOfDay(today), label: `Today (${fmt(today)})`, slug: fmt(today).replace(/\//g, "-") };
    case "THIS_WEEK": {
      const sun = new Date(monday.getTime() + 6 * DAY);
      return { start: monday, end: endOfDay(sun), label: `This week (${fmt(monday)} – ${fmt(sun)})`, slug: `week-${fmt(monday).replace(/\//g, "-")}` };
    }
    case "LAST_WEEK": {
      const mon = new Date(monday.getTime() - 7 * DAY);
      const sun = new Date(monday.getTime() - DAY);
      return { start: mon, end: endOfDay(sun), label: `Last week (${fmt(mon)} – ${fmt(sun)})`, slug: `week-${fmt(mon).replace(/\//g, "-")}` };
    }
    case "THIS_MONTH":
    case "LAST_MONTH": {
      const offset = key === "LAST_MONTH" ? -1 : 0;
      const start  = new Date(now.getFullYear(), now.getMonth() + offset, 1);
      const end    = endOfDay(new Date(now.getFullYear(), now.getMonth() + offset + 1, 0));
      const name   = start.toLocaleString("en-GB", { month: "long", year: "numeric" });
      return { start, end, label: name, slug: name.replace(/\s+/g, "-") };
    }
    case "THIS_YEAR":
    case "LAST_YEAR": {
      const year = now.getFullYear() - (key === "LAST_YEAR" ? 1 : 0);
      return { start: new Date(year, 0, 1), end: endOfDay(new Date(year, 11, 31)), label: `Year ${year}`, slug: `year-${year}` };
    }
    case "CUSTOM": {
      const a = parseDay(from), b = parseDay(to);
      if (!a || !b) return { error: "Choose both a From and a To date." };
      if (a > b)    return { error: "The From date must be on or before the To date." };
      return { start: a, end: endOfDay(b), label: `${fmt(a)} – ${fmt(b)}`, slug: `${fmt(a).replace(/\//g, "-")}_to_${fmt(b).replace(/\//g, "-")}` };
    }
    default:
      return { error: "Unknown period." };
  }
}
