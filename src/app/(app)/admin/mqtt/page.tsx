import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentProfile, requireMasterAdmin } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { isRedirectError } from "next/dist/client/components/redirect-error";
import { encryptSecret, hasEncryptionKey } from "@/lib/secrets";
import MqttSettingsClient from "./MqttSettingsClient";

export default async function MqttSettingsPage() {
  await requireMasterAdmin();

  const config = await prisma.mqttConfig.findFirst();

  async function saveMqttConfig(formData: FormData) {
    "use server";

    const me = await getCurrentProfile();
    if (!me?.isMasterAdmin) redirect("/dashboard");

    const connectionName = String(formData.get("connectionName") ?? "").trim();
    const clusterUrl     = String(formData.get("clusterUrl")     ?? "").trim();
    const mqttPort       = Number(formData.get("mqttPort")       ?? 8883);
    const websocketPort  = Number(formData.get("websocketPort")  ?? 8884);
    const username       = String(formData.get("username")       ?? "").trim();
    const newPassword    = String(formData.get("password")       ?? "").trim();

    const existing = await prisma.mqttConfig.findFirst();

    if (!clusterUrl || !username || (!newPassword && !existing?.password)) {
      redirect("/admin/mqtt?error=Cluster+URL%2C+username+and+password+are+required");
    }

    if (newPassword && !hasEncryptionKey()) {
      redirect("/admin/mqtt?error=CONFIG_ENCRYPTION_KEY+is+not+set%2C+so+the+password+cannot+be+stored+safely");
    }

    const password = newPassword ? encryptSecret(newPassword) : existing!.password;

    let dbError: string | null = null;
    try {
      if (existing) {
        await prisma.mqttConfig.update({
          where: { id: existing.id },
          data: { connectionName, clusterUrl, mqttPort, websocketPort, username, password },
        });
      } else {
        await prisma.mqttConfig.create({
          data: { connectionName, clusterUrl, mqttPort, websocketPort, username, password },
        });
      }

      await prisma.activityLog.create({
        data: {
          type:       "SYSTEM_EVENT",
          title:      "HiveMQ settings updated",
          details:    `Cluster: ${clusterUrl}. Password ${newPassword ? "replaced" : "unchanged"}. Changed by ${me.email}.`,
          actorEmail: me.email,
          entityType: "SECURITY",
        },
      }).catch(() => {});

      revalidatePath("/admin/mqtt");
    } catch (e) {
      if (isRedirectError(e)) throw e;
      dbError = (e as any)?.message ?? "Failed to save";
    }

    if (dbError) {
      redirect(`/admin/mqtt?error=${encodeURIComponent(dbError)}`);
    }
    redirect("/admin/mqtt?success=HiveMQ+configuration+saved");
  }

  return (
    <MqttSettingsClient
      config={config ? {
        id:             config.id,
        connectionName: config.connectionName ?? "",
        clusterUrl:     config.clusterUrl,
        mqttPort:       config.mqttPort,
        websocketPort:  config.websocketPort,
        username:       config.username,
        hasPassword:    !!config.password,
      } : null}
      action={saveMqttConfig}
    />
  );
}
