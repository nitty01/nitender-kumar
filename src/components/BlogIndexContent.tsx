import Link from "next/link";
import { BlogPostSummary } from "@/components/BlogPostSummary";
import { RECENT_POST_LIMIT } from "@/lib/blog";
import type { BlogPost } from "@/content/blog-posts";

export function BlogIndexContent({
  posts,
  preview = false,
}: {
  posts: BlogPost[];
  preview?: boolean;
}) {
  const recent = posts.slice(0, RECENT_POST_LIMIT);
  const [lead, ...rest] = recent;
  const all = posts;

  return (
    <>
      <header className="blog-masthead">
        <p className="blog-kicker">The ledger</p>
        <h1>Platform, data, and AI</h1>
        <p className="blog-lede">
          Essays on production systems and engineering organizations. Latest {RECENT_POST_LIMIT}{" "}
          published pieces; the archive is searchable by topic.
        </p>
      </header>
      {recent.length === 0 ? <p className="blog-empty">No published posts yet.</p> : null}
      {lead ? (
        <section className="blog-lead" aria-label="Lead story">
          {preview ? (
            <div className="blog-lead-link">
              {lead.heroUrl ? (
                <img className="blog-lead-hero" src={lead.heroUrl} alt="" />
              ) : null}
              <div>
                {lead.topics[0] ? <p className="blog-kicker">{lead.topics[0]}</p> : null}
                {lead.date ? <p className="blog-card-date">{lead.date}</p> : null}
                <h2>{lead.title}</h2>
                {lead.excerpt ? <p className="blog-dek">{lead.excerpt}</p> : null}
              </div>
            </div>
          ) : (
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
          )}
        </section>
      ) : null}
      {rest.length > 0 ? (
        <section aria-label="More stories">
          <h2 className="blog-rail-title">More from the desk</h2>
          <ul className="blog-rail">
            {rest.map((post) => (
              <li key={post.slug}>
                <BlogPostSummary post={post} compact preview={preview} />
              </li>
            ))}
          </ul>
        </section>
      ) : null}
      {all.length > 0 ? (
        <p className="blog-more">
          {preview ? (
            <span>
              {all.length > RECENT_POST_LIMIT
                ? `View all ${all.length} posts and search by topic`
                : "Browse all posts"}
            </span>
          ) : (
            <Link href="/blog/all">
              {all.length > RECENT_POST_LIMIT
                ? `View all ${all.length} posts and search by topic`
                : "Browse all posts"}
            </Link>
          )}
        </p>
      ) : null}
    </>
  );
}
