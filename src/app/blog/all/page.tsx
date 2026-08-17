import type { Metadata } from "next";
import Link from "next/link";
import { BlogPostSummary } from "@/components/BlogPostSummary";
import { filterPosts, getPosts, uniqueTopics } from "@/lib/blog";
import { requirePublicPage } from "@/lib/public-pages";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "All posts | Nitender Kumar",
  description: "Full blog archive. Search by topic, title, or idea.",
};

export default async function BlogArchivePage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; topic?: string }>;
}) {
  await requirePublicPage("showBlog");
  const { q = "", topic = "" } = await searchParams;
  const posts = await getPosts();
  const topics = uniqueTopics(posts);
  const results = filterPosts(posts, q, topic);

  return (
    <main className="blog-index">
      <p className="text-sm">
        <Link href="/blog">← Latest posts</Link>
      </p>
      <p className="blog-kicker">Blog archive</p>
      <h1>All posts</h1>
      <p className="blog-lede">Search the full set of published posts by topic or keyword.</p>

      <form className="blog-search" method="get" action="/blog/all" role="search">
        <label>
          Search
          <input type="search" name="q" defaultValue={q} placeholder="Platform, GenAI, cost…" />
        </label>
        {topic ? <input type="hidden" name="topic" value={topic} /> : null}
        <button type="submit">Search</button>
      </form>

      {topics.length > 0 ? (
        <nav className="blog-topic-nav" aria-label="Topics">
          <Link href="/blog/all" className={!topic ? "is-active" : undefined}>
            All topics
          </Link>
          {topics.map((item) => {
            const href = q
              ? `/blog/all?topic=${encodeURIComponent(item)}&q=${encodeURIComponent(q)}`
              : `/blog/all?topic=${encodeURIComponent(item)}`;
            return (
              <Link
                key={item}
                href={href}
                className={item.toLowerCase() === topic.toLowerCase() ? "is-active" : undefined}
              >
                {item}
              </Link>
            );
          })}
        </nav>
      ) : null}

      <p className="blog-count">
        {results.length} {results.length === 1 ? "post" : "posts"}
        {topic ? ` in ${topic}` : ""}
        {q ? ` matching “${q}”` : ""}
      </p>

      {results.length === 0 ? <p className="blog-empty">No posts match that search.</p> : null}
      <ul className="blog-list">
        {results.map((post) => (
          <li key={post.slug}>
            <BlogPostSummary post={post} />
          </li>
        ))}
      </ul>
    </main>
  );
}
