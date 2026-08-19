"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { persistPostAction } from "@/app/admin/actions";
import { UnparsedBlockFields } from "@/components/UnparsedBlockFields";
import {
  countUnparsed,
  replaceBlockById,
  type ArticleLayout,
  type BlogBlock,
} from "@/lib/blog-blocks";
import { importBlogMarkdown, type ImportIssue } from "@/lib/import-blog-markdown";

const ACCEPT = ".md,.markdown,.txt,text/markdown,text/plain";
const MAX_BYTES = 1_000_000;

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
  return "Needs a block type";
}

export function BlogImport() {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
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
  const [paste, setPaste] = useState("");
  const parsed = blocks.length > 0;
  const leftover = countUnparsed(blocks);

  function applySource(source: string, name = "pasted.md") {
    const result = importBlogMarkdown(source);
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
        ? `Parsed ${result.blocks.length} blocks. ${extra} leftover snippet${extra === 1 ? "" : "s"} need a type.`
        : `Parsed ${result.blocks.length} blocks. Ready to save as a draft.`,
    );
  }

  async function readFile(file: File) {
    if (file.size > MAX_BYTES) {
      setStatus("File is larger than 1 MB.");
      return;
    }
    const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
    if (ext && !["md", "markdown", "txt"].includes(ext)) {
      setStatus("Use a .md, .markdown, or .txt file.");
      return;
    }
    applySource(await file.text(), file.name);
  }

  async function onPick(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (file) await readFile(file);
  }

  async function onDrop(event: React.DragEvent<HTMLElement>) {
    event.preventDefault();
    setDragging(false);
    const file = event.dataTransfer.files?.[0];
    if (file) await readFile(file);
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
      <section
        className={dragging ? "admin-import-drop is-active" : "admin-import-drop"}
        onDragOver={(event) => {
          event.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(event) => void onDrop(event)}
      >
        <p>Drop a markdown or plain-text file that matches the blog front matter and body.</p>
        <p className="admin-muted">
          YAML title, slug, excerpt, topics, layout, and hero are read when present. Headings,
          quotes, lists, images, Mermaid, and Draw.io fences become story blocks. Anything else
          is kept as a leftover snippet you can convert.
        </p>
        <input
          ref={fileRef}
          type="file"
          hidden
          accept={ACCEPT}
          onChange={(event) => void onPick(event)}
        />
        <button type="button" className="admin-btn" onClick={() => fileRef.current?.click()}>
          Choose file
        </button>
        {filename ? <p className="admin-muted">{filename}</p> : null}
      </section>

      <label>
        Or paste markdown
        <textarea
          rows={8}
          value={paste}
          onChange={(event) => setPaste(event.target.value)}
          placeholder={"---\ntitle: …\nslug: …\nexcerpt: …\ntopics: GenAI, Platform\nlayout: flow\n---\n\nBody…"}
        />
      </label>
      <button
        type="button"
        className="admin-btn-secondary"
        onClick={() => {
          if (!paste.trim()) {
            setStatus("Paste markdown first.");
            return;
          }
          applySource(paste, "pasted.md");
        }}
      >
        Parse pasted markdown
      </button>

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
                  <li key={item.id} className={item.severity === "warn" ? "admin-warn" : "admin-muted"}>
                    {item.message}
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          <section className="admin-panel" aria-label="Parsed blocks">
            <h2>Story blocks</h2>
            {leftover ? (
              <p className="admin-warn">
                {leftover} leftover snippet{leftover === 1 ? "" : "s"} still need a block type. You
                can convert them here or after saving the draft. Publishing is blocked until they
                are converted.
              </p>
            ) : (
              <p className="admin-ok">Every section mapped to a blog block.</p>
            )}
            <ol className="admin-block-list">
              {blocks.map((block) => (
                <li
                  key={block.id}
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

          <div className="admin-editor-actions">
            <button type="button" className="admin-btn" onClick={() => void createDraft()} disabled={busy}>
              Save as draft
            </button>
          </div>
        </>
      ) : null}
    </div>
  );
}
