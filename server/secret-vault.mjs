import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";

const KEY_BYTES = 32;
const IV_BYTES = 12;
const VERSION = "v1";

// Nøkkelen leses fra SCOPE_CREDENTIALS_KEY (64 hex-tegn) i produksjon.
// Lokalt genereres en nøkkelfil med 0600 i datamappen, på samme måte som session-secret.
export async function loadCredentialsKey(dataDir, explicitKey = process.env.SCOPE_CREDENTIALS_KEY) {
  if (explicitKey) {
    const key = Buffer.from(String(explicitKey).trim(), "hex");
    if (key.length !== KEY_BYTES) throw new Error("SCOPE_CREDENTIALS_KEY må være 64 heksadesimale tegn (32 byte).");
    return key;
  }
  const keyPath = path.join(dataDir, "credentials-key");
  let stored = null;
  try {
    stored = (await fs.readFile(keyPath, "utf8")).trim();
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }
  if (stored !== null) {
    const key = Buffer.from(stored, "hex");
    if (key.length !== KEY_BYTES) throw new Error(`Nøkkelfilen ${keyPath} er ugyldig. Fjern den manuelt for å generere en ny.`);
    return key;
  }
  const key = randomBytes(KEY_BYTES);
  await fs.writeFile(keyPath, key.toString("hex"), { mode: 0o600 });
  return key;
}

export function encryptSecret(key, plaintext) {
  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([cipher.update(String(plaintext), "utf8"), cipher.final()]);
  return [VERSION, iv.toString("base64"), cipher.getAuthTag().toString("base64"), encrypted.toString("base64")].join(":");
}

export function decryptSecret(key, encoded) {
  const [version, iv, tag, data] = String(encoded || "").split(":");
  if (version !== VERSION || !iv || !tag || !data) throw new Error("Ukjent format på kryptert hemmelighet.");
  const decipher = createDecipheriv("aes-256-gcm", key, Buffer.from(iv, "base64"));
  decipher.setAuthTag(Buffer.from(tag, "base64"));
  return Buffer.concat([decipher.update(Buffer.from(data, "base64")), decipher.final()]).toString("utf8");
}

// Viser kun de siste tegnene, f.eks. «••••72A». Selve verdien lagres aldri i klartekst.
export function secretHint(secret) {
  const value = String(secret || "");
  if (value.length < 8) return "••••";
  return `••••${value.slice(-3)}`;
}
