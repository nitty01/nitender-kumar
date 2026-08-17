import { randomBytes, timingSafeEqual } from "crypto";
import {
  emailLookupHash,
  getConfiguredAdminEmail,
  hashPassword,
  hmacHex,
  isAllowedPassword,
  normalizeEmail,
} from "@/lib/admin-auth";
import {
  countAdminAccounts,
  findAdminByEmail,
  upsertAdminAccount,
} from "@/lib/admin-credentials";
import { createAdminSupabase } from "@/lib/admin-data";
import { sendAdminEmail } from "@/lib/admin-mail";
import {
  clientIpSubject,
  isRateLimited,
  recordSecurityEvent,
} from "@/lib/admin-rate-limit";

const CODE_TTL_MS = 15 * 60 * 1000;
const RESEND_COOLDOWN_MS = 60 * 1000;
const MAX_CODE_ATTEMPTS = 5;
const MAX_SENDS_PER_EMAIL_DAY = 8;
const MAX_SENDS_PER_IP_HOUR = 8;
const MAX_VERIFY_FAILS_PER_IP = 20;
const VERIFY_WINDOW_MS = 15 * 60 * 1000;

function normalizeRecoveryCode(code: string) {
  return code.replace(/[^a-zA-Z0-9]/g, "").toLowerCase();
}

function hashRecoveryCode(code: string) {
  return hmacHex("recover-code", normalizeRecoveryCode(code));
}

function codesMatch(a: string, b: string) {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}

function formatCode(rawHex: string) {
  return rawHex.replace(/(.{4})/g, "$1-").replace(/-$/, "");
}

/** Emails allowed to request a recovery code. */
export async function canRequestRecovery(email: string): Promise<boolean> {
  const normalized = normalizeEmail(email);
  const existing = await findAdminByEmail(normalized);
  if (existing) return true;

  const count = await countAdminAccounts();
  if (count === 0) {
    return normalized === getConfiguredAdminEmail();
  }
  return false;
}

export async function requestRecoveryCode(email: string): Promise<{ ok: true }> {
  const normalized = normalizeEmail(email);
  const ipSubject = await clientIpSubject();

  const ipLimited = await isRateLimited(
    "recover_send",
    ipSubject,
    MAX_SENDS_PER_IP_HOUR,
    60 * 60 * 1000,
  );
  if (ipLimited) return { ok: true };

  const allowed = await canRequestRecovery(normalized);
  if (!allowed) return { ok: true };

  const lookup = emailLookupHash(normalized);
  const emailLimited = await isRateLimited(
    "recover_send",
    lookup,
    MAX_SENDS_PER_EMAIL_DAY,
    24 * 60 * 60 * 1000,
  );
  if (emailLimited) return { ok: true };

  const recent = await sbRecentChallenge(lookup);
  if (recent) return { ok: true };

  const code = randomBytes(16).toString("hex");
  const codeHash = hashRecoveryCode(code);
  const expiresAt = new Date(Date.now() + CODE_TTL_MS).toISOString();
  const display = formatCode(code);

  await sbClearChallenges(lookup);
  await sbCreateChallenge({ emailLookup: lookup, codeHash, expiresAt });
  await recordSecurityEvent("recover_send", lookup);
  await recordSecurityEvent("recover_send", ipSubject);

  await sendAdminEmail({
    to: normalized,
    subject: "Your portfolio admin recovery code",
    text: [
      "Use this code to reset your admin password:",
      "",
      `  ${display}`,
      "",
      "It expires in 15 minutes and can be tried a few times only.",
      "If you did not request this, ignore this email.",
    ].join("\n"),
    html: `<p>Use this code to reset your admin password:</p>
<p style="font-size:22px;letter-spacing:0.12em;font-weight:700">${display}</p>
<p>It expires in 15 minutes and can be tried a few times only. If you did not request this, ignore this email.</p>`,
  });

  return { ok: true };
}

export async function resetPasswordWithCode(input: {
  email: string;
  code: string;
  password: string;
}): Promise<{ ok: true; sessionVersion: number } | { ok: false; reason: string }> {
  const normalized = normalizeEmail(input.email);
  if (!isAllowedPassword(input.password)) return { ok: false, reason: "password" };

  const ipSubject = await clientIpSubject();
  const ipLimited = await isRateLimited(
    "recover_verify_fail",
    ipSubject,
    MAX_VERIFY_FAILS_PER_IP,
    VERIFY_WINDOW_MS,
  );
  if (ipLimited) return { ok: false, reason: "code" };

  const allowed = await canRequestRecovery(normalized);
  const lookup = emailLookupHash(normalized);
  const challenge = allowed ? await sbFindActiveChallenge(lookup) : null;

  if (!challenge) {
    await recordSecurityEvent("recover_verify_fail", ipSubject);
    return { ok: false, reason: "code" };
  }

  if (!codesMatch(challenge.codeHash, hashRecoveryCode(input.code))) {
    const attempts = challenge.attemptCount + 1;
    if (attempts >= MAX_CODE_ATTEMPTS) {
      await sbMarkConsumed(challenge.id);
    } else {
      await sbSetAttempts(challenge.id, attempts);
    }
    await recordSecurityEvent("recover_verify_fail", ipSubject);
    return { ok: false, reason: "code" };
  }

  const sessionVersion = await upsertAdminAccount(normalized, hashPassword(input.password));
  await sbMarkConsumed(challenge.id);
  return { ok: true, sessionVersion };
}

async function sbRecentChallenge(emailLookup: string) {
  const client = createAdminSupabase();
  const since = new Date(Date.now() - RESEND_COOLDOWN_MS).toISOString();
  const { data } = await client
    .from("admin_recovery_challenges")
    .select("id")
    .eq("email_lookup", emailLookup)
    .gte("created_at", since)
    .limit(1)
    .maybeSingle();
  return Boolean(data);
}

async function sbClearChallenges(emailLookup: string) {
  const client = createAdminSupabase();
  await client.from("admin_recovery_challenges").delete().eq("email_lookup", emailLookup);
}

async function sbCreateChallenge(input: {
  emailLookup: string;
  codeHash: string;
  expiresAt: string;
}) {
  const client = createAdminSupabase();
  const { error } = await client.from("admin_recovery_challenges").insert({
    email_lookup: input.emailLookup,
    code_hash: input.codeHash,
    expires_at: input.expiresAt,
    attempt_count: 0,
  });
  if (error) throw new Error(error.message);
}

async function sbFindActiveChallenge(emailLookup: string) {
  const client = createAdminSupabase();
  const { data, error } = await client
    .from("admin_recovery_challenges")
    .select("id,code_hash,expires_at,consumed_at,attempt_count")
    .eq("email_lookup", emailLookup)
    .is("consumed_at", null)
    .gt("expires_at", new Date().toISOString())
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return null;
  return {
    id: data.id as string,
    codeHash: data.code_hash as string,
    attemptCount: Number(data.attempt_count ?? 0),
  };
}

async function sbSetAttempts(id: string, attemptCount: number) {
  const client = createAdminSupabase();
  await client.from("admin_recovery_challenges").update({ attempt_count: attemptCount }).eq("id", id);
}

async function sbMarkConsumed(id: string) {
  const client = createAdminSupabase();
  await client
    .from("admin_recovery_challenges")
    .update({ consumed_at: new Date().toISOString() })
    .eq("id", id);
}
