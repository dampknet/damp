export const ITEM_TYPES = [
  { value: "EQUIPMENT",              label: "Equipment",              code: "EQUIP"  },
  { value: "ACCESSORIES",            label: "Accessories",            code: "ACCESS" },
  { value: "TOOLS_AND_PARTS",        label: "Tools & Parts",          code: "TO/PA"  },
  { value: "GENERAL",                label: "General",                code: "GEN"    },
  { value: "COOLING_INFRASTRUCTURE", label: "Cooling Infrastructure", code: "COOL"   },
  { value: "CABLES_AND_ELECTRONICS", label: "Cables & Electronics",   code: "CA/EL"  },
  { value: "ACCESSORIES_AND_PARTS",  label: "Accessories & Parts",    code: "AC"     },
  { value: "TOOLS_AND_MAINTENANCE",  label: "Tools & Maintenance",    code: "TO"     },
  { value: "CABLES_AND_ELECTRICALS", label: "Cables & Electricals",   code: "CA"     },
] as const;

export type ItemTypeValue = (typeof ITEM_TYPES)[number]["value"];

export const ITEM_TYPE_LABEL: Record<string, string> = Object.fromEntries(
  ITEM_TYPES.map((t) => [t.value, t.label])
);

// Display name for an item's type: managed type (+ sub-type) when loaded, else the old fixed label.
// e.g. "Equipment › Solar Equipment"
export function typeLabel(item: {
  itemType?: string | null;
  typeRef?:  { name: string } | null;
  subType?:  { name: string } | null;
}) {
  const main = item.typeRef?.name ?? (item.itemType ? ITEM_TYPE_LABEL[item.itemType] ?? item.itemType : "—");
  return item.subType?.name ? `${main} › ${item.subType.name}` : main;
}

// Add to a Prisma `select` next to `itemType: true` to load the managed type / sub-type names.
export const TYPE_NAMES = {
  typeRef: { select: { name: true } },
  subType: { select: { name: true } },
} as const;

// Walks query results: wherever an object has itemType + typeRef/subType, itemType becomes the display
// name ("Equipment › Solar Equipment") and the helper fields are removed. Screens keep showing `itemType`.
export function withTypeLabels<T>(data: T): T {
  const walk = (v: unknown): unknown => {
    if (Array.isArray(v)) return v.map(walk);
    if (!v || typeof v !== "object" || v instanceof Date) return v;
    const o = v as Record<string, unknown>;
    const out: Record<string, unknown> = {};
    for (const [k, val] of Object.entries(o)) if (k !== "typeRef" && k !== "subType") out[k] = walk(val);
    if ("itemType" in o && ("typeRef" in o || "subType" in o)) {
      out.itemType = typeLabel({
        itemType: o.itemType as string,
        typeRef:  o.typeRef as { name: string } | null,
        subType:  o.subType as { name: string } | null,
      });
    }
    return out;
  };
  return walk(data) as T;
}

export const ITEM_CODE_SEGMENT: Record<string, string> = Object.fromEntries(
  ITEM_TYPES.map((t) => [t.value, t.code])
);

export const ALL_CODE_SEGMENTS: string[] = ITEM_TYPES
  .map((t) => `${t.code}-`)
  .sort((a, b) => b.length - a.length);

export const VALID_ITEM_TYPES: string[] = ITEM_TYPES.map((t) => t.value);

export const ITEM_TYPE_UPLOAD_HINT = ITEM_TYPES
  .map((t) => t.value.replace(/_/g, " "))
  .join(" · ");

export const ITEM_TYPE_ALIASES: Record<string, ItemTypeValue> = Object.fromEntries(
  ITEM_TYPES.flatMap((t) => {
    const label = t.label.toUpperCase();
    return [
      [t.value, t.value],
      [t.value.replace(/_/g, " "), t.value],
      [label, t.value],
      [label.replace(/&/g, "AND").replace(/\s+/g, " "), t.value],
    ];
  })
);

export const SITE_CODE_PREFIX: Record<string, string> = {
  NOC: "N",
};

export const ALL_SITE_PREFIXES = [
  "BAATSONA-", "TSEADDO-", "KANDA-", "KNET-", "BAAT-", "TSEA-", "GBC-", "N-",
];
