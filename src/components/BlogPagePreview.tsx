"use client";

import { BlogArticle } from "@/components/BlogArticle";
import {
  blocksToPlaintext,
  countUnparsed,
  type ArticleLayout,
  type BlogBlock,
} from "@/lib/blog-blocks";

export type BlogPagePreviewProps = {
  title: string;
  excerpt: string;
  topics: string[];
  heroUrl: string | null;
  layout: ArticleLayout;
  blocks: BlogBlock[];
  liveDiagrams?: boolean;
  stale?: boolean;
};

export function BlogPagePreview({
  title,
  excerpt,
  topics,
  heroUrl,
  layout,
  blocks,
  liveDiagrams = true,
  stale = false,
}: BlogPagePreviewProps) {
  const bodyText = blocksToPlaintext(blocks);
  const unparsed = countUnparsed(blocks);
  const date = new Date().toISOString().slice(0, 10);

  return (
    <div className="admin-blog-preview-shell">
      {stale ? (
        <p className="admin-blog-preview-banner admin-warn">
          Source changed since last parse. Re-parse on the Edit tab to refresh this preview.
        </p>
      ) : null}
      {unparsed ? (
        <p className="admin-blog-preview-banner admin-warn">
          {unparsed} section{unparsed === 1 ? "" : "s"} still need review — the published page
          will differ until they are converted.
        </p>
      ) : null}
      <div className="admin-blog-preview-page">
        <main className="blog-portal blog-portal-article">
          <p className="blog-back">
            <span className="admin-blog-preview-back">← The ledger</span>
          </p>
          <BlogArticle
            title={title || "Untitled draft"}
            excerpt={excerpt}
            date={date}
            topics={topics}
            heroUrl={heroUrl}
            layout={layout}
            blocks={blocks}
            bodyText={bodyText}
            showChrome
            liveDiagrams={liveDiagrams}
          />
        </main>
      </div>
    </div>
  );
}
