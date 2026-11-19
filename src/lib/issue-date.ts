// Back-dating issues (master admin only): the waybill/report date ("takenAt") can be set to the
// real issue date. "createdAt" is never changed, so the system still shows when it was entered.

const EARLIEST = new Date(2020, 0, 1);

// "YYYY-MM-DD" → that day at 12:00 server time (noon avoids slipping a day across time zones).
export function parseIssueDate(value: string): { date: Date } | { error: string } {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim());
  if (!m) return { error: "Choose a valid issue date." };
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]), 12, 0, 0, 0);
  if (isNaN(d.getTime()) || d.getMonth() !== Number(m[2]) - 1) return { error: "Choose a valid issue date." };

  const now = new Date();
  const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
  if (d > endOfToday) return { error: "The issue date can't be in the future." };
  if (d < EARLIEST)   return { error: "The issue date can't be before 2020." };
  return { date: d };
}

// For <input type="date"> values.
export function toDateInput(d: Date) {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

// True when the issue date is on a different day from when it was entered.
export function isBackdated(takenAt: Date, createdAt: Date) {
  return toDateInput(takenAt) !== toDateInput(createdAt);
}
