import { prisma } from "@/lib/prisma";
import { getCurrentProfile } from "@/lib/auth";
import StoreClient from "./StoreClient";

type SearchParams = {
  q?: string;
  status?: "ALL" | "RECEIVED" | "NOT_RECEIVED";
};

export default async function CentralStockPage({
  searchParams,
}: {
  searchParams?: Promise<SearchParams>;
}) {
  const profile = await getCurrentProfile();
  const role = profile?.role ?? "VIEWER";
  const canEdit = role === "ADMIN" || role === "EDITOR";

  const sp = (await searchParams) ?? {};
  const q = (sp.q ?? "").trim();
  const status: "ALL" | "RECEIVED" | "NOT_RECEIVED" = sp.status ?? "ALL";

  const qAsNumber = Number(q);
  const isNumberSearch = q.length > 0 && Number.isFinite(qAsNumber);

  const items = await prisma.storeItem.findMany({
  where: {
    AND: [
      { isDeleted: false }, // ✅ IMPORTANT

      q
        ? {
            OR: [
              { description: { contains: q, mode: "insensitive" } },
              ...(isNumberSearch ? [{ itemNo: qAsNumber }] : []),
            ],
          }
        : {},

      status !== "ALL" ? { status } : {},
    ],
  },
  orderBy: { itemNo: "asc" },
  select: {
    id: true,
    itemNo: true,
    description: true,
    quantity: true,
    status: true,
  },
});

  const [receivedCount, notReceivedCount] = await Promise.all([
  prisma.storeItem.count({
    where: { status: "RECEIVED", isDeleted: false },
  }),
  prisma.storeItem.count({
    where: { status: "NOT_RECEIVED", isDeleted: false },
  }),
]);

  const statusLabel =
    status === "ALL" ? "All" : status === "RECEIVED" ? "Received" : "Not received";

  const printTitleParts = ["Central Stock"];
  if (q) printTitleParts.push(`Search: ${q}`);
  if (status !== "ALL") printTitleParts.push(`Status: ${statusLabel}`);
  const printTitle = printTitleParts.join(" — ");

  const exportRows = items.map((it) => ({
    Item: it.itemNo,
    Description: it.description,
    Quantity: it.quantity,
    Status: it.status === "RECEIVED" ? "RECEIVED" : "NOT RECEIVED",
  }));

  const exportCols = [
    { key: "Item", label: "Item" },
    { key: "Description", label: "Description" },
    { key: "Quantity", label: "Quantity" },
    { key: "Status", label: "Status" },
  ];

  const itemMini = items.map((it) => ({
    id: it.id,
    itemNo: it.itemNo,
  }));

  return (
    <StoreClient
      role={role}
      canEdit={canEdit}
      q={q}
      status={status}
      printTitle={printTitle}
      items={items}
      receivedCount={receivedCount}
      notReceivedCount={notReceivedCount}
      exportRows={exportRows}
      exportCols={exportCols}
      itemMini={itemMini}
    />
  );
}