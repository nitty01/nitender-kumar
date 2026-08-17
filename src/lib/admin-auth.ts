import {
  createCipheriv,
  createDecipheriv,
  createHmac,
  createHash,
  randomBytes,
  scryptSync,
  timingSafeEqual,
} from "crypto";
import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";

const COOKIE = "nk_admin_session";
const RECOVER_COOKIE = "nk_admin_recover";
const MAX_AGE = 60 * 60 * 24 * 7;
const RECOVER_TTL_SEC = 15 * 60;
export const PASSWORD_MIN = 12;
export const PASSWORD_MAX = 128;

const DUMMY_PASSWORD_HASH = (() => {
  const salt = "0".repeat(32);
  const hash = scryptSync("timing-pad", salt, 64).toString("hex");
  return `${salt}:${hash}`;
})();

export type AdminSession = {
  sub: string;
  sv: number;
};

function getSessionSecretString() {
  const secret = process.env.ADMIN_SESSION_SECRET?.trim();
  if (!secret || secret.length < 16) {
    throw new Error("ADMIN_SESSION_SECRET must be set and at least 16 characters");
  }
  return secret;
}

function getSecret() {
  return new TextEncoder().encode(getSessionSecretString());
}

/** 32-byte key for AES-256-GCM (email at rest). */
function getEncryptionKey(): Buffer {
  const explicit = process.env.ADMIN_ENCRYPTION_KEY?.trim();
  if (explicit) {
    const buf = Buffer.from(explicit, explicit.length === 64 ? "hex" : "utf8");
    return createHash("sha256").update(buf).digest();
  }
  return createHash("sha256")
    .update(`nk-admin-email-v1:${getSessionSecretString()}`)
    .digest();
}

export function hmacHex(purpose: string, value: string) {
  return createHmac("sha256", getSessionSecretString())
    .update(`${purpose}:${value}`)
    .digest("hex");
}

export function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

export function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizeEmail(email));
}

export function isAllowedPassword(password: string) {
  return password.length >= PASSWORD_MIN && password.length <= PASSWORD_MAX;
}

/** Non-reversible lookup token so we can find a row without storing plaintext email. */
export function emailLookupHash(email: string) {
  return createHmac("sha256", getEncryptionKey())
    .update(normalizeEmail(email))
    .digest("hex");
}

/** Encrypt email at rest (AES-256-GCM). Format: iv:tag:ciphertext (hex). */
export function encryptEmail(email: string) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", getEncryptionKey(), iv);
  const encrypted = Buffer.concat([
    cipher.update(normalizeEmail(email), "utf8"),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();
  return `${iv.toString("hex")}:${tag.toString("hex")}:${encrypted.toString("hex")}`;
}

export function decryptEmail(payload: string) {
  const [ivHex, tagHex, dataHex] = payload.split(":");
  if (!ivHex || !tagHex || !dataHex) throw new Error("Invalid email cipher");
  const decipher = createDecipheriv(
    "aes-256-gcm",
    getEncryptionKey(),
    Buffer.from(ivHex, "hex"),
  );
  decipher.setAuthTag(Buffer.from(tagHex, "hex"));
  const plain = Buffer.concat([
    decipher.update(Buffer.from(dataHex, "hex")),
    decipher.final(),
  ]);
  return plain.toString("utf8");
}

export function hashPassword(password: string): string {
  if (!isAllowedPassword(password)) {
    throw new Error("Password does not meet length requirements");
  }
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  if (password.length > PASSWORD_MAX) return false;
  const [salt, hash] = stored.split(":");
  if (!salt || !hash) return false;
  try {
    const computed = scryptSync(password, salt, 64);
    const expected = Buffer.from(hash, "hex");
    if (expected.length !== computed.length) return false;
    return timingSafeEqual(expected, computed);
  } catch {
    return false;
  }
}

export function getConfiguredAdminEmail() {
  const email = process.env.ADMIN_EMAIL?.trim();
  if (!email || !isValidEmail(email)) {
    throw new Error("ADMIN_EMAIL must be set to a valid email address");
  }
  return normalizeEmail(email);
}

export function adminConfigStatus() {
  const missing: string[] = [];
  const email = process.env.ADMIN_EMAIL?.trim();
  if (!email || !isValidEmail(email)) missing.push("ADMIN_EMAIL");
  const secret = process.env.ADMIN_SESSION_SECRET?.trim();
  if (!secret || secret.length < 16) missing.push("ADMIN_SESSION_SECRET");
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()) missing.push("NEXT_PUBLIC_SUPABASE_URL");
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()) missing.push("SUPABASE_SERVICE_ROLE_KEY");
  return { ok: missing.length === 0, missing };
}

export function adminConfigured() {
  return adminConfigStatus().ok;
}

function cookieBase(production: boolean) {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: production,
  };
}

export async function createAdminSession(email: string, sessionVersion: number) {
  const token = await new SignJWT({
    sub: normalizeEmail(email),
    sv: sessionVersion,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${MAX_AGE}s`)
    .sign(getSecret());

  const jar = await cookies();
  jar.set(COOKIE, token, {
    ...cookieBase(process.env.NODE_ENV === "production"),
    path: "/",
    maxAge: MAX_AGE,
  });
}

export async function clearAdminSession() {
  const jar = await cookies();
  jar.delete(COOKIE);
}

export async function setRecoveryPending(email: string) {
  const token = await new SignJWT({
    sub: normalizeEmail(email),
    purpose: "recover",
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${RECOVER_TTL_SEC}s`)
    .sign(getSecret());

  const jar = await cookies();
  jar.set(RECOVER_COOKIE, token, {
    ...cookieBase(process.env.NODE_ENV === "production"),
    path: "/admin",
    maxAge: RECOVER_TTL_SEC,
  });
}

export async function getRecoveryPending(): Promise<string | null> {
  const jar = await cookies();
  const token = jar.get(RECOVER_COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, getSecret());
    if (payload.purpose !== "recover") return null;
    return typeof payload.sub === "string" ? payload.sub : null;
  } catch {
    return null;
  }
}

export async function clearRecoveryPending() {
  const jar = await cookies();
  jar.set(RECOVER_COOKIE, "", {
    ...cookieBase(process.env.NODE_ENV === "production"),
    path: "/admin",
    maxAge: 0,
  });
}

export async function getAdminSession(): Promise<AdminSession | null> {
  const jar = await cookies();
  const token = jar.get(COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, getSecret());
    const sub = typeof payload.sub === "string" ? payload.sub : null;
    const sv = typeof payload.sv === "number" ? payload.sv : null;
    if (!sub || sv === null) return null;
    const { findAdminByEmail } = await import("@/lib/admin-credentials");
    const account = await findAdminByEmail(sub);
    if (!account || account.sessionVersion !== sv) return null;
    return { sub, sv };
  } catch {
    return null;
  }
}

export async function requireAdminSession() {
  const session = await getAdminSession();
  if (!session) {
    throw new Error("Unauthorized");
  }
  return session;
}

export async function requireAdminOrRedirect() {
  const { redirect } = await import("next/navigation");
  const session = await getAdminSession();
  if (!session) redirect("/admin/login");
  return session;
}

export async function verifyAdminLogin(email: string, password: string) {
  const { findAdminByEmail } = await import("@/lib/admin-credentials");
  const normalized = normalizeEmail(email);
  const account = await findAdminByEmail(normalized);
  if (!account) {
    verifyPassword(password, DUMMY_PASSWORD_HASH);
    return null;
  }
  return verifyPassword(password, account.passwordHash) ? account : null;
}
