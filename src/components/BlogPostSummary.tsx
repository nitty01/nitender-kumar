import Link from "next/link";
import type { BlogPost } from "@/content/blog-posts";

export function BlogPostSummary({ post }: { post: BlogPost }) {
  return (
    <article className="blog-card">
      {post.date ? <p className="blog-card-date">{post.date}</p> : null}
      <h2>
        <Link href={`/blog/${post.slug}`}>{post.title}</Link>
      </h2>
      {post.excerpt ? <p className="blog-card-excerpt">{post.excerpt}</p> : null}
      {post.topics.length > 0 ? (
        <ul className="blog-topics">
          {post.topics.map((topic) => (
            <li key={topic}>
              <Link href={`/blog/all?topic=${encodeURIComponent(topic)}`}>{topic}</Link>
            </li>
          ))}
        </ul>
      ) : null}
    </article>
  );
}
