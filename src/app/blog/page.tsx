import type { Metadata } from "next";
import Link from "next/link";
import { BlogPostSummary } from "@/components/BlogPostSummary";
import { getPosts, getRecentPosts, isSupabaseConfigured, RECENT_POST_LIMIT } from "@/lib/blog";
import { requirePublicPage } from "@/lib/public-pages";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Blog | Nitender Kumar",
  description:
    "Writing on platform engineering, data systems, and production GenAI from Nitender Kumar.",
};

export default async function BlogPage() {
  await requirePublicPage("showBlog");
  const [recent, all] = await Promise.all([getRecentPosts(), getPosts()]);

  return (
    <main className="blog-index">
      <p className="blog-kicker">Blog</p>
      <h1>Writing on platform, data, and AI</h1>
      <p className="blog-lede">
        Essays on engineering organizations and production platforms. The latest {RECENT_POST_LIMIT}{" "}
        published posts are here; the full archive is searchable by topic.
      </p>
      {!isSupabaseConfigured() ? (
        <p className="blog-empty">
          Supabase is not connected yet. Add NEXT_PUBLIC_SUPABASE_URL and
          NEXT_PUBLIC_SUPABASE_ANON_KEY (or NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY), then run the
          blog schema.
        </p>
      ) : null}
      {recent.length === 0 ? <p className="blog-empty">No published posts yet.</p> : null}
      <ul className="blog-list">
        {recent.map((post) => (
          <li key={post.slug}>
            <BlogPostSummary post={post} />
          </li>
        ))}
      </ul>
      {all.length > RECENT_POST_LIMIT ? (
        <p className="blog-more">
          <Link href="/blog/all">View all {all.length} posts and search by topic</Link>
        </p>
      ) : all.length > 0 ? (
        <p className="blog-more">
          <Link href="/blog/all">Browse all posts</Link>
        </p>
      ) : null}
    </main>
  );
}
