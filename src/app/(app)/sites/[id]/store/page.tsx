import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireCurrentProfile, isEditorProfile } from "@/lib/auth";
import { getDeliveries } from "@/lib/deliveries";
import SiteStoreClient from "./SiteStoreClient";

export default async function SiteStorePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const profile = await requireCurrentProfile();

  const site = await prisma.site.findUnique({ where: { id }, select: { id: true, name: true } });
  if (!site) return notFound();

  const [pending, delivered] = await Promise.all([
    getDeliveries({ destinationSiteId: id, deliveryStatus: "PENDING" }),
    getDeliveries({ destinationSiteId: id, deliveryStatus: { in: ["DELIVERED", "RETURNED"] } }),
  ]);

  return (
    <SiteStoreClient
      site={site}
      pending={pending}
      delivered={delivered}
      canConfirm={profile.isMasterAdmin}
      canReceive={isEditorProfile(profile)}
    />
  );
}
