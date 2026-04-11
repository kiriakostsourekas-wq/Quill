import { createCipheriv, createDecipheriv, createHash, randomBytes } from "crypto";

function getEncryptionKey() {
  const secret = process.env.ENCRYPTION_KEY;

  if (!secret) {
    throw new Error("ENCRYPTION_KEY is not configured");
  }

  return createHash("sha256").update(secret).digest();
}

export function encrypt(text: string): string {
  const iv = randomBytes(12);
  const key = getEncryptionKey();
  const cipher = createCipheriv("aes-256-gcm", key, iv);

  const encrypted = Buffer.concat([cipher.update(text, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();

  return Buffer.concat([iv, authTag, encrypted]).toString("base64");
}

export function decrypt(text: string): string {
  const input = Buffer.from(text, "base64");
  const key = getEncryptionKey();
  const iv = input.subarray(0, 12);
  const authTag = input.subarray(12, 28);
  const payload = input.subarray(28);
  const decipher = createDecipheriv("aes-256-gcm", key, iv);

  decipher.setAuthTag(authTag);

  return Buffer.concat([decipher.update(payload), decipher.final()]).toString("utf8");
}
