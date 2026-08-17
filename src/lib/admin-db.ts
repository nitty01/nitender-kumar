import { Client } from "pg";
import type { AdminPost, SiteMode } from "@/lib/admin-data";

function dbConfig() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const password = process.env.SUPABASE_DB_PASSWORD;
  if (!url || !password) return null;
  const ref = url.split("//")[1]?.split(".")[0];
  if (!ref) return null;
  return {
    host: `db.${ref}.supabase.co`,
    port: 5432,
    user: "postgres",
    password,
    database: "postgres",
    ssl: { rejectUnauthorized: true },
  };
}

export function dbAdminAvailable() {
  return Boolean(dbConfig());
}

async function withDb<T>(fn: (client: Client) => Promise<T>): Promise<T> {
  const config = dbConfig();
  if (!config) throw new Error("SUPABASE_DB_PASSWORD is not configured");
  const client = new Client(config);
  await client.connect();
  try {
    return await fn(client);
  } finally {
    await client.end();
  }
}

function asIso(value: unknown): string {
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "string") return value;
  return "";
}

function mapPost(row: Record<string, unknown>): AdminPost {
  return {
    id: String(row.id),
    slug: String(row.slug),
    title: String(row.title),
    excerpt: (row.excerpt as string | null) ?? null,
    body: String(row.body ?? ""),
    published: Boolean(row.published),
    archived: Boolean(row.archived),
    published_at: asIso(row.published_at),
    updated_at: asIso(row.updated_at),
  };
}

export async function dbListPosts(): Promise<AdminPost[]> {
  return withDb(async (client) => {
    const { rows } = await client.query(
      `select id, slug, title, excerpt, body, published, archived, published_at, updated_at
       from public.posts
       order by updated_at desc`,
    );
    return rows.map((row) => mapPost(row as Record<string, unknown>));
  });
}

export async function dbGetPost(id: string): Promise<AdminPost | null> {
  return withDb(async (client) => {
    const { rows } = await client.query(
      `select id, slug, title, excerpt, body, published, archived, published_at, updated_at
       from public.posts where id = $1`,
      [id],
    );
    return rows[0] ? mapPost(rows[0] as Record<string, unknown>) : null;
  });
}

export async function dbUpsertPost(input: {
  id?: string;
  slug: string;
  title: string;
  excerpt: string;
  body: string;
  published: boolean;
  archived: boolean;
}) {
  return withDb(async (client) => {
    if (input.id) {
      const { rows } = await client.query<{ id: string }>(
        `update public.posts
         set slug=$1, title=$2, excerpt=$3, body=$4, published=$5, archived=$6
         where id=$7
         returning id`,
        [
          input.slug.trim(),
          input.title.trim(),
          input.excerpt.trim() || null,
          input.body,
          input.published,
          input.archived,
          input.id,
        ],
      );
      return rows[0].id;
    }
    const { rows } = await client.query<{ id: string }>(
      `insert into public.posts (slug, title, excerpt, body, published, archived)
       values ($1,$2,$3,$4,$5,$6)
       returning id`,
      [
        input.slug.trim(),
        input.title.trim(),
        input.excerpt.trim() || null,
        input.body,
        input.published,
        input.archived,
      ],
    );
    return rows[0].id;
  });
}

export async function dbDeletePost(id: string) {
  return withDb(async (client) => {
    await client.query(`delete from public.posts where id = $1`, [id]);
  });
}

export async function dbSetPostFlags(
  id: string,
  flags: Partial<Pick<AdminPost, "published" | "archived">>,
) {
  return withDb(async (client) => {
    const sets: string[] = [];
    const vals: unknown[] = [];
    if (typeof flags.published === "boolean") {
      vals.push(flags.published);
      sets.push(`published = $${vals.length}`);
    }
    if (typeof flags.archived === "boolean") {
      vals.push(flags.archived);
      sets.push(`archived = $${vals.length}`);
    }
    if (!sets.length) return;
    vals.push(id);
    await client.query(
      `update public.posts set ${sets.join(", ")} where id = $${vals.length}`,
      vals,
    );
  });
}

export async function dbSetSiteMode(mode: SiteMode) {
  return withDb(async (client) => {
    await client.query(
      `insert into public.site_settings (key, value, updated_at)
       values ('site_mode', $1, now())
       on conflict (key) do update set value = excluded.value, updated_at = now()`,
      [mode],
    );
  });
}

export async function dbGetSiteMode(): Promise<SiteMode> {
  return withDb(async (client) => {
    const { rows } = await client.query<{ value: string }>(
      `select value from public.site_settings where key = 'site_mode'`,
    );
    return rows[0]?.value === "engineer" ? "engineer" : "cto";
  });
}

export async function dbGetSetting(key: string): Promise<string | null> {
  return withDb(async (client) => {
    const { rows } = await client.query<{ value: string }>(
      `select value from public.site_settings where key = $1`,
      [key],
    );
    return rows[0]?.value ?? null;
  });
}

export async function dbSetSetting(key: string, value: string) {
  return withDb(async (client) => {
    await client.query(
      `insert into public.site_settings (key, value, updated_at)
       values ($1, $2, now())
       on conflict (key) do update set value = excluded.value, updated_at = now()`,
      [key, value],
    );
  });
}

export async function dbCountAdminAccounts(): Promise<number> {
  return withDb(async (client) => {
    const { rows } = await client.query<{ count: string }>(
      `select count(*)::text as count from public.admin_accounts`,
    );
    return Number(rows[0]?.count ?? 0);
  });
}

export async function dbFindAdminByLookup(emailLookup: string) {
  return withDb(async (client) => {
    const { rows } = await client.query<{
      id: string;
      password_hash: string;
      email_cipher: string;
    }>(
      `select id, password_hash, email_cipher
       from public.admin_accounts
       where email_lookup = $1
       limit 1`,
      [emailLookup],
    );
    if (!rows[0]) return null;
    return {
      id: rows[0].id,
      passwordHash: rows[0].password_hash,
      emailCipher: rows[0].email_cipher,
    };
  });
}

export async function dbUpsertAdminAccount(input: {
  emailLookup: string;
  emailCipher: string;
  passwordHash: string;
}) {
  return withDb(async (client) => {
    await client.query(
      `insert into public.admin_accounts (email_lookup, email_cipher, password_hash)
       values ($1, $2, $3)
       on conflict (email_lookup) do update
         set email_cipher = excluded.email_cipher,
             password_hash = excluded.password_hash,
             updated_at = now()`,
      [input.emailLookup, input.emailCipher, input.passwordHash],
    );
  });
}

export async function dbRecentRecoveryChallenge(emailLookup: string, withinMs: number) {
  return withDb(async (client) => {
    const { rows } = await client.query<{ id: string }>(
      `select id from public.admin_recovery_challenges
       where email_lookup = $1
         and created_at > now() - ($2::double precision * interval '1 millisecond')
       limit 1`,
      [emailLookup, withinMs],
    );
    return rows.length > 0;
  });
}

export async function dbClearRecoveryChallenges(emailLookup: string) {
  return withDb(async (client) => {
    await client.query(
      `delete from public.admin_recovery_challenges where email_lookup = $1`,
      [emailLookup],
    );
  });
}

export async function dbCreateRecoveryChallenge(input: {
  emailLookup: string;
  codeHash: string;
  expiresAt: string;
}) {
  return withDb(async (client) => {
    await client.query(
      `insert into public.admin_recovery_challenges (email_lookup, code_hash, expires_at)
       values ($1, $2, $3::timestamptz)`,
      [input.emailLookup, input.codeHash, input.expiresAt],
    );
  });
}

export async function dbFindActiveRecoveryChallenge(emailLookup: string) {
  return withDb(async (client) => {
    const { rows } = await client.query<{ id: string; code_hash: string }>(
      `select id, code_hash
       from public.admin_recovery_challenges
       where email_lookup = $1
         and consumed_at is null
         and expires_at > now()
       order by created_at desc
       limit 1`,
      [emailLookup],
    );
    if (!rows[0]) return null;
    return { id: rows[0].id, codeHash: rows[0].code_hash };
  });
}

export async function dbMarkRecoveryConsumed(id: string) {
  return withDb(async (client) => {
    await client.query(
      `update public.admin_recovery_challenges
       set consumed_at = now()
       where id = $1`,
      [id],
    );
  });
}
