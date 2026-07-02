import { prisma } from "@/lib/prisma";
import { getCurrentProfile } from "@/lib/auth";
import GlobalIssueLogClient from "./GlobalIssueLogClient";
import type { InventoryItemType } from "@prisma/client";

type SearchParams = {
  q?:      string;
  status?: "ALL" | "ISSUED" | "RETURNED";
  type?:   string; // any InventoryItemType value or "ALL"
};

const VALID_ITEM_TYPES: InventoryItemType[] = [
  "EQUIPMENT",
  "ACCESSORIES",
  "TOOLS_AND_PARTS",
  "GENERAL",
  "COOLING_INFRASTRUCTURE",
  "CABLES_AND_ELECTRONICS",
];

export default async function GlobalIssueLogPage({
  searchParams,
}: {
  searchParams?: Promise<SearchParams>;
}) {
  const sp     = (await searchParams) ?? {};
  const q      = (sp.q      ?? "").trim();
  const status = (sp.status ?? "ALL") as "ALL" | "ISSUED" | "RETURNED";
  const typeRaw = sp.type ?? "ALL";

  // ✅ Only pass a valid InventoryItemType to Prisma; ignore unknown values
  const itemTypeFilter: InventoryItemType | undefined =
    typeRaw !== "ALL" && VALID_ITEM_TYPES.includes(typeRaw as InventoryItemType)
      ? (typeRaw as InventoryItemType)
      : undefined;

  const profile  = await getCurrentProfile();
  const role     = profile?.role ?? "VIEWER";
  const canEdit  = role === "ADMIN" || role === "EDITOR";

  const issues = await prisma.inventoryIssue.findMany({
    where: {
      AND: [
        q ? {
          OR: [
            { requesterName:    { contains: q, mode: "insensitive" } },
            { requesterContact: { contains: q, mode: "insensitive" } },
            { purpose:          { contains: q, mode: "insensitive" } },
            { authorizedBy:     { contains: q, mode: "insensitive" } },
            { inventorySite: { name: { contains: q, mode: "insensitive" } } },
            { inventoryItem: { name: { contains: q, mode: "insensitive" } } },
            { inventoryItem: { itemCode: { contains: q, mode: "insensitive" } } },
            {
              inventoryItem: {
                instances: {
                  some: { entityCode: { contains: q, mode: "insensitive" } },
                },
              },
            },
          ],
        } : {},
        status !== "ALL" ? { status } : {},
        // ✅ Only add itemType filter when a valid type is selected
        itemTypeFilter ? { itemType: itemTypeFilter } : {},
      ],
    },
    orderBy: { issuedAt: "desc" },
    select: {
      id:                 true,
      itemType:           true,
      quantity:           true,
      requesterName:      true,
      requesterContact:   true,
      purpose:            true,
      authorizedBy:       true,
      issuedAt:           true,
      expectedReturnDate: true,
      returnedAt:         true,
      status:             true,
      inventoryItem: {
        select: {
          id:   true,
          name: true,
          unit: true,
          itemCode: true,
          instances: {
            select:  { entityCode: true },
            take:    3,
            orderBy: { createdAt: "asc" },
          },
        },
      },
      inventorySite: {
        select: { id: true, name: true },
      },
    },
  });

  // Flatten entity codes for the client
  const issuesMapped = issues.map((row) => ({
    ...row,
    inventoryItem: {
      ...row.inventoryItem,
      entityCodePreview:
        row.inventoryItem.instances.map((i) => i.entityCode).join(", ") || "-",
    },
  }));

  const [issuedCount, returnedCount, equipmentCount, othersCount] = await Promise.all([
    prisma.inventoryIssue.count({ where: { status: "ISSUED" } }),
    prisma.inventoryIssue.count({ where: { status: "RETURNED" } }),
    prisma.inventoryIssue.count({ where: { itemType: "EQUIPMENT" } }),
    prisma.inventoryIssue.count({
      where: {
        itemType: {
          in: ["ACCESSORIES", "TOOLS_AND_PARTS", "GENERAL", "COOLING_INFRASTRUCTURE", "CABLES_AND_ELECTRONICS"],
        },
      },
    }),
  ]);

  const exportRows = issuesMapped.map((row, index) => ({
    No:                index + 1,
    Site:              row.inventorySite.name,
    Item:              row.inventoryItem.name,
    "Item Code":       row.inventoryItem.itemCode ?? "",
    "Entity Codes":    row.inventoryItem.entityCodePreview,
    Type:              row.itemType,
    Quantity:          `${row.quantity}${row.inventoryItem.unit ? ` ${row.inventoryItem.unit}` : ""}`,
    Requester:         row.requesterName,
    Contact:           row.requesterContact ?? "",
    Purpose:           row.purpose,
    "Authorized By":   row.authorizedBy,
    "Issued At":       row.issuedAt.toISOString(),
    "Expected Return": row.expectedReturnDate?.toISOString() ?? "",
    "Returned At":     row.returnedAt?.toISOString() ?? "",
    Status:            row.status,
  }));

  const exportCols = [
    { key: "No",              label: "No"            },
    { key: "Site",            label: "Site"          },
    { key: "Item",            label: "Item"          },
    { key: "Item Code",       label: "Item Code"     },
    { key: "Entity Codes",    label: "Entity Codes"  },
    { key: "Type",            label: "Type"          },
    { key: "Quantity",        label: "Quantity"      },
    { key: "Requester",       label: "Requester"     },
    { key: "Contact",         label: "Contact"       },
    { key: "Purpose",         label: "Purpose"       },
    { key: "Authorized By",   label: "Authorized By" },
    { key: "Issued At",       label: "Issued At"     },
    { key: "Expected Return", label: "Expected Return"},
    { key: "Returned At",     label: "Returned At"   },
    { key: "Status",          label: "Status"        },
  ];

  return (
    <GlobalIssueLogClient
      role={role}
      canEdit={canEdit}
      q={q}
      status={status}
      type={typeRaw}
      summary={{ issuedCount, returnedCount, equipmentCount, othersCount }}
      issues={issuesMapped as any}
      exportRows={exportRows}
      exportCols={exportCols}
    />
  );
}
