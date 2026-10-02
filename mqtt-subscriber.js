require("dotenv").config();
const mqtt         = require("mqtt");
const crypto       = require("crypto");
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

const ENC_PREFIX = "enc:v1:";

function decryptSecret(value) {
  if (!value || !value.startsWith(ENC_PREFIX)) return value;
  const raw = process.env.CONFIG_ENCRYPTION_KEY || "";
  if (raw.length < 32) {
    throw new Error("CONFIG_ENCRYPTION_KEY is missing on this server. It must match the one used by the web app.");
  }
  const key = crypto.createHash("sha256").update(raw).digest();
  const [ivB64, tagB64, dataB64] = value.slice(ENC_PREFIX.length).split(":");
  const decipher = crypto.createDecipheriv("aes-256-gcm", key, Buffer.from(ivB64, "base64"));
  decipher.setAuthTag(Buffer.from(tagB64, "base64"));
  return Buffer.concat([decipher.update(Buffer.from(dataB64, "base64")), decipher.final()]).toString("utf8");
}

async function main() {
  console.log("[DAMP Fuel] Starting MQTT subscriber...");

  const config = await prisma.mqttConfig.findFirst();
  if (!config) {
    console.error("[DAMP Fuel] No MqttConfig found in database. Configure it at /admin/mqtt first.");
    process.exit(1);
  }

  const sites = await prisma.site.findMany({
    where:  { isDeleted: false },
    select: { id: true, name: true },
  });

  if (!sites.length) {
    console.error("[DAMP Fuel] No sites found in database.");
    process.exit(1);
  }

  console.log(`[DAMP Fuel] Found ${sites.length} sites to monitor.`);

  const siteMap = {};
  for (const site of sites) {
    const key = site.name.toLowerCase().replace(/\s+/g, "-");
    siteMap[key] = site.id;
    console.log(`  → Subscribing to: ${key}/fuel`);
  }

  const brokerUrl = `mqtts://${config.clusterUrl}:${config.mqttPort}`;

  console.log(`[DAMP Fuel] Connecting to ${brokerUrl}...`);

  const client = mqtt.connect(brokerUrl, {
    username:           config.username,
    password:           decryptSecret(config.password),
    reconnectPeriod:    5000,
    connectTimeout:     30000,
    keepalive:          60,
    rejectUnauthorized: true,
  });

  client.on("connect", () => {
    console.log("[DAMP Fuel] Connected to HiveMQ ✓");

    const topics = Object.keys(siteMap).map((name) => `${name}/fuel`);
    client.subscribe(topics, { qos: 1 }, (err) => {
      if (err) {
        console.error("[DAMP Fuel] Subscription error:", err.message);
      } else {
        console.log(`[DAMP Fuel] Subscribed to ${topics.length} topics ✓`);
      }
    });
  });

  client.on("message", async (topic, payload) => {
    try {
      const parts    = topic.split("/");
      const siteName = parts[0];
      const siteId   = siteMap[siteName];

      if (!siteId) {
        console.warn(`[DAMP Fuel] Unknown site topic: ${topic}`);
        return;
      }

      const raw   = payload.toString().trim();
      const level = parseFloat(raw);

      if (isNaN(level)) {
        console.warn(`[DAMP Fuel] Invalid payload on ${topic}: "${raw}"`);
        return;
      }

      await prisma.site.update({
        where: { id: siteId },
        data:  { fuelLevel: level },
      });

      console.log(`[DAMP Fuel] ${siteName} → ${level}%`);

    } catch (error) {
      console.error("[DAMP Fuel] Error processing message:", error.message);
    }
  });

  client.on("error", (err) => {
    console.error("[DAMP Fuel] MQTT error:", err.message);
  });

  client.on("reconnect", () => {
    console.log("[DAMP Fuel] Reconnecting to HiveMQ...");
  });

  client.on("offline", () => {
    console.warn("[DAMP Fuel] MQTT client offline — will retry...");
  });

  client.on("close", () => {
    console.warn("[DAMP Fuel] Connection closed.");
  });
}

main().catch((err) => {
  console.error("[DAMP Fuel] Fatal error:", err);
  process.exit(1);
});
