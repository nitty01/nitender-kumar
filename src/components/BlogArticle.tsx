import Link from "next/link";
import { BlogBlocks } from "@/components/BlogContent";
import type { ArticleLayout, BlogBlock } from "@/lib/blog-blocks";
import { readingMinutes } from "@/lib/blog-blocks";
import { SITE } from "@/lib/site";

export type BlogArticleProps = {
  title: string;
  excerpt?: string;
  date?: string;
  topics?: string[];
  heroUrl?: string | null;
  layout?: ArticleLayout;
  blocks: BlogBlock[];
  bodyText?: string;
  showChrome?: boolean;
  liveDiagrams?: boolean;
};

export function BlogArticle({
  title,
  excerpt,
  date,
  topics = [],
  heroUrl,
  layout = "flow",
  blocks,
  bodyText = "",
  showChrome = true,
  liveDiagrams = false,
}: BlogArticleProps) {
  const kicker = topics[0];
  const minutes = readingMinutes(bodyText || title);

  return (
    <article className={layout === "newspaper" ? "blog-article blog-article-newspaper" : "blog-article"}>
      {showChrome ? (
        <header className="blog-article-header">
          {kicker ? <p className="blog-kicker">{kicker}</p> : null}
          <h1>{title}</h1>
          {excerpt ? <p className="blog-dek">{excerpt}</p> : null}
          <p className="blog-byline">
            <a
              className="blog-byline-linkedin"
              href={SITE.linkedin}
              target="_blank"
              rel="author noopener noreferrer"
            >
              {SITE.name}
              <span className="blog-byline-in" aria-hidden="true">
                in
              </span>
            </a>
            {date ? <time dateTime={date}>{date}</time> : null}
            <span>{minutes} min read</span>
          </p>
        </header>
      ) : (
        <header className="blog-article-header">
          <h1>{title || "Untitled"}</h1>
          {excerpt ? <p className="blog-dek">{excerpt}</p> : null}
          <p className="blog-byline">
            <a
              className="blog-byline-linkedin"
              href={SITE.linkedin}
              target="_blank"
              rel="author noopener noreferrer"
            >
              {SITE.name}
              <span className="blog-byline-in" aria-hidden="true">
                in
              </span>
            </a>
          </p>
        </header>
      )}
      {heroUrl ? (
        <figure className="blog-hero">
          <img src={heroUrl} alt="" />
        </figure>
      ) : null}
      <BlogBlocks blocks={blocks} layout={layout} liveDiagrams={liveDiagrams} />
      {showChrome && topics.length > 0 ? (
        <ul className="blog-topics">
          {topics.map((topic) => (
            <li key={topic}>
              <Link href={`/blog/all?topic=${encodeURIComponent(topic)}`}>{topic}</Link>
            </li>
          ))}
        </ul>
      ) : null}
    </article>
  );
}
