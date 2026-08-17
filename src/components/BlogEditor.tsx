"use client";

import { useMemo, useRef, useState } from "react";
import { savePostAction, uploadMediaAction } from "@/app/admin/actions";
import { renderSimpleMarkdown, splitMarkdownWithMermaid } from "@/lib/markdown";

const SUGGESTED_TOPICS = [
  "Platform",
  "Data Engineering",
  "GenAI",
  "Leadership",
  "Architecture",
  "Cost",
];

type BlogEditorProps = {
  cloudinaryEnabled?: boolean;
  saved?: string;
  post?: {
    id: string;
    slug: string;
    title: string;
    excerpt: string | null;
    body: string;
    topics: string[];
    published: boolean;
    archived: boolean;
  };
};

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80);
}

function statusLabel(post?: BlogEditorProps["post"]) {
  if (!post) return "New draft";
  if (post.archived) return "Archived";
  return post.published ? "Published" : "Draft";
}

export function BlogEditor({ post, cloudinaryEnabled = false, saved }: BlogEditorProps) {
  const [title, setTitle] = useState(post?.title ?? "");
  const [slug, setSlug] = useState(post?.slug ?? "");
  const [excerpt, setExcerpt] = useState(post?.excerpt ?? "");
  const [body, setBody] = useState(post?.body ?? "");
  const [topics, setTopics] = useState(post?.topics ?? []);
  const [slugTouched, setSlugTouched] = useState(Boolean(post?.slug));
  const [uploadStatus, setUploadStatus] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const bodyRef = useRef<HTMLTextAreaElement>(null);
  const isPublished = Boolean(post?.published && !post?.archived);

  const previewParts = useMemo(() => splitMarkdownWithMermaid(body), [body]);
  const wordCount = body.trim() ? body.trim().split(/\s+/).length : 0;

  function insertAtCursor(snippet: string) {
    const field = bodyRef.current;
    if (!field) {
      setBody((current) => `${current.trimEnd()}\n${snippet}`);
      return;
    }
    const start = field.selectionStart;
    const end = field.selectionEnd;
    const next = `${body.slice(0, start)}${snippet}${body.slice(end)}`;
    setBody(next);
    requestAnimationFrame(() => {
      field.focus();
      const cursor = start + snippet.length;
      field.setSelectionRange(cursor, cursor);
    });
  }

  function wrapSelection(before: string, after = before, fallback = "text") {
    const field = bodyRef.current;
    const selected = field ? body.slice(field.selectionStart, field.selectionEnd) : "";
    insertAtCursor(`${before}${selected || fallback}${after}`);
  }

  function addTopic(value: string) {
    const topic = value.trim().replace(/\s+/g, " ").slice(0, 32);
    if (!topic) return;
    setTopics((current) => {
      if (current.some((item) => item.toLowerCase() === topic.toLowerCase())) return current;
      if (current.length >= 8) return current;
      return [...current, topic];
    });
  }

  async function onPickFile(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setUploadStatus(`Uploading ${file.name}…`);
    const data = new FormData();
    data.set("file", file);
    const result = await uploadMediaAction(data);
    if (!result.ok) {
      setUploadStatus(result.error);
      return;
    }
    const alt = file.name.replace(/\.[^.]+$/, "").replace(/[-_]+/g, " ");
    const block =
      result.resourceType === "raw"
        ? `\n\n[${alt}](${result.url})\n\n`
        : `\n\n![${alt}](${result.url})\n\n`;
    insertAtCursor(block);
    setUploadStatus("Uploaded to Cloudinary.");
  }

  return (
    <form action={savePostAction} className="admin-editor">
      {post?.id ? <input type="hidden" name="id" value={post.id} /> : null}
      <input type="hidden" name="topics" value={topics.join(", ")} />

      <div className="admin-editor-meta">
        <p className={`admin-status admin-status-${isPublished ? "live" : "draft"}`}>
          {statusLabel(post)}
        </p>
        {saved === "draft" ? <p className="admin-ok">Draft saved. Not visible on the public site.</p> : null}
        {saved === "published" ? <p className="admin-ok">Published to /blog.</p> : null}
      </div>

      <label>
        Title
        <input
          name="title"
          value={title}
          required
          onChange={(event) => {
            const next = event.target.value;
            setTitle(next);
            if (!slugTouched) setSlug(slugify(next));
          }}
        />
      </label>
      <label>
        URL slug
        <input
          name="slug"
          value={slug}
          required
          onChange={(event) => {
            setSlugTouched(true);
            setSlug(slugify(event.target.value));
          }}
        />
      </label>
      <label>
        Excerpt
        <textarea
          name="excerpt"
          rows={2}
          value={excerpt}
          onChange={(event) => setExcerpt(event.target.value)}
        />
      </label>

      <fieldset className="admin-fieldset">
        <legend>Topics</legend>
        <p className="admin-muted">Used on the public blog so readers can search by interest.</p>
        <div className="admin-topic-chips">
          {topics.map((topic) => (
            <button
              key={topic}
              type="button"
              className="admin-topic-chip"
              onClick={() => setTopics((current) => current.filter((item) => item !== topic))}
            >
              {topic} ×
            </button>
          ))}
        </div>
        <div className="admin-topic-suggest">
          {SUGGESTED_TOPICS.map((topic) => (
            <button key={topic} type="button" onClick={() => addTopic(topic)}>
              {topic}
            </button>
          ))}
        </div>
        <label>
          Add topic
          <input
            type="text"
            maxLength={32}
            onKeyDown={(event) => {
              if (event.key !== "Enter") return;
              event.preventDefault();
              addTopic(event.currentTarget.value);
              event.currentTarget.value = "";
            }}
            placeholder="Type a topic and press Enter"
          />
        </label>
      </fieldset>

      <div className="admin-toolbar" role="toolbar" aria-label="Markdown shortcuts">
        <button type="button" onClick={() => insertAtCursor("\n\n## Heading\n\n")}>
          Heading
        </button>
        <button type="button" onClick={() => wrapSelection("**", "**", "bold")}>
          Bold
        </button>
        <button type="button" onClick={() => insertAtCursor("\n- Point\n")}>
          List
        </button>
        <button
          type="button"
          onClick={() => insertAtCursor("\n\n```mermaid\nflowchart LR\n  A[Start] --> B[Outcome]\n```\n\n")}
        >
          Mermaid
        </button>
        {cloudinaryEnabled ? (
          <button type="button" onClick={() => fileRef.current?.click()}>
            Upload media
          </button>
        ) : (
          <button type="button" onClick={() => insertAtCursor("\n\n![Caption](https://example.com/diagram.png)\n\n")}>
            Image URL
          </button>
        )}
        <input
          ref={fileRef}
          type="file"
          hidden
          accept="image/jpeg,image/png,image/webp,image/gif,video/mp4,video/webm,application/pdf"
          onChange={onPickFile}
        />
      </div>
      {uploadStatus ? <p className="admin-muted">{uploadStatus}</p> : null}
      {!cloudinaryEnabled ? (
        <p className="admin-muted">
          Set Cloudinary env vars to upload images, video, and PDFs from this editor.
        </p>
      ) : null}

      <div className="admin-editor-split">
        <label className="admin-editor-write">
          Body (Markdown)
          <textarea
            ref={bodyRef}
            name="body"
            rows={22}
            value={body}
            required
            onChange={(event) => setBody(event.target.value)}
          />
          <span className="admin-muted">{wordCount} words</span>
        </label>
        <section className="admin-preview" aria-label="Preview">
          <h2>Preview</h2>
          {previewParts.length === 0 ? <p className="admin-muted">Start writing to preview.</p> : null}
          {previewParts.map((part, index) =>
            part.type === "mermaid" ? (
              <pre key={index} className="admin-mermaid-preview">
                {part.content}
              </pre>
            ) : (
              <div
                key={index}
                className="admin-md-preview"
                dangerouslySetInnerHTML={{ __html: renderSimpleMarkdown(part.content) }}
              />
            ),
          )}
        </section>
      </div>

      <div className="admin-editor-actions">
        {isPublished ? (
          <>
            <button type="submit" name="intent" value="save">
              Save changes
            </button>
            <button type="submit" name="intent" value="unpublish" className="admin-btn-secondary">
              Unpublish to draft
            </button>
          </>
        ) : (
          <>
            <button type="submit" name="intent" value="draft" className="admin-btn-secondary">
              Save draft
            </button>
            <button type="submit" name="intent" value="publish">
              Publish
            </button>
          </>
        )}
      </div>
    </form>
  );
}
