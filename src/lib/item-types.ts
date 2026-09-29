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
