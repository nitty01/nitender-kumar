import { createClient, type SupabaseClient } from "@supabase/supabase-js";

export type AdminPost = {
  id: string;
  slug: string;
  title: string;
  excerpt: string | null;
  body: string;
  topics: string[];
  published: boolean;
  archived: boolean;
  published_at: string | null;
  updated_at: string;
};

const POST_COLUMNS =
  "id,slug,title,excerpt,body,topics,published,archived,published_at,updated_at";

function asTopics(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string" && item.trim().length > 0);
}

function mapAdminPost(row: Record<string, unknown>): AdminPost {
  return {
    id: String(row.id),
    slug: String(row.slug),
    title: String(row.title),
    excerpt: (row.excerpt as string | null) ?? null,
    body: String(row.body ?? ""),
    topics: asTopics(row.topics),
    published: Boolean(row.published),
    archived: Boolean(row.archived),
    published_at: (row.published_at as string | null) ?? null,
    updated_at: String(row.updated_at ?? ""),
  };
}

export type SiteMode = "cto" | "engineer";

function publicEnv() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) return null;
  return { url, key };
}

function serviceEnv() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return { url, key };
}

export function createPublicSupabase(): SupabaseClient | null {
  const env = publicEnv();
  if (!env) return null;
  return createClient(env.url, env.key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export function createServiceSupabase(): SupabaseClient | null {
  const env = serviceEnv();
  if (!env) return null;
  return createClient(env.url, env.key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export function createAdminSupabase(): SupabaseClient {
  const service = createServiceSupabase();
  if (!service) throw new Error("SUPABASE_SERVICE_ROLE_KEY is not configured");
  return service;
}

export async function listAdminPosts(): Promise<AdminPost[]> {
  const client = createAdminSupabase();
  const withTopics = await client
    .from("posts")
    .select(POST_COLUMNS)
    .order("updated_at", { ascending: false });
  if (!withTopics.error) {
    return (withTopics.data ?? []).map((row) => mapAdminPost(row as Record<string, unknown>));
  }
  const fallback = await client
    .from("posts")
    .select("id,slug,title,excerpt,body,published,archived,published_at,updated_at")
    .order("updated_at", { ascending: false });
  if (fallback.error) throw new Error(fallback.error.message);
  return (fallback.data ?? []).map((row) => mapAdminPost(row as Record<string, unknown>));
}

export async function getAdminPost(id: string): Promise<AdminPost | null> {
  const client = createAdminSupabase();
  const withTopics = await client.from("posts").select(POST_COLUMNS).eq("id", id).maybeSingle();
  if (!withTopics.error) {
    return withTopics.data ? mapAdminPost(withTopics.data as Record<string, unknown>) : null;
  }
  const fallback = await client
    .from("posts")
    .select("id,slug,title,excerpt,body,published,archived,published_at,updated_at")
    .eq("id", id)
    .maybeSingle();
  if (fallback.error) throw new Error(fallback.error.message);
  return fallback.data ? mapAdminPost(fallback.data as Record<string, unknown>) : null;
}

export async function upsertAdminPost(input: {
  id?: string;
  slug: string;
  title: string;
  excerpt: string;
  body: string;
  topics: string[];
  published: boolean;
  archived: boolean;
}) {
  const client = createAdminSupabase();
  const payload: Record<string, unknown> = {
    slug: input.slug.trim(),
    title: input.title.trim(),
    excerpt: input.excerpt.trim() || null,
    body: input.body,
    topics: input.topics,
    published: input.published,
    archived: input.archived,
  };

  if (input.id) {
    const existing = await getAdminPost(input.id);
    if (input.published && existing && !existing.published) {
      payload.published_at = new Date().toISOString();
    }
    const { data, error } = await client
      .from("posts")
      .update(payload)
      .eq("id", input.id)
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return data.id as string;
  }

  payload.published_at = input.published ? new Date().toISOString() : null;
  const { data, error } = await client.from("posts").insert(payload).select("id").single();
  if (error) throw new Error(error.message);
  return data.id as string;
}

export async function deleteAdminPost(id: string) {
  const client = createAdminSupabase();
  const { error } = await client.from("posts").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

export async function setPostFlags(
  id: string,
  flags: Partial<Pick<AdminPost, "published" | "archived">>,
) {
  const client = createAdminSupabase();
  const patch: Record<string, unknown> = { ...flags };
  if (flags.published === true) {
    const existing = await getAdminPost(id);
    if (existing && !existing.published) {
      patch.published_at = new Date().toISOString();
    }
    patch.archived = false;
  }
  const { error } = await client.from("posts").update(patch).eq("id", id);
  if (error) throw new Error(error.message);
}
