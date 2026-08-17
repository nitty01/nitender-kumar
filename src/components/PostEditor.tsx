"use client";

import { useMemo, useRef, useState } from "react";
import { savePostAction, uploadMediaAction } from "@/app/admin/actions";
import { renderSimpleMarkdown, splitMarkdownWithMermaid } from "@/lib/markdown";

type PostFormProps = {
  cloudinaryEnabled?: boolean;
  post?: {
    id: string;
    slug: string;
    title: string;
    excerpt: string | null;
    body: string;
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

export function PostEditor({ post, cloudinaryEnabled = false }: PostFormProps) {
  const [title, setTitle] = useState(post?.title ?? "");
  const [slug, setSlug] = useState(post?.slug ?? "");
  const [excerpt, setExcerpt] = useState(post?.excerpt ?? "");
  const [body, setBody] = useState(post?.body ?? "");
  const [slugTouched, setSlugTouched] = useState(Boolean(post?.slug));
  const [uploadStatus, setUploadStatus] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const previewParts = useMemo(() => splitMarkdownWithMermaid(body), [body]);

  function insertMermaid() {
    const block = `\n\n\`\`\`mermaid\nflowchart LR\n  A[Start] --> B[Outcome]\n\`\`\`\n\n`;
    setBody((current) => `${current.trimEnd()}${block}`);
  }

  function insertImageUrl() {
    const block = `\n\n![Caption](https://example.com/diagram.png)\n\n`;
    setBody((current) => `${current.trimEnd()}${block}`);
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
    setBody((current) => `${current.trimEnd()}${block}`);
    setUploadStatus("Uploaded to Cloudinary.");
  }

  return (
    <form action={savePostAction} className="admin-editor">
      {post?.id ? <input type="hidden" name="id" value={post.id} /> : null}
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
        Slug
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
        <textarea name="excerpt" rows={2} value={excerpt} onChange={(e) => setExcerpt(e.target.value)} />
      </label>
      <div className="admin-toolbar">
        <button type="button" onClick={insertMermaid}>
          Insert Mermaid diagram
        </button>
        {cloudinaryEnabled ? (
          <button type="button" onClick={() => fileRef.current?.click()}>
            Upload media
          </button>
        ) : (
          <button type="button" onClick={insertImageUrl}>
            Insert image URL
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
          Set <code>CLOUDINARY_CLOUD_NAME</code>, <code>CLOUDINARY_API_KEY</code>, and{" "}
          <code>CLOUDINARY_API_SECRET</code> to upload images and video from here.
        </p>
      ) : null}
      <label>
        Body (Markdown + mermaid fences)
        <textarea
          name="body"
          rows={18}
          value={body}
          required
          onChange={(event) => setBody(event.target.value)}
        />
      </label>
      <div className="admin-checks">
        <label>
          <input type="checkbox" name="published" defaultChecked={post?.published ?? true} />
          Published (visible on site)
        </label>
        <label>
          <input type="checkbox" name="archived" defaultChecked={post?.archived ?? false} />
          Archived (hidden from site)
        </label>
      </div>
      <button type="submit">Save note</button>

      <section className="admin-preview">
        <h2>Preview</h2>
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
    </form>
  );
}
