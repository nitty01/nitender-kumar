"use client";

import { DrawioDiagram } from "@/components/DrawioDiagram";
import { MermaidDiagram } from "@/components/MermaidDiagram";
import {
  parseMarkdownToBlocks,
  type ArticleLayout,
  type BlogBlock,
} from "@/lib/blog-blocks";
import { renderSimpleMarkdown } from "@/lib/markdown";
import type { ReactNode } from "react";

function Html({ text }: { text: string }) {
  return <div className="blog-markdown" dangerouslySetInnerHTML={{ __html: renderSimpleMarkdown(text) }} />;
}

function DiagramFigure({
  url,
  caption,
  live,
}: {
  url?: string;
  caption?: string;
  live: ReactNode;
}) {
  if (url) {
    return (
      <figure className="blog-figure blog-figure-diagram">
        <img src={url} alt={caption || "Diagram"} loading="lazy" />
        {caption ? <figcaption>{caption}</figcaption> : null}
      </figure>
    );
  }
  return (
    <figure className="blog-figure blog-figure-diagram">
      {live}
      {caption ? <figcaption>{caption}</figcaption> : null}
    </figure>
  );
}

function BlockView({
  block,
  liveDiagrams,
}: {
  block: BlogBlock;
  liveDiagrams: boolean;
}) {
  if (block.type === "heading") {
    const Tag = block.level === 3 ? "h3" : "h2";
    return <Tag className="blog-block-heading">{block.text}</Tag>;
  }
  if (block.type === "paragraph") return <Html text={block.text} />;
  if (block.type === "quote") {
    return (
      <blockquote className="blog-quote">
        <Html text={block.text} />
        {block.cite ? <cite>{block.cite}</cite> : null}
      </blockquote>
    );
  }
  if (block.type === "pullquote") {
    return <blockquote className="blog-pullquote">{block.text}</blockquote>;
  }
  if (block.type === "list") {
    const Tag = block.ordered ? "ol" : "ul";
    return (
      <Tag className="blog-list-block">
        {block.items.map((item, index) => (
          <li key={`${block.id}-${index}`}>{item}</li>
        ))}
      </Tag>
    );
  }
  if (block.type === "image" && block.url) {
    return (
      <figure className={block.layout === "wide" ? "blog-figure blog-figure-wide" : "blog-figure"}>
        <img src={block.url} alt={block.alt} loading="lazy" />
        {block.caption ? <figcaption>{block.caption}</figcaption> : null}
      </figure>
    );
  }
  if (block.type === "mermaid" && block.chart.trim()) {
    const useExport = Boolean(block.exportUrl) && !liveDiagrams;
    return (
      <DiagramFigure
        url={useExport ? block.exportUrl : undefined}
        caption={block.caption}
        live={<MermaidDiagram chart={block.chart} />}
      />
    );
  }
  if (block.type === "drawio" && block.source.trim()) {
    const useExport = Boolean(block.exportUrl) && !liveDiagrams;
    return (
      <DiagramFigure
        url={useExport ? block.exportUrl : undefined}
        caption={block.caption}
        live={<DrawioDiagram source={block.source} format={block.format} />}
      />
    );
  }
  if (block.type === "split") {
    return (
      <div className="blog-split">
        <div className="blog-split-col">
          {block.left.map((child) => (
            <BlockView key={child.id} block={child} liveDiagrams={liveDiagrams} />
          ))}
        </div>
        <div className="blog-split-col">
          {block.right.map((child) => (
            <BlockView key={child.id} block={child} liveDiagrams={liveDiagrams} />
          ))}
        </div>
      </div>
    );
  }
  if (block.type === "divider") return <hr className="blog-divider" />;
  return null;
}

export function BlogBlocks({
  blocks,
  layout = "flow",
  liveDiagrams = false,
}: {
  blocks: BlogBlock[];
  layout?: ArticleLayout;
  liveDiagrams?: boolean;
}) {
  if (layout === "newspaper") {
    const mid = Math.ceil(blocks.length / 2) || 1;
    return (
      <div className="blog-content blog-content-newspaper">
        <div className="blog-newspaper-col">
          {blocks.slice(0, mid).map((block) => (
            <BlockView key={block.id} block={block} liveDiagrams={liveDiagrams} />
          ))}
        </div>
        <div className="blog-newspaper-col">
          {blocks.slice(mid).map((block) => (
            <BlockView key={block.id} block={block} liveDiagrams={liveDiagrams} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="blog-content">
      {blocks.map((block) => (
        <BlockView key={block.id} block={block} liveDiagrams={liveDiagrams} />
      ))}
    </div>
  );
}

export function BlogContent({ body }: { body: string }) {
  return <BlogBlocks blocks={parseMarkdownToBlocks(body)} />;
}
