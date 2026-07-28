import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentProfile } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { isRedirectError } from "next/dist/client/components/redirect-error";
import MqttSettingsClient from "./MqttSettingsClient";

export default async function MqttSettingsPage() {
  const profile = await getCurrentProfile();
  if (!profile)                redirect("/auth/login");
  if (profile.role !== "ADMIN") redirect("/dashboard");

  const config = await prisma.mqttConfig.findFirst();

  async function saveMqttConfig(formData: FormData) {
    "use server";

    const connectionName = String(formData.get("connectionName") ?? "").trim();
    const clusterUrl     = String(formData.get("clusterUrl")     ?? "").trim();
    const mqttPort       = Number(formData.get("mqttPort")       ?? 8883);
    const websocketPort  = Number(formData.get("websocketPort")  ?? 8884);
    const username       = String(formData.get("username")       ?? "").trim();
    const password       = String(formData.get("password")       ?? "").trim();

    if (!clusterUrl || !username || !password) {
      redirect("/admin/mqtt?error=Cluster+URL%2C+username+and+password+are+required");
    }

    let dbError: string | null = null;
    try {
      const existing = await prisma.mqttConfig.findFirst();
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
      config={config as any}
      action={saveMqttConfig}
    />
  );
}
