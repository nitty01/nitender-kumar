"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { persistPostAction } from "@/app/admin/actions";
import { AdminTabPanel, AdminViewTabs, type AdminViewTab } from "@/components/AdminViewTabs";
import { readPendingMarkdownImport } from "@/components/BlogMarkdownDrop";
import { BlogPagePreview } from "@/components/BlogPagePreview";
import { MarkdownFileDropzone } from "@/components/MarkdownFileDropzone";
import { UnparsedBlockFields } from "@/components/UnparsedBlockFields";
import {
  countUnparsed,
  replaceBlockById,
  type ArticleLayout,
  type BlogBlock,
} from "@/lib/blog-blocks";
import {
  BLOG_MARKDOWN_TEMPLATE,
  BLOG_STRUCTURE_GUIDE,
  importBlogMarkdown,
  type ImportIssue,
} from "@/lib/import-blog-markdown";

function blockSummary(block: BlogBlock): string {
  if (block.type === "heading") return block.text.slice(0, 80) || "Heading";
  if (block.type === "paragraph" || block.type === "quote" || block.type === "pullquote") {
    return block.text.slice(0, 80) || block.type;
  }
  if (block.type === "list") return `${block.items.length} item${block.items.length === 1 ? "" : "s"}`;
  if (block.type === "image") return block.alt || block.url || "Image";
  if (block.type === "mermaid") return "Mermaid diagram";
  if (block.type === "drawio") return "Draw.io diagram";
  if (block.type === "divider") return "Section break";
  if (block.type === "split") return "Half / half";
  if (block.type === "unparsed") return block.reason.slice(0, 80);
  return "Needs a block type";
}

function downloadTemplate() {
  const blob = new Blob([BLOG_MARKDOWN_TEMPLATE], { type: "text/markdown;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = "blog-post-template.md";
  anchor.click();
  URL.revokeObjectURL(url);
}

export function BlogImport() {
  const router = useRouter();
  const [filename, setFilename] = useState("");
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [excerpt, setExcerpt] = useState("");
  const [heroUrl, setHeroUrl] = useState("");
  const [layout, setLayout] = useState<ArticleLayout>("flow");
  const [topics, setTopics] = useState<string[]>([]);
  const [blocks, setBlocks] = useState<BlogBlock[]>([]);
  const [issues, setIssues] = useState<ImportIssue[]>([]);
  const [source, setSource] = useState("");
  const [lastParsedSource, setLastParsedSource] = useState("");
  const [viewTab, setViewTab] = useState<AdminViewTab>("edit");
  const parsed = blocks.length > 0;
  const leftover = countUnparsed(blocks);
  const previewStale = parsed && source !== lastParsedSource;

  const previewData = useMemo(() => {
    if (!source.trim() && !parsed) return null;
    if (parsed && !previewStale) {
      return {
        title,
        excerpt,
        topics,
        heroUrl: heroUrl || null,
        layout,
        blocks,
        slug,
      };
    }
    if (!source.trim()) return null;
    const result = importBlogMarkdown(source);
    return {
      title: result.title,
      excerpt: result.excerpt,
      topics: result.topics,
      heroUrl: result.heroUrl || null,
      layout: result.layout,
      blocks: result.blocks,
      slug: result.slug,
    };
  }, [
    parsed,
    previewStale,
    source,
    title,
    excerpt,
    topics,
    heroUrl,
    layout,
    blocks,
    slug,
  ]);

  function applySource(nextSource: string, name = "pasted.md") {
    const result = importBlogMarkdown(nextSource);
    setSource(nextSource);
    setLastParsedSource(nextSource);
    setFilename(name);
    setTitle(result.title);
    setSlug(result.slug);
    setExcerpt(result.excerpt);
    setHeroUrl(result.heroUrl);
    setLayout(result.layout);
    setTopics(result.topics);
    setBlocks(result.blocks);
    setIssues(result.issues);
    const extra = countUnparsed(result.blocks);
    setStatus(
      extra
        ? `Parsed ${result.blocks.length} blocks. ${extra} section${extra === 1 ? "" : "s"} need review — see detailed errors below.`
        : `Parsed ${result.blocks.length} blocks. Ready to save as a draft.`,
    );
  }

  useEffect(() => {
    const pending = readPendingMarkdownImport();
    if (pending) applySource(pending.text, pending.name);
  }, []);

  function scrollToBlock(blockId?: string) {
    if (!blockId) return;
    document.getElementById(`import-block-${blockId}`)?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }

  async function createDraft() {
    if (!parsed) {
      setStatus("Upload or paste markdown first.");
      return;
    }
    setBusy(true);
    setStatus("Saving draft…");
    const result = await persistPostAction({
      slug,
      title,
      excerpt,
      blocks,
      heroUrl: heroUrl || null,
      layout,
      topics,
      published: false,
    });
    if (!result.ok) {
      setBusy(false);
      setStatus(result.error);
      return;
    }
    router.push(`/admin/blog/${result.id}?saved=draft`);
  }

  return (
    <div className="admin-import">
      <MarkdownFileDropzone
        filename={filename}
        busy={busy}
        onFile={(text, name) => applySource(text, name)}
        onError={setStatus}
      />

      <section className="admin-panel admin-import-guide" aria-label="Markdown template guide">
        <h2>Structure guide</h2>
        <p className="admin-muted">
          The parser auto-maps these markdown shapes to story blocks. Use the template as a starting
          point — every section in it should parse cleanly.
        </p>
        <div className="admin-editor-actions">
          <button
            type="button"
            className="admin-btn-secondary"
            onClick={() => {
              setSource(BLOG_MARKDOWN_TEMPLATE);
              setFilename("blog-post-template.md");
              setStatus("Template loaded. Parse it or edit placeholders, then parse.");
            }}
          >
            Load template
          </button>
          <button type="button" className="admin-btn-secondary" onClick={downloadTemplate}>
            Download .md
          </button>
          <button
            type="button"
            className="admin-btn"
            onClick={() => applySource(BLOG_MARKDOWN_TEMPLATE, "blog-post-template.md")}
          >
            Parse template
          </button>
        </div>
        <div className="admin-structure-grid">
          {BLOG_STRUCTURE_GUIDE.map((row) => (
            <details key={row.kind} className="admin-structure-card">
              <summary>{row.label}</summary>
              <ul className="admin-import-issues">
                {row.rules.map((rule) => (
                  <li key={rule} className="admin-muted">
                    {rule}
                  </li>
                ))}
              </ul>
              <pre className="admin-template-preview">{row.example}</pre>
            </details>
          ))}
        </div>
      </section>

      <AdminViewTabs active={viewTab} onChange={setViewTab} label="Markdown import view" />

      <AdminTabPanel tab="edit" active={viewTab}>
      <label>
        Markdown source
        <textarea
          rows={12}
          value={source}
          onChange={(event) => setSource(event.target.value)}
          placeholder="Paste front matter and body, or load the template above."
        />
      </label>
      <div className="admin-editor-actions">
        <button
          type="button"
          className="admin-btn"
          onClick={() => {
            if (!source.trim()) {
              setStatus("Paste markdown or load the template first.");
              return;
            }
            applySource(source, filename || "pasted.md");
          }}
        >
          Parse markdown
        </button>
        {parsed ? (
          <button
            type="button"
            className="admin-btn-secondary"
            onClick={() => applySource(source, filename || "pasted.md")}
          >
            Re-parse source
          </button>
        ) : null}
      </div>

      {status ? <p className={leftover ? "admin-warn" : "admin-ok"}>{status}</p> : null}

      {parsed ? (
        <>
          <section className="admin-panel" aria-label="Imported metadata">
            <h2>Draft metadata</h2>
            <label>
              Title
              <input value={title} onChange={(event) => setTitle(event.target.value)} />
            </label>
            <label>
              URL slug
              <input value={slug} onChange={(event) => setSlug(event.target.value)} />
            </label>
            <label>
              Dek / excerpt
              <textarea rows={2} value={excerpt} onChange={(event) => setExcerpt(event.target.value)} />
            </label>
            <label>
              Hero image URL
              <input value={heroUrl} onChange={(event) => setHeroUrl(event.target.value)} />
            </label>
            <fieldset className="admin-fieldset">
              <legend>Page layout</legend>
              <label>
                <input
                  type="radio"
                  name="import_layout"
                  checked={layout === "flow"}
                  onChange={() => setLayout("flow")}
                />
                Single column flow
              </label>
              <label>
                <input
                  type="radio"
                  name="import_layout"
                  checked={layout === "newspaper"}
                  onChange={() => setLayout("newspaper")}
                />
                Newspaper — half / half
              </label>
            </fieldset>
            {topics.length ? (
              <p className="admin-muted">Topics: {topics.join(", ")}</p>
            ) : (
              <p className="admin-muted">No topics in front matter. Add them in the editor after saving.</p>
            )}
          </section>

          {issues.length ? (
            <section className="admin-panel" aria-label="Parse notes">
              <h2>Parse notes</h2>
              <ul className="admin-import-issues">
                {issues.map((item) => (
                  <li
                    key={item.id}
                    className={item.severity === "warn" ? "admin-parse-issue admin-warn" : "admin-parse-issue admin-muted"}
                  >
                    <p>
                      {item.line ? `Line ${item.line}: ` : ""}
                      {item.message}
                    </p>
                    {item.hint ? <p className="admin-parse-hint">{item.hint}</p> : null}
                    {item.blockId ? (
                      <button type="button" onClick={() => scrollToBlock(item.blockId)}>
                        Jump to section
                      </button>
                    ) : null}
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          <section className="admin-panel" aria-label="Parsed blocks">
            <h2>Story blocks</h2>
            {leftover ? (
              <p className="admin-warn">
                {leftover} section{leftover === 1 ? "" : "s"} could not be auto-mapped. Edit each
                snippet inline, use Insert example, or convert to a block type. Publishing is blocked
                until they are resolved.
              </p>
            ) : (
              <p className="admin-ok">Every section mapped to a blog block.</p>
            )}
            <ol className="admin-block-list">
              {blocks.map((block) => (
                <li
                  key={block.id}
                  id={block.type === "unparsed" ? `import-block-${block.id}` : undefined}
                  className={block.type === "unparsed" ? "admin-block admin-block-unparsed" : "admin-block"}
                >
                  <div className="admin-block-bar">
                    <span>{block.type === "unparsed" ? "needs review" : block.type}</span>
                    <span className="admin-muted">{blockSummary(block)}</span>
                  </div>
                  {block.type === "unparsed" ? (
                    <UnparsedBlockFields
                      block={block}
                      onChange={(next) =>
                        setBlocks((current) => replaceBlockById(current, block.id, [next]))
                      }
                      onReplace={(next) =>
                        setBlocks((current) => replaceBlockById(current, block.id, next))
                      }
                    />
                  ) : null}
                </li>
              ))}
            </ol>
          </section>
        </>
      ) : null}
      </AdminTabPanel>

      <AdminTabPanel tab="preview" active={viewTab}>
        <section className="admin-preview" aria-label="Blog page preview">
          <p className="admin-muted">
            Same layout as the public article page — back link, topic kicker (first topic in front
            matter), title, dek, and body blocks. URL after publish:{" "}
            <code>/blog/{previewData?.slug || slug || "your-slug"}</code>
          </p>
          {previewData ? (
            <BlogPagePreview
              title={previewData.title}
              excerpt={previewData.excerpt}
              topics={previewData.topics}
              heroUrl={previewData.heroUrl}
              layout={previewData.layout}
              blocks={previewData.blocks}
              liveDiagrams
              stale={previewStale}
            />
          ) : (
            <p className="admin-muted">Load or paste markdown on the Edit tab to preview the article.</p>
          )}
        </section>
      </AdminTabPanel>

      {parsed ? (
        <div className="admin-editor-actions">
          <button type="button" className="admin-btn" onClick={() => void createDraft()} disabled={busy}>
            Save as draft
          </button>
        </div>
      ) : null}
    </div>
  );
}
