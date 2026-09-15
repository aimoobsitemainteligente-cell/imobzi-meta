export const AUTH_COOKIE_NAME = "asn_dashboard_session";

function getSecretKey(): string {
  return (
    process.env.SESSION_SECRET ||
    "asn_imobzi_meta_super_secret_key_2026_default_fallback"
  );
}

// Converte string para Uint8Array
function strToBuffer(str: string): Uint8Array {
  return new TextEncoder().encode(str);
}

// Converte Uint8Array para hex string
function bufferToHex(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let hex = "";
  for (let i = 0; i < bytes.length; i++) {
    hex += bytes[i].toString(16).padStart(2, "0");
  }
  return hex;
}

// Gera assinatura HMAC-SHA256 usando Web Crypto API (compatível com Node e Edge/Middleware)
async function generateSignature(data: string, secret: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret) as unknown as BufferSource,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signature = await crypto.subtle.sign(
    "HMAC",
    key,
    enc.encode(data) as unknown as BufferSource
  );
  return bufferToHex(signature);
}

export async function createSessionToken(username: string): Promise<string> {
  const timestamp = Date.now().toString();
  const payload = `${username}:${timestamp}`;
  const signature = await generateSignature(payload, getSecretKey());
  const token = `${payload}:${signature}`;
  return typeof btoa !== "undefined"
    ? btoa(token)
    : Buffer.from(token).toString("base64");
}

export async function verifySessionToken(
  token: string | undefined | null
): Promise<{ valid: boolean; username?: string }> {
  if (!token) return { valid: false };

  try {
    const decoded =
      typeof atob !== "undefined"
        ? atob(token)
        : Buffer.from(token, "base64").toString("utf-8");
    const parts = decoded.split(":");
    if (parts.length !== 3) return { valid: false };

    const [username, timestamp, signature] = parts;
    const payload = `${username}:${timestamp}`;

    // Token expira em 7 dias
    const tokenTime = parseInt(timestamp, 10);
    const maxAge = 7 * 24 * 60 * 60 * 1000;
    if (isNaN(tokenTime) || Date.now() - tokenTime > maxAge) {
      return { valid: false };
    }

    const expectedSignature = await generateSignature(payload, getSecretKey());
    if (signature === expectedSignature) {
      return { valid: true, username };
    }
  } catch (err) {
    console.error("Erro ao validar token de sessão:", err);
  }

  return { valid: false };
}

export function validateCredentials(user: string, pass: string): boolean {
  const validUser = process.env.DASHBOARD_USERNAME || "admin";
  const validPass = process.env.DASHBOARD_PASSWORD || "asn2026";

  return (
    user.trim().toLowerCase() === validUser.trim().toLowerCase() &&
    pass === validPass
  );
}
