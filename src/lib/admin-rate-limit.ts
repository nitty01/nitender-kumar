import { headers } from "next/headers";
import { createAdminSupabase } from "@/lib/admin-data";
import { hmacHex } from "@/lib/admin-auth";

export type SecurityKind =
  | "login_fail"
  | "recover_send"
  | "recover_verify_fail";

async function pruneOldEvents() {
  const client = createAdminSupabase();
  const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  await client.from("admin_security_events").delete().lt("created_at", cutoff);
}

export async function clientIpSubject() {
  const h = await headers();
  const ip =
    h.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    h.get("x-real-ip")?.trim() ||
    "unknown";
  return hmacHex("ip", ip);
}

export async function countRecent(kind: SecurityKind, subject: string, windowMs: number) {
  const client = createAdminSupabase();
  const since = new Date(Date.now() - windowMs).toISOString();
  const { count, error } = await client
    .from("admin_security_events")
    .select("id", { count: "exact", head: true })
    .eq("kind", kind)
    .eq("subject", subject)
    .gte("created_at", since);
  if (error) throw new Error(error.message);
  return count ?? 0;
}

export async function isRateLimited(kind: SecurityKind, subject: string, max: number, windowMs: number) {
  return (await countRecent(kind, subject, windowMs)) >= max;
}

export async function recordSecurityEvent(kind: SecurityKind, subject: string) {
  const client = createAdminSupabase();
  const { error } = await client.from("admin_security_events").insert({ kind, subject });
  if (error) throw new Error(error.message);
  if (Math.random() < 0.05) {
    await pruneOldEvents();
  }
}
