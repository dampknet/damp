import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentProfile } from "@/lib/auth";
import ReceiptClient from "./ReceiptClient";

export default async function ReceiptPage({
  params,
  searchParams,
}: {
  params:        Promise<{ siteId: string }>;
  searchParams?: Promise<{ groupId?: string }>;
}) {
  const { siteId }  = await params;
  const sp          = (await searchParams) ?? {};
  const groupId     = sp.groupId ?? "";

  await getCurrentProfile(); // auth check

  const site = await prisma.inventorySite.findUnique({
    where:  { id: siteId },
    select: { id: true, name: true },
  });
  if (!site) return notFound();

  if (!groupId) return notFound();

  const issues = await prisma.warehouseIssue.findMany({
    where:   { groupId, inventorySiteId: siteId },
    orderBy: { takenAt: "asc" },
    select: {
      id:               true,
      quantityTaken:    true,
      takenBy:          true,
      takenByContact:   true,
      authorizedBy:     true,
      purpose:          true,
      takenAt:          true,
      expectedReturnAt: true,
      status:           true,
      conditionAtIssue: true,   // ✅
      inventoryItem: {
        select: {
          id:       true,
          name:     true,
          itemCode: true,
          itemType: true,
          unit:     true,
        },
      },
      lines: {
        select: {
          assetInstance: {
            select: { entityCode: true, condition: true },
          },
        },
      },
    },
  });

  if (!issues.length) return notFound();

  const first = issues[0];

  // Build receipt rows — one per entity for tracked, one per issue for bulk
  const receiptRows: {
    description: string;
    itemCode:    string;
    quantity:    number;
    condition:   string;
    returnable:  boolean;
  }[] = [];

  for (const issue of issues) {
    if (issue.lines.length > 0) {
      for (const line of issue.lines) {
        receiptRows.push({
          description: issue.inventoryItem.name,
          itemCode:    line.assetInstance.entityCode,
          quantity:    1,
          condition:   line.assetInstance.condition,
          returnable:  !!issue.expectedReturnAt,
        });
      }
    } else {
      receiptRows.push({
        description: issue.inventoryItem.name,
        itemCode:    issue.inventoryItem.itemCode ?? "",
        quantity:    issue.quantityTaken,
        condition:   (issue as any).conditionAtIssue ?? "",
        returnable:  !!issue.expectedReturnAt,
      });
    }
  }

  return (
    <ReceiptClient
      site={site}
      groupId={groupId}
      requesterName={first.takenBy}
      requesterContact={first.takenByContact ?? ""}
      authorizedBy={first.authorizedBy ?? ""}
      purpose={first.purpose}
      date={first.takenAt.toLocaleDateString("en-GB")}
      rows={receiptRows}
    />
  );
}
