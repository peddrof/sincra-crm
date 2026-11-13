import "server-only";
import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

// AES-256-GCM para o refresh token do Google guardado no banco. Formato: base64(iv).base64(tag).base64(cifra).
function chave(): Buffer {
  const k = Buffer.from(process.env.GOOGLE_TOKEN_ENCRYPTION_KEY ?? "", "base64");
  if (k.length !== 32) throw new Error("GOOGLE_TOKEN_ENCRYPTION_KEY precisa ter 32 bytes em base64.");
  return k;
}

export function cifrar(texto: string): string {
  const iv = randomBytes(12);
  const c = createCipheriv("aes-256-gcm", chave(), iv);
  const cifra = Buffer.concat([c.update(texto, "utf8"), c.final()]);
  return [iv, c.getAuthTag(), cifra].map((b) => b.toString("base64")).join(".");
}

export function decifrar(pacote: string): string {
  const [iv, tag, cifra] = pacote.split(".").map((p) => Buffer.from(p, "base64"));
  const d = createDecipheriv("aes-256-gcm", chave(), iv);
  d.setAuthTag(tag);
  return Buffer.concat([d.update(cifra), d.final()]).toString("utf8");
}
