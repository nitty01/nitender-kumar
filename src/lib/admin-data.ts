import { createClient, type SupabaseClient } from "@supabase/supabase-js";

export type AdminPost = {
  id: string;
  slug: string;
  title: string;
  excerpt: string | null;
  body: string;
  published: boolean;
  archived: boolean;
  published_at: string;
  updated_at: string;
};

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
  const { data, error } = await client
    .from("posts")
    .select("id,slug,title,excerpt,body,published,archived,published_at,updated_at")
    .order("updated_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as AdminPost[];
}

export async function getAdminPost(id: string): Promise<AdminPost | null> {
  const client = createAdminSupabase();
  const { data, error } = await client
    .from("posts")
    .select("id,slug,title,excerpt,body,published,archived,published_at,updated_at")
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return (data as AdminPost | null) ?? null;
}

export async function upsertAdminPost(input: {
  id?: string;
  slug: string;
  title: string;
  excerpt: string;
  body: string;
  published: boolean;
  archived: boolean;
}) {
  const client = createAdminSupabase();
  const payload = {
    slug: input.slug.trim(),
    title: input.title.trim(),
    excerpt: input.excerpt.trim() || null,
    body: input.body,
    published: input.published,
    archived: input.archived,
    published_at: input.published ? new Date().toISOString() : undefined,
  };

  if (input.id) {
    const { data, error } = await client
      .from("posts")
      .update({
        slug: payload.slug,
        title: payload.title,
        excerpt: payload.excerpt,
        body: payload.body,
        published: payload.published,
        archived: payload.archived,
      })
      .eq("id", input.id)
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return data.id as string;
  }

  const { data, error } = await client
    .from("posts")
    .insert({
      slug: payload.slug,
      title: payload.title,
      excerpt: payload.excerpt,
      body: payload.body,
      published: payload.published,
      archived: payload.archived,
    })
    .select("id")
    .single();
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
  const { error } = await client.from("posts").update(flags).eq("id", id);
  if (error) throw new Error(error.message);
}
