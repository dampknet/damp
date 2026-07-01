import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentProfile } from "@/lib/auth";
import IssueLogClient from "./IssueLogClient";

type SearchParams = {
  q?:      string;
  status?: "ALL" | "ISSUED" | "RETURNED";
  type?:   "ALL" | "EQUIPMENT" | "ACCESSORIES" | "TOOLS_AND_PARTS" | "GENERAL" | "COOLING_INFRASTRUCTURE" | "CABLES_AND_ELECTRONICS";
};

export default async function SiteIssueLogPage({
  params,
  searchParams,
}: {
  params:       Promise<{ siteId: string }>;
  searchParams?: Promise<SearchParams>;
}) {
  const { siteId } = await params;
  const sp         = (await searchParams) ?? {};

  const profile  = await getCurrentProfile();
  const role     = profile?.role ?? "VIEWER";
  const canEdit  = role === "ADMIN" || role === "EDITOR";

  const q      = (sp.q ?? "").trim();
  const status = sp.status ?? "ALL";
  const type   = sp.type   ?? "ALL";

  const site = await prisma.inventorySite.findUnique({
    where:  { id: siteId },
    select: { id: true, name: true, location: true, description: true },
  });
  if (!site) return notFound();

  const rawIssues = await prisma.inventoryIssue.findMany({
    where: {
      inventorySiteId: siteId,
      AND: [
        q ? {
          OR: [
            { requesterName:    { contains: q, mode: "insensitive" } },
            { requesterContact: { contains: q, mode: "insensitive" } },
            { purpose:          { contains: q, mode: "insensitive" } },
            { authorizedBy:     { contains: q, mode: "insensitive" } },
            { inventoryItem: { name:     { contains: q, mode: "insensitive" } } },
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
        type   !== "ALL" ? { itemType: type } : {},
      ],
    },
    orderBy: { issuedAt: "desc" },
    select: {
      id:                true,
      itemType:          true,
      quantity:          true,
      requesterName:     true,
      requesterContact:  true,
      department:        true,
      purpose:           true,
      authorizedBy:      true,
      issuedAt:          true,
      expectedReturnDate: true,
      conditionAtIssue:  true,
      returnedBy:        true,
      returnContact:     true,
      returnedAt:        true,
      returnCondition:   true,
      returnNote:        true,
      status:            true,
      inventoryItem: {
        select: {
          id:       true,
          name:     true,
          itemCode: true,
          unit:     true,
          instances: {
            select:  { entityCode: true },
            take:    3,
            orderBy: { createdAt: "asc" },
          },
        },
      },
    },
  });

  const issues = rawIssues.map((issue) => ({
    ...issue,
    inventoryItem: {
      ...issue.inventoryItem,
      entityCodePreview:
        issue.inventoryItem.instances.map((i) => i.entityCode).join(", ") || "-",
    },
  }));

  const [issuedCount, returnedCount, equipmentCount, othersCount] = await Promise.all([
    prisma.inventoryIssue.count({ where: { inventorySiteId: siteId, status: "ISSUED" } }),
    prisma.inventoryIssue.count({ where: { inventorySiteId: siteId, status: "RETURNED" } }),
    prisma.inventoryIssue.count({ where: { inventorySiteId: siteId, itemType: "EQUIPMENT" } }),
    prisma.inventoryIssue.count({
      where: {
        inventorySiteId: siteId,
        itemType: { in: ["ACCESSORIES","TOOLS_AND_PARTS","GENERAL","COOLING_INFRASTRUCTURE","CABLES_AND_ELECTRONICS"] },
      },
    }),
  ]);

  const exportRows = issues.map((issue, index) => ({
    No:               index + 1,
    Item:             issue.inventoryItem.name,
    "Item Code":      issue.inventoryItem.itemCode ?? "",
    "Entity Codes":   issue.inventoryItem.entityCodePreview,
    Type:             issue.itemType,
    Quantity:         `${issue.quantity}${issue.inventoryItem.unit ? ` ${issue.inventoryItem.unit}` : ""}`,
    Requester:        issue.requesterName,
    Contact:          issue.requesterContact ?? "",
    Department:       issue.department ?? "",
    Purpose:          issue.purpose,
    "Authorized By":  issue.authorizedBy,
    "Issued At":      issue.issuedAt.toISOString(),
    "Expected Return": issue.expectedReturnDate?.toISOString() ?? "",
    "Returned At":    issue.returnedAt?.toISOString() ?? "",
    "Returned By":    issue.returnedBy ?? "",
    Status:           issue.status,
    "Condition At Issue": issue.conditionAtIssue ?? "",
    "Return Condition":   issue.returnCondition ?? "",
    "Return Note":        issue.returnNote ?? "",
  }));

  const exportCols = [
    { key: "No",           label: "No" },
    { key: "Item",         label: "Item" },
    { key: "Item Code",    label: "Item Code" },
    { key: "Entity Codes", label: "Entity Codes" },
    { key: "Type",         label: "Type" },
    { key: "Quantity",     label: "Quantity" },
    { key: "Requester",    label: "Requester" },
    { key: "Contact",      label: "Contact" },
    { key: "Department",   label: "Department" },
    { key: "Purpose",      label: "Purpose" },
    { key: "Authorized By",  label: "Authorized By" },
    { key: "Issued At",      label: "Issued At" },
    { key: "Expected Return", label: "Expected Return" },
    { key: "Returned At",    label: "Returned At" },
    { key: "Returned By",    label: "Returned By" },
    { key: "Status",         label: "Status" },
    { key: "Condition At Issue", label: "Condition At Issue" },
    { key: "Return Condition",   label: "Return Condition" },
    { key: "Return Note",        label: "Return Note" },
  ];

  return (
    <IssueLogClient
      role={role}
      canEdit={canEdit}
      site={site}
      q={q}
      status={status}
      type={type}
      summary={{ issuedCount, returnedCount, equipmentCount, othersCount }}
      issues={issues as any}
      exportRows={exportRows}
      exportCols={exportCols}
    />
  );
}
