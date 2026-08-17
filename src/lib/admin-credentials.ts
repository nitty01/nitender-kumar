import { createAdminSupabase } from "@/lib/admin-data";
import { emailLookupHash, encryptEmail } from "@/lib/admin-auth";

export type StoredAdminAccount = {
  id: string;
  passwordHash: string;
  emailCipher: string;
  sessionVersion: number;
};

export async function countAdminAccounts(): Promise<number> {
  const client = createAdminSupabase();
  const { count, error } = await client
    .from("admin_accounts")
    .select("id", { count: "exact", head: true });
  if (error) throw new Error(error.message);
  return count ?? 0;
}

export async function findAdminByEmail(email: string): Promise<StoredAdminAccount | null> {
  const lookup = emailLookupHash(email);
  const client = createAdminSupabase();
  const { data, error } = await client
    .from("admin_accounts")
    .select("id,password_hash,email_cipher,session_version")
    .eq("email_lookup", lookup)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return null;
  return {
    id: data.id as string,
    passwordHash: data.password_hash as string,
    emailCipher: data.email_cipher as string,
    sessionVersion: Number(data.session_version ?? 1),
  };
}

export async function upsertAdminAccount(email: string, passwordHash: string) {
  const payload = {
    emailLookup: emailLookupHash(email),
    emailCipher: encryptEmail(email),
    passwordHash,
  };

  const client = createAdminSupabase();
  const existing = await findAdminByEmail(email);
  if (existing) {
    const nextVersion = existing.sessionVersion + 1;
    const { error } = await client
      .from("admin_accounts")
      .update({
        email_cipher: payload.emailCipher,
        password_hash: payload.passwordHash,
        session_version: nextVersion,
        updated_at: new Date().toISOString(),
      })
      .eq("id", existing.id);
    if (error) throw new Error(error.message);
    return nextVersion;
  }

  const { error } = await client.from("admin_accounts").insert({
    email_lookup: payload.emailLookup,
    email_cipher: payload.emailCipher,
    password_hash: payload.passwordHash,
    session_version: 1,
  });
  if (error) throw new Error(error.message);
  return 1;
}
