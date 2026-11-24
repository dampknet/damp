import { canEditStore } from "@/lib/access";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentProfile } from "@/lib/auth";
import DeviceManagementClient from "./DeviceManagementClient";

export default async function DeviceManagementPage({
  params,
}: {
  params: Promise<{ siteId: string; itemId: string }>;
}) {
  const { siteId, itemId } = await params;
  const profile  = await getCurrentProfile();
  const role     = profile?.role ?? "VIEWER";
  const canEdit  = canEditStore(profile, siteId); // editor role + full access here

  const item = await prisma.inventoryItem.findFirst({
    where: {
      id:              itemId,
      inventorySiteId: siteId,
      isDeleted:       false,
    },
    include: {
      instances: {
        orderBy: { createdAt: "asc" },
      },
      inventorySite: true,
    },
  });

  if (!item) return notFound();

  return (
    <DeviceManagementClient
      item={item as any}
      canEdit={canEdit}
      role={role}
    />
  );
}
