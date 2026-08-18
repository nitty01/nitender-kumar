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
  const [lead, ...rest] = recent;

  return (
    <main className="blog-portal">
      <header className="blog-masthead">
        <p className="blog-kicker">The ledger</p>
        <h1>Platform, data, and AI</h1>
        <p className="blog-lede">
          Essays on production systems and engineering organizations. Latest {RECENT_POST_LIMIT}{" "}
          published pieces; the archive is searchable by topic.
        </p>
      </header>
      {!isSupabaseConfigured() ? (
        <p className="blog-empty">
          Supabase is not connected yet. Add NEXT_PUBLIC_SUPABASE_URL and a publishable key.
        </p>
      ) : null}
      {recent.length === 0 ? <p className="blog-empty">No published posts yet.</p> : null}
      {lead ? (
        <section className="blog-lead" aria-label="Lead story">
          <Link href={`/blog/${lead.slug}`} className="blog-lead-link">
            {lead.heroUrl ? (
              <img className="blog-lead-hero" src={lead.heroUrl} alt="" />
            ) : null}
            <div>
              {lead.topics[0] ? <p className="blog-kicker">{lead.topics[0]}</p> : null}
              {lead.date ? <p className="blog-card-date">{lead.date}</p> : null}
              <h2>{lead.title}</h2>
              {lead.excerpt ? <p className="blog-dek">{lead.excerpt}</p> : null}
            </div>
          </Link>
        </section>
      ) : null}
      {rest.length > 0 ? (
        <section aria-label="More stories">
          <h2 className="blog-rail-title">More from the desk</h2>
          <ul className="blog-rail">
            {rest.map((post) => (
              <li key={post.slug}>
                <BlogPostSummary post={post} compact />
              </li>
            ))}
          </ul>
        </section>
      ) : null}
      {all.length > 0 ? (
        <p className="blog-more">
          <Link href="/blog/all">
            {all.length > RECENT_POST_LIMIT
              ? `View all ${all.length} posts and search by topic`
              : "Browse all posts"}
          </Link>
        </p>
      ) : null}
    </main>
  );
}
