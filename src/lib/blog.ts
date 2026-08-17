import { LOCAL_POSTS, type BlogPost } from "@/content/blog-posts";
import { createPublicSupabase } from "@/lib/admin-data";

type RemotePost = {
  slug: string;
  title: string;
  excerpt: string | null;
  body: string;
  published_at: string | null;
};

function toPost(row: RemotePost): BlogPost {
  return {
    slug: row.slug,
    title: row.title,
    excerpt: row.excerpt ?? "",
    date: (row.published_at ?? "").slice(0, 10),
    body: row.body,
  };
}

async function fetchSupabasePosts(): Promise<BlogPost[]> {
  const client = createPublicSupabase();
  if (!client) return [];
  const { data, error } = await client
    .from("posts")
    .select("slug,title,excerpt,body,published_at")
    .eq("published", true)
    .eq("archived", false)
    .order("published_at", { ascending: false });
  if (error || !data) return [];
  return (data as RemotePost[]).map(toPost);
}

export async function getPosts(): Promise<BlogPost[]> {
  if (createPublicSupabase()) return fetchSupabasePosts();
  return LOCAL_POSTS;
}

export async function getPost(slug: string): Promise<BlogPost | undefined> {
  const client = createPublicSupabase();
  if (client) {
    const { data } = await client
      .from("posts")
      .select("slug,title,excerpt,body,published_at")
      .eq("slug", slug)
      .eq("published", true)
      .eq("archived", false)
      .maybeSingle();
    return data ? toPost(data as RemotePost) : undefined;
  }
  return LOCAL_POSTS.find((post) => post.slug === slug);
}

export function isSupabaseConfigured() {
  return Boolean(createPublicSupabase());
}
