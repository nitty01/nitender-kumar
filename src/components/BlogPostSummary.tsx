import Link from "next/link";
import type { BlogPost } from "@/content/blog-posts";

export function BlogPostSummary({
  post,
  compact = false,
  preview = false,
}: {
  post: BlogPost;
  compact?: boolean;
  preview?: boolean;
}) {
  return (
    <article className={compact ? "blog-card blog-card-compact" : "blog-card"}>
      {post.date ? <p className="blog-card-date">{post.date}</p> : null}
      <h3>
        {preview ? (
          post.title
        ) : (
          <Link href={`/blog/${post.slug}`}>{post.title}</Link>
        )}
      </h3>
      {post.excerpt ? <p className="blog-card-excerpt">{post.excerpt}</p> : null}
      {post.topics.length > 0 ? (
        <ul className="blog-topics">
          {post.topics.map((topic) => (
            <li key={topic}>
              {preview ? (
                topic
              ) : (
                <Link href={`/blog/all?topic=${encodeURIComponent(topic)}`}>{topic}</Link>
              )}
            </li>
          ))}
        </ul>
      ) : null}
    </article>
  );
}
