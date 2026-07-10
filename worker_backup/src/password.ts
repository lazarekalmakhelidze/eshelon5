const b64UrlToBytes = (input: string) => {
  const pad = "=".repeat((4 - (input.length % 4)) % 4);
  const b64 = (input + pad).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(b64);
  const bytes = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i);
  return bytes;
};

const bytesToB64Url = (bytes: ArrayBuffer | Uint8Array) => {
  const u8 = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  let binary = "";
  for (let i = 0; i < u8.length; i++) binary += String.fromCharCode(u8[i]);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
};

const timingSafeEqual = (a: Uint8Array, b: Uint8Array) => {
  if (a.length !== b.length) return false;
  let out = 0;
  for (let i = 0; i < a.length; i++) out |= a[i] ^ b[i];
  return out === 0;
};

export const hashPassword = async (password: string) => {
  const iterations = 120_000;
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    "PBKDF2",
    false,
    ["deriveBits"]
  );
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", hash: "SHA-256", salt, iterations },
    keyMaterial,
    256
  );
  return `pbkdf2_sha256$${iterations}$${bytesToB64Url(salt)}$${bytesToB64Url(bits)}`;
};

export const verifyPassword = async (password: string, stored: string) => {
  const parts = stored.split("$");
  if (parts.length !== 4) return false;
  const algo = parts[0];
  const iterations = Number(parts[1]);
  const salt = parts[2];
  const digest = parts[3];
  if (algo !== "pbkdf2_sha256" || !Number.isFinite(iterations) || iterations <= 0) return false;

  const saltBytes = b64UrlToBytes(salt);
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    "PBKDF2",
    false,
    ["deriveBits"]
  );
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", hash: "SHA-256", salt: saltBytes, iterations },
    keyMaterial,
    256
  );
  const got = bytesToB64Url(bits);
  return timingSafeEqual(new TextEncoder().encode(got), new TextEncoder().encode(digest));
};

