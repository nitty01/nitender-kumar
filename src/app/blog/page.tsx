import type { Metadata } from "next";
import { BlogIndexContent } from "@/components/BlogIndexContent";
import { getPosts, isSupabaseConfigured } from "@/lib/blog";
import { requirePublicPage } from "@/lib/public-pages";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Blog | Nitender Kumar",
  description:
    "Writing on platform engineering, data systems, and production GenAI from Nitender Kumar.",
};

export default async function BlogPage() {
  await requirePublicPage("showBlog");
  const posts = await getPosts();

  return (
    <main className="blog-portal">
      {!isSupabaseConfigured() ? (
        <p className="blog-empty">
          Supabase is not connected yet. Add NEXT_PUBLIC_SUPABASE_URL and a publishable key.
        </p>
      ) : null}
      <BlogIndexContent posts={posts} />
    </main>
  );
}
