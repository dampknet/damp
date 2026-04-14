"use client";

import Link from "next/link";
import { useMemo, useState, useEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { useThemeMode } from "@/context/ThemeContext";
import { X, Trash2, Loader2, CheckCircle2, QrCode, ArrowLeft } from "lucide-react";

type ItemRow = {
  id: string;
  name: string;
  itemType: "MATERIAL" | "EQUIPMENT";
  quantity: number;
  unit: string | null;
  stockNumber: string | null;
  serialNumber: string | null;
  reorderLevel: number;
  status: "AVAILABLE" | "LOW_STOCK" | "OUT_OF_STOCK" | "CHECKED_OUT" | "INACTIVE";
  condition: "GOOD" | "FAULTY" | "DAMAGED" | "UNDER_REPAIR" | null;
};

export default function IssueInventoryItemClient({
  site,
  items,
  action,
}: {
  site: {
    id: string;
    name: string;
    location: string | null;
  };
  items: ItemRow[];
  action: (formData: FormData) => void;
}) {
  const { mode } = useThemeMode();
  const dark = mode === "dark";
  const searchParams = useSearchParams();
  const error = searchParams.get("error");

  const [bucket, setBucket] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const scanBuffer = useRef("");
  const lastKeyTime = useRef(0);


  // ✅ HIGH-SPEED SYBLE COLLECTOR
  useEffect(() => {
    let timeout: NodeJS.Timeout;

    const handleKeyDown = (e: KeyboardEvent) => {
      // If it's a normal character, add to buffer
      if (e.key.length === 1) {
        scanBuffer.current += e.key;
      }

      // If "Enter" is hit, the gun is done with one segment
      if (e.key === "Enter") {
        e.preventDefault();
        
        // We wait 150ms after the last "Enter" to make sure 
        // the multi-line scan is fully captured before sending to DB
        clearTimeout(timeout);
        timeout = setTimeout(() => {
          if (scanBuffer.current.length > 3) {
            const fullJunk = scanBuffer.current;
            scanBuffer.current = ""; // Reset for next item
            handleScan(fullJunk);
          }
        }, 150); 
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      clearTimeout(timeout);
    };
  }, [bucket]);

  const handleScan = async (fullData: string) => {
    setIsSearching(true);
    try {
      // Use encodeURIComponent so the messy symbols don't break the internet connection
      const res = await fetch(`/api/store/instances/scan?serial=${encodeURIComponent(fullData.trim())}`);
      
      if (!res.ok) {
        const errData = await res.json();
        alert(errData.error || "Item not found in database");
        return;
      }

      const data = await res.json();
      
      setBucket((prev) => {
        const existing = prev.find((i) => i.id === data.id);
        if (existing) {
          if (existing.serials.some((s: any) => s.sn === data.serialNumber)) return prev;
          return prev.map((i) => i.id === data.id ? { 
            ...i, 
            quantity: i.quantity + 1, 
            serials: [...i.serials, { sn: data.serialNumber, condition: data.condition }] 
          } : i);
        }
        return [...prev, {
          id: data.id, 
          name: data.name, 
          itemType: data.itemType, 
          quantity: 1,
          serials: [{ sn: data.serialNumber, condition: data.condition }],
          expectedReturnDate: ""
        }];
      });
    } catch (e) {
      // If it still fails, it's likely a network timeout because the string was too long
      alert("Connection timeout. The scan was too large. Try scanning that specific item again.");
    } finally {
      setIsSearching(false);
    }
  };

  const getConditionStyle = (c: string) => {
    if (c === "NEW") return "bg-blue-600";
    if (c === "GOOD") return "bg-emerald-600";
    return "bg-rose-600";
  };

  return (
    <div className={dark ? "min-h-screen bg-[linear-gradient(135deg,#0d1117_0%,#0f1923_50%,#0d1117_100%)] text-slate-200" : "min-h-screen bg-[linear-gradient(180deg,#fbf8f3_0%,#f5f2ed_48%,#f2ede5_100%)]"}>
      <div className="mx-auto max-w-5xl px-4 py-8 md:px-6">
        <section className={dark ? "relative overflow-hidden rounded-[28px] border border-white/10 bg-white/5 p-8 backdrop-blur-xl" : "relative overflow-hidden rounded-[28px] border border-[#e7ded3] bg-white/95 p-8 shadow-[0_16px_40px_rgba(26,24,20,0.06)]"}>
          
          <div className={dark ? "pointer-events-none absolute inset-x-0 top-0 h-1 bg-[linear-gradient(90deg,#1d5fa8,#3b82f6,#f97316)]" : "pointer-events-none absolute inset-x-0 top-0 h-1 bg-[linear-gradient(90deg,#1d5fa8,#3b82f6,#c8611a)]"} />

          <div className="flex flex-col gap-3">
            <Link href={`/store/sites/${site.id}`} className={dark ? "inline-flex w-fit items-center gap-2 text-sm font-medium text-slate-400 hover:underline" : "inline-flex w-fit items-center gap-2 text-sm font-medium text-[#6f6a62] hover:underline"}>
              ← Back to {site.name} Inventory
            </Link>
            <div className="flex items-center justify-between">
              <div className={dark ? "inline-flex w-fit items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-[#f97316]" : "inline-flex w-fit items-center gap-2 rounded-full border border-[#eadfce] bg-[#fcfaf6] px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-[#c8611a]"}>
                <span className="h-2 w-2 rounded-full bg-emerald-500" />
                Issue Smart Bucket
              </div>
              {isSearching && <div className="flex items-center gap-2 text-xs font-bold text-sky-500 animate-pulse"><Loader2 size={14} className="animate-spin" /> SCANNING...</div>}
            </div>
          </div>

          <h1 className={dark ? "mt-5 text-3xl font-semibold tracking-tight text-slate-100 md:text-4xl" : "mt-5 text-3xl font-semibold tracking-tight text-[#1a1814] md:text-4xl"}>
            Issue Inventory Items
          </h1>

          <div className={`mt-8 overflow-hidden rounded-2xl border ${dark ? 'border-white/10 bg-white/5' : 'border-slate-200 bg-slate-50'}`}>
            <table className="w-full text-left">
              <thead>
                <tr className={`text-[10px] font-black uppercase tracking-widest ${dark ? 'bg-white/5 text-slate-500' : 'bg-slate-100 text-slate-500'}`}>
                  <th className="px-6 py-4">Item</th>
                  <th className="px-6 py-4">Serials / Condition</th>
                  <th className="px-6 py-4 text-center">Qty</th>
                  <th className="px-6 py-4">Return Date</th>
                  <th className="px-6 py-4"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-500/10">
                {bucket.length === 0 && (
                  <tr><td colSpan={5} className="py-16 text-center opacity-30 italic font-black text-sm uppercase tracking-widest">Ready for Syble Scan...</td></tr>
                )}
                {bucket.map((item, index) => (
                  <tr key={item.id} className="hover:bg-sky-500/5 transition-colors">
                    <td className="px-6 py-4 font-bold text-sm">{item.name}</td>
                    <td className="px-6 py-4">
                      <div className="flex flex-wrap gap-2">
                        {item.serials.map((s: any) => (
                          <span key={s.sn} className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-[10px] font-black text-white ${getConditionStyle(s.condition)}`}>
                            {s.sn}
                            <button 
                              type="button"
                              aria-label={`Remove serial ${s.sn}`}
                              title={`Remove serial ${s.sn}`}
                              className="hover:scale-125 transition-transform"
                              onClick={() => {
                               const filtered = item.serials.filter((x:any) => x.sn !== s.sn);
                               setBucket(prev => filtered.length ? prev.map(i => i.id === item.id ? {...i, serials: filtered, quantity: filtered.length} : i) : prev.filter(i => i.id !== item.id));
                            }}>
                                <X size={12} />
                            </button>
                          </span>
                        ))}
                        {item.itemType === "MATERIAL" && <span className="text-[10px] font-bold opacity-40 uppercase">Material Bulk</span>}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      {item.itemType === "MATERIAL" ? (
                        <input 
                          type="number" 
                          min="1" 
                          value={item.quantity} 
                          title={`Quantity for ${item.name}`}
                          aria-label={`Quantity for ${item.name}`}
                          onChange={(e) => setBucket(prev => prev.map(i => i.id === item.id ? {...i, quantity: Number(e.target.value)} : i))} 
                          className="w-16 bg-transparent border-b-sky-500 border-b-2 text-center font-bold outline-none" 
                        />
                      ) : <span className="font-mono font-bold">{item.quantity}</span>}
                    </td>
                    <td className="px-6 py-4">
                      {item.itemType === "EQUIPMENT" && (
                        <input 
                          type="date" 
                          title={`Expected return date for ${item.name}`}
                          aria-label={`Expected return date for ${item.name}`}
                          onChange={(e) => setBucket(prev => prev.map(i => i.id === item.id ? {...i, expectedReturnDate: e.target.value} : i))} 
                          className="bg-transparent text-xs font-bold outline-none border-b border-slate-500/20" 
                        />
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                       <button 
                        type="button"
                        aria-label={`Remove ${item.name} from bucket`}
                        title={`Remove ${item.name} from bucket`}
                        onClick={() => setBucket(prev => prev.filter(i => i.id !== item.id))} 
                        className="text-slate-400 hover:text-rose-500 transition-colors">
                          <Trash2 size={18}/>
                       </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-6 flex flex-col md:flex-row gap-4">
             <select 
              title="Select material to add manually"
              aria-label="Select material to add manually"
              className={`flex-1 rounded-xl border px-4 py-3 text-sm font-medium outline-none ${dark ? "border-white/10 bg-white/5 text-slate-100" : "border-[#ddd5c9] bg-white text-slate-900"}`}
              onChange={(e) => {
                const itm = items.find((i: any) => i.id === e.target.value);
                if (itm) setBucket(prev => [...prev, { id: itm.id, name: itm.name, itemType: itm.itemType, quantity: 1, serials: [], expectedReturnDate: "" }]);
              }}
             >
               <option value="">Manual Search & Add (Bolts/Cables)...</option>
               {items.filter((i: any) => i.itemType === "MATERIAL").map((i: any) => (
                 <option key={i.id} value={i.id}>{i.name} ({i.quantity} available)</option>
               ))}
             </select>
          </div>

          <form action={action} onSubmit={(e) => {
              if (bucket.length === 0) { e.preventDefault(); alert("Bucket is empty!"); return; }
              const fd = new FormData(e.currentTarget);
              fd.append("bucketData", JSON.stringify(bucket));
            }}
            className="mt-10 space-y-8"
          >
            <section className={dark ? "rounded-2xl border border-white/10 bg-white/5 p-5" : "rounded-2xl border border-[#e7dfd4] bg-[#fffdfa] p-5"}>
              <div className={dark ? "text-sm font-semibold text-slate-100" : "text-sm font-semibold text-[#1a1814]"}>Requester Details</div>
              <div className="mt-4 grid gap-4 md:grid-cols-2">
                <Field label="Requester Name" dark={dark}>
                  <input 
                    name="requesterName" 
                    required 
                    title="Enter requester full name"
                    placeholder="Full Name" 
                    className={dark ? "w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-slate-100 outline-none" : "w-full rounded-xl border border-[#ddd5c9] bg-white px-3 py-2.5 text-sm outline-none"} 
                  />
                </Field>
                <Field label="Contact" dark={dark}>
                  <input 
                    name="requesterContact" 
                    required 
                    title="Enter requester contact number"
                    placeholder="Phone Number" 
                    className={dark ? "w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-slate-100 outline-none" : "w-full rounded-xl border border-[#ddd5c9] bg-white px-3 py-2.5 text-sm outline-none"} 
                  />
                </Field>
              </div>
              <div className="mt-4">
                <Field label="Department" dark={dark}>
                  <input 
                    name="department" 
                    title="Enter requester department"
                    placeholder="Team/Department" 
                    className={dark ? "w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-slate-100 outline-none" : "w-full rounded-xl border border-[#ddd5c9] bg-white px-3 py-2.5 text-sm outline-none"} 
                  />
                </Field>
              </div>
            </section>

            <section className={dark ? "rounded-2xl border border-white/10 bg-white/5 p-5" : "rounded-2xl border border-[#e7dfd4] bg-[#fffdfa] p-5"}>
              <div className={dark ? "text-sm font-semibold text-slate-100" : "text-sm font-semibold text-[#1a1814]"}>Authorization & Purpose</div>
              <div className="mt-4 grid gap-4 md:grid-cols-2">
                <Field label="Authorized By" dark={dark}>
                  <input 
                    name="authorizedBy" 
                    required 
                    title="Enter name of authorizing officer"
                    placeholder="Approving Officer" 
                    className={dark ? "w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-slate-100 outline-none" : "w-full rounded-xl border border-[#ddd5c9] bg-white px-3 py-2.5 text-sm outline-none"} 
                  />
                </Field>
              </div>
              <div className="mt-4">
                <Field label="Purpose" dark={dark}>
                  <textarea 
                    name="purpose" 
                    rows={4} 
                    required 
                    title="Enter the reason or project for issuing"
                    placeholder="Project details..." 
                    className={dark ? "w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-slate-100 outline-none" : "w-full rounded-xl border border-[#ddd5c9] bg-white px-3 py-2.5 text-sm outline-none"} 
                  />
                </Field>
              </div>
            </section>

            <div className="flex flex-wrap items-center gap-2 pt-2">
              <button 
                type="submit" 
                title="Process the checkout for all items in bucket"
                className={dark ? "rounded-xl bg-[linear-gradient(135deg,#1d5fa8,#3b82f6)] px-8 py-3 text-sm font-bold text-white hover:opacity-90" : "rounded-xl bg-[#1a1814] px-8 py-3 text-sm font-bold text-white hover:bg-[#2d2924]"}
              >
                Process Multi-Item Issue ({bucket.reduce((acc, i) => acc + i.quantity, 0)})
              </button>
              <Link href={`/store/sites/${site.id}`} className={dark ? "rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-medium text-slate-200" : "rounded-xl border border-[#ddd5c9] bg-white px-4 py-3 text-sm font-medium text-[#1a1814]"}>
                Cancel
              </Link>
            </div>
          </form>
        </section>
      </div>
    </div>
  );
}

function Field({ label, children, dark }: any) {
  return (
    <div className="block">
      <div className={dark ? "mb-1 text-xs font-medium text-slate-400" : "mb-1 text-xs font-medium text-gray-600"}>{label}</div>
      {children}
    </div>
  );
}