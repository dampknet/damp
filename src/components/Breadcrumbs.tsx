"use client";

import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { useThemeMode } from "@/context/ThemeContext";

export type Crumb = { label: string; href?: string };

// The trail at the top of inner pages (e.g. ADMIN › RECYCLE BIN). Every step with an href goes back up to that page;
// the last step is the current page. Same look as the Access Control page.
export default function Breadcrumbs({ items, className = "mb-5" }: { items: Crumb[]; className?: string }) {
  const { mode } = useThemeMode();
  const dark     = mode === "dark";
  const muted    = dark ? "text-slate-500"   : "text-[#8b857c]";
  const current  = dark ? "text-slate-100"   : "text-[#1a1814]";
  const hover    = dark ? "hover:bg-white/5 hover:text-slate-200" : "hover:bg-[#ece6dc] hover:text-[#1a1814]";

  return (
    <nav aria-label="Breadcrumb" className={`flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] font-semibold uppercase tracking-[0.15em] print:hidden ${muted} ${className}`}>
      {items.map((c, i) => {
        const last = i === items.length - 1;
        return (
          <span key={`${i}-${c.label}`} className="inline-flex min-w-0 items-center gap-2">
            {c.href && !last ? (
              <Link href={c.href} className={`max-w-[16rem] truncate rounded px-1 py-0.5 transition ${hover}`}>{c.label}</Link>
            ) : (
              <span aria-current={last ? "page" : undefined} className={`max-w-[20rem] truncate px-1 py-0.5 ${last ? current : ""}`}>{c.label}</span>
            )}
            {!last && <ChevronRight size={13} className="shrink-0 opacity-40" />}
          </span>
        );
      })}
    </nav>
  );
}
