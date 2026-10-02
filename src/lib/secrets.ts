import crypto from "crypto";

const PREFIX = "enc:v1:";

function getKey(): Buffer {
  const raw = process.env.CONFIG_ENCRYPTION_KEY ?? "";
  if (raw.length < 32) {
    throw new Error("CONFIG_ENCRYPTION_KEY is missing or shorter than 32 characters.");
  }
  return crypto.createHash("sha256").update(raw).digest();
}

export function hasEncryptionKey(): boolean {
  return (process.env.CONFIG_ENCRYPTION_KEY ?? "").length >= 32;
}

export function isEncrypted(value: string | null | undefined): boolean {
  return !!value && value.startsWith(PREFIX);
}

export function encryptSecret(plain: string): string {
  const iv      = crypto.randomBytes(12);
  const cipher  = crypto.createCipheriv("aes-256-gcm", getKey(), iv);
  const data    = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag     = cipher.getAuthTag();
  return PREFIX + [iv, tag, data].map((b) => b.toString("base64")).join(":");
}

export function decryptSecret(value: string | null | undefined): string | null {
  if (!value) return null;
  if (!isEncrypted(value)) return value;

  const [ivB64, tagB64, dataB64] = value.slice(PREFIX.length).split(":");
  const decipher = crypto.createDecipheriv("aes-256-gcm", getKey(), Buffer.from(ivB64, "base64"));
  decipher.setAuthTag(Buffer.from(tagB64, "base64"));
  const plain = Buffer.concat([decipher.update(Buffer.from(dataB64, "base64")), decipher.final()]);
  return plain.toString("utf8");
}
