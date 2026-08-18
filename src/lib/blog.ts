import { LOCAL_POSTS, type BlogPost } from "@/content/blog-posts";
import { createPublicSupabase } from "@/lib/admin-data";
import { isArticleLayout, resolveBlocks } from "@/lib/blog-blocks";

export const RECENT_POST_LIMIT = 5;

type RemotePost = {
  slug: string;
  title: string;
  excerpt: string | null;
  body: string;
  blocks?: unknown;
  hero_url?: string | null;
  layout?: string | null;
  topics?: string[] | null;
  published_at: string | null;
};

export function parseTopics(raw: string): string[] {
  const seen = new Set<string>();
  const topics: string[] = [];
  for (const part of raw.split(",")) {
    const topic = part.trim().replace(/\s+/g, " ").slice(0, 32);
    if (!topic) continue;
    const key = topic.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    topics.push(topic);
    if (topics.length >= 8) break;
  }
  return topics;
}

function asTopics(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string" && item.trim().length > 0);
}

function toPost(row: RemotePost): BlogPost {
  return {
    slug: row.slug,
    title: row.title,
    excerpt: row.excerpt ?? "",
    date: (row.published_at ?? "").slice(0, 10),
    topics: asTopics(row.topics),
    body: row.body,
    blocks: resolveBlocks(row.blocks, row.body),
    heroUrl: row.hero_url ?? null,
    layout: isArticleLayout(row.layout) ? row.layout : "flow",
  };
}

async function fetchSupabasePosts(): Promise<BlogPost[]> {
  const client = createPublicSupabase();
  if (!client) return [];
  const withTopics = await client
    .from("posts")
    .select("slug,title,excerpt,body,blocks,hero_url,layout,topics,published_at")
    .eq("published", true)
    .eq("archived", false)
    .order("published_at", { ascending: false });
  if (!withTopics.error && withTopics.data) {
    return (withTopics.data as RemotePost[]).map(toPost);
  }
  const fallback = await client
    .from("posts")
    .select("slug,title,excerpt,body,published_at")
    .eq("published", true)
    .eq("archived", false)
    .order("published_at", { ascending: false });
  if (fallback.error || !fallback.data) return [];
  return (fallback.data as RemotePost[]).map(toPost);
}

export async function getPosts(): Promise<BlogPost[]> {
  if (createPublicSupabase()) return fetchSupabasePosts();
  return LOCAL_POSTS;
}

export async function getRecentPosts(limit = RECENT_POST_LIMIT): Promise<BlogPost[]> {
  return (await getPosts()).slice(0, limit);
}

export function filterPosts(
  posts: BlogPost[],
  query: string,
  topic: string,
): BlogPost[] {
  const q = query.trim().toLowerCase();
  const wantedTopic = topic.trim().toLowerCase();
  return posts.filter((post) => {
    if (wantedTopic && !post.topics.some((item) => item.toLowerCase() === wantedTopic)) {
      return false;
    }
    if (!q) return true;
    const haystack = [post.title, post.excerpt, post.body, post.topics.join(" ")]
      .join("\n")
      .toLowerCase();
    return haystack.includes(q);
  });
}

export function uniqueTopics(posts: BlogPost[]): string[] {
  const seen = new Set<string>();
  const topics: string[] = [];
  for (const post of posts) {
    for (const topic of post.topics) {
      const key = topic.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      topics.push(topic);
    }
  }
  return topics.sort((a, b) => a.localeCompare(b));
}

export async function getPost(slug: string): Promise<BlogPost | undefined> {
  const client = createPublicSupabase();
  if (client) {
    const withTopics = await client
      .from("posts")
      .select("slug,title,excerpt,body,blocks,hero_url,layout,topics,published_at")
      .eq("slug", slug)
      .eq("published", true)
      .eq("archived", false)
      .maybeSingle();
    if (!withTopics.error && withTopics.data) {
      return toPost(withTopics.data as RemotePost);
    }
    const fallback = await client
      .from("posts")
      .select("slug,title,excerpt,body,published_at")
      .eq("slug", slug)
      .eq("published", true)
      .eq("archived", false)
      .maybeSingle();
    return fallback.data ? toPost(fallback.data as RemotePost) : undefined;
  }
  return LOCAL_POSTS.find((post) => post.slug === slug);
}

export function isSupabaseConfigured() {
  return Boolean(createPublicSupabase());
}
