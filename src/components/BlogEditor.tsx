"use client";

import { useEffect, useRef, useState } from "react";
import { persistPostAction, tagMediaAction, uploadMediaAction } from "@/app/admin/actions";
import { BlogArticle } from "@/components/BlogArticle";
import { MediaCatalogue } from "@/components/MediaCatalogue";
import { UnparsedBlockFields } from "@/components/UnparsedBlockFields";
import {
  DRAWIO_TEMPLATE,
  blocksToPlaintext,
  countUnparsed,
  emptyBlock,
  replaceBlockById,
  type ArticleLayout,
  type BlogBlock,
} from "@/lib/blog-blocks";
import type { CloudinaryMedia } from "@/lib/blog-media";
import { exportDiagramBlocks } from "@/lib/export-blog-diagrams";

const SUGGESTED_TOPICS = [
  "Platform",
  "Data Engineering",
  "GenAI",
  "Leadership",
  "Architecture",
  "Cost",
];

const ADD_TYPES: { type: BlogBlock["type"]; label: string }[] = [
  { type: "heading", label: "Heading" },
  { type: "paragraph", label: "Text" },
  { type: "quote", label: "Quote" },
  { type: "pullquote", label: "Pull quote" },
  { type: "list", label: "List" },
  { type: "image", label: "Image" },
  { type: "mermaid", label: "Mermaid" },
  { type: "drawio", label: "Draw.io" },
  { type: "split", label: "Half / half" },
  { type: "divider", label: "Break" },
];

type InsertPoint = { at: number; splitId?: string; side?: "left" | "right" };

type BlogEditorProps = {
  cloudinaryEnabled?: boolean;
  saved?: string;
  post?: {
    id: string;
    slug: string;
    title: string;
    excerpt: string | null;
    blocks: BlogBlock[];
    heroUrl: string | null;
    layout?: ArticleLayout;
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

function pendingDiagramExports(blocks: BlogBlock[]): number {
  return blocks.reduce((sum, block) => {
    if (block.type === "split") {
      return sum + pendingDiagramExports(block.left) + pendingDiagramExports(block.right);
    }
    if ((block.type === "mermaid" || block.type === "drawio") && !block.exportUrl) return sum + 1;
    return sum;
  }, 0);
}

function statusLabel(published: boolean, archived?: boolean, isNew?: boolean) {
  if (isNew && !published) return "New draft";
  if (archived) return "Archived";
  return published ? "Published" : "Draft";
}

function AddBar({
  onAdd,
  onLibrary,
  allowSplit = true,
}: {
  onAdd: (type: BlogBlock["type"]) => void;
  onLibrary?: () => void;
  allowSplit?: boolean;
}) {
  return (
    <div className="admin-addbar" role="group" aria-label="Add block">
      {ADD_TYPES.filter((item) => allowSplit || item.type !== "split").map((item) => (
        <button key={item.type} type="button" onClick={() => onAdd(item.type)}>
          {item.label}
        </button>
      ))}
      {onLibrary ? (
        <button type="button" onClick={onLibrary}>
          Library
        </button>
      ) : null}
    </div>
  );
}

export function BlogEditor({ post, cloudinaryEnabled = false, saved }: BlogEditorProps) {
  const [postId, setPostId] = useState(post?.id);
  const [title, setTitle] = useState(post?.title ?? "");
  const [slug, setSlug] = useState(post?.slug ?? "");
  const [excerpt, setExcerpt] = useState(post?.excerpt ?? "");
  const [heroUrl, setHeroUrl] = useState(post?.heroUrl ?? "");
  const [layout, setLayout] = useState<ArticleLayout>(post?.layout ?? "flow");
  const [blocks, setBlocks] = useState<BlogBlock[]>(
    post?.blocks?.length ? post.blocks : [emptyBlock("paragraph")],
  );
  const [topics, setTopics] = useState(post?.topics ?? []);
  const [slugTouched, setSlugTouched] = useState(Boolean(post?.slug));
  const [uploadStatus, setUploadStatus] = useState("");
  const [persistStatus, setPersistStatus] = useState(post?.id ? "Saved" : "Unsaved draft");
  const [busy, setBusy] = useState(false);
  const [catalogueOpen, setCatalogueOpen] = useState(false);
  const [published, setPublished] = useState(Boolean(post?.published && !post?.archived));
  const imageRef = useRef<HTMLInputElement>(null);
  const drawioRef = useRef<HTMLInputElement>(null);
  const insertAt = useRef<InsertPoint>({ at: blocks.length });
  const catalogueTarget = useRef<"insert" | "hero" | string>("insert");
  const dirtyRef = useRef(false);
  const savingRef = useRef(false);
  const busyRef = useRef(false);
  const hydratedRef = useRef(false);
  const savedSnapRef = useRef("");
  const snapshotRef = useRef({
    postId,
    title,
    slug,
    excerpt,
    heroUrl,
    layout,
    blocks,
    topics,
    published,
  });
  snapshotRef.current = {
    postId,
    title,
    slug,
    excerpt,
    heroUrl,
    layout,
    blocks,
    topics,
    published,
  };
  busyRef.current = busy;
  const isPublished = published;
  const bodyText = blocksToPlaintext(blocks);
  const leftover = countUnparsed(blocks);

  function editorSnapshot(data = snapshotRef.current) {
    return JSON.stringify({
      title: data.title,
      slug: data.slug,
      excerpt: data.excerpt,
      heroUrl: data.heroUrl,
      layout: data.layout,
      blocks: data.blocks,
      topics: data.topics,
    });
  }

  useEffect(() => {
    if (!hydratedRef.current) {
      hydratedRef.current = true;
      savedSnapRef.current = editorSnapshot();
      return;
    }
    if (editorSnapshot() === savedSnapRef.current) return;
    dirtyRef.current = true;
    setPersistStatus("Unsaved changes");
  }, [title, slug, excerpt, heroUrl, layout, blocks, topics]);

  async function persistCurrent(publishedOverride?: boolean) {
    const snap = snapshotRef.current;
    savingRef.current = true;
    setPersistStatus("Saving…");
    const result = await persistPostAction({
      id: snap.postId,
      slug: snap.slug,
      title: snap.title,
      excerpt: snap.excerpt,
      blocks: snap.blocks,
      heroUrl: snap.heroUrl || null,
      layout: snap.layout,
      topics: snap.topics,
      published: publishedOverride,
    });
    savingRef.current = false;
    if (!result.ok) {
      setPersistStatus(result.error);
      return result;
    }
    dirtyRef.current = false;
    setPostId(result.id);
    setPublished(result.published);
    if (!snap.slug) setSlug(result.slug);
    if (!snap.title.trim()) setTitle(result.title);
    snapshotRef.current = {
      ...snap,
      postId: result.id,
      slug: result.slug,
      title: result.title,
      published: result.published,
    };
    savedSnapRef.current = JSON.stringify({
      title: result.title,
      slug: result.slug,
      excerpt: snap.excerpt,
      heroUrl: snap.heroUrl,
      layout: snap.layout,
      blocks: snap.blocks,
      topics: snap.topics,
    });
    if (!snap.postId && result.id && window.location.pathname.endsWith("/admin/blog/new")) {
      window.history.replaceState(null, "", `/admin/blog/${result.id}`);
    }
    const time = new Date(result.savedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    setPersistStatus(`Saved ${time}`);
    return result;
  }

  useEffect(() => {
    const timer = window.setInterval(() => {
      if (!dirtyRef.current || savingRef.current || busyRef.current) return;
      void persistCurrent();
    }, 30000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    function onLeave(event: BeforeUnloadEvent) {
      if (!dirtyRef.current) return;
      event.preventDefault();
      event.returnValue = "";
    }
    function onHide() {
      if (document.visibilityState === "hidden" && dirtyRef.current && !savingRef.current) {
        void persistCurrent();
      }
    }
    window.addEventListener("beforeunload", onLeave);
    document.addEventListener("visibilitychange", onHide);
    return () => {
      window.removeEventListener("beforeunload", onLeave);
      document.removeEventListener("visibilitychange", onHide);
    };
  }, []);

  function insert(block: BlogBlock, point = insertAt.current) {
    setBlocks((current) => {
      if (!point.splitId) {
        const next = [...current];
        next.splice(point.at, 0, block);
        return next;
      }
      return current.map((item) => {
        if (item.id !== point.splitId || item.type !== "split") return item;
        const column = point.side === "right" ? [...item.right] : [...item.left];
        column.splice(point.at, 0, block);
        return point.side === "right" ? { ...item, right: column } : { ...item, left: column };
      });
    });
  }

  function insertType(type: BlogBlock["type"], point: InsertPoint) {
    if (type === "image") {
      insertAt.current = point;
      imageRef.current?.click();
      return;
    }
    insert(emptyBlock(type), point);
  }

  function patchBlock(id: string, next: BlogBlock) {
    setBlocks((current) => current.map((block) => (block.id === id ? next : block)));
  }

  function patchColumn(
    splitId: string,
    side: "left" | "right",
    updater: (column: BlogBlock[]) => BlogBlock[],
  ) {
    setBlocks((current) =>
      current.map((item) => {
        if (item.id !== splitId || item.type !== "split") return item;
        return side === "right"
          ? { ...item, right: updater(item.right) }
          : { ...item, left: updater(item.left) };
      }),
    );
  }

  function move(index: number, dir: -1 | 1) {
    setBlocks((current) => {
      const target = index + dir;
      if (target < 0 || target >= current.length) return current;
      const next = [...current];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  }

  function remove(id: string) {
    setBlocks((current) => (current.length === 1 ? current : current.filter((block) => block.id !== id)));
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

  function openLibrary(point: InsertPoint, target: "insert" | "hero" | string = "insert") {
    insertAt.current = point;
    catalogueTarget.current = target;
    setCatalogueOpen(true);
  }

  async function insertUploadedImage(file: File, point: InsertPoint) {
    if (!cloudinaryEnabled) {
      setUploadStatus("Cloudinary is not set.");
      return;
    }
    setUploadStatus(`Uploading ${file.name}…`);
    const data = new FormData();
    data.set("file", file);
    data.set("kind", "image");
    data.set("slug", slug || "draft");
    data.set("topics", topics.join(","));
    const result = await uploadMediaAction(data);
    if (!result.ok) {
      setUploadStatus(result.error);
      return;
    }
    const alt = file.name.replace(/\.[^.]+$/, "").replace(/[-_]+/g, " ");
    const block = emptyBlock("image") as Extract<BlogBlock, { type: "image" }>;
    block.url = result.url;
    block.alt = alt;
    block.caption = alt;
    block.publicId = result.publicId;
    insert(block, point);
    if (!heroUrl) setHeroUrl(result.url);
    setUploadStatus("Image block added.");
  }

  async function onPickImage(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (file) await insertUploadedImage(file, insertAt.current);
  }

  async function onPickDrawio(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
    if (["png", "jpg", "jpeg", "webp", "svg", "gif"].includes(ext)) {
      await insertUploadedImage(file, insertAt.current);
      return;
    }
    const xml = (await file.text()).trim() || DRAWIO_TEMPLATE;
    const block = emptyBlock("drawio") as Extract<BlogBlock, { type: "drawio" }>;
    block.source = xml;
    block.format = "xml";
    insert(block, insertAt.current);
    setUploadStatus("Draw.io block added.");
  }

  async function onPickAsset(asset: CloudinaryMedia) {
    const target = catalogueTarget.current;
    if (asset.publicId) {
      await tagMediaAction(asset.publicId, slug || "draft", topics);
    }
    if (target === "hero") {
      setHeroUrl(asset.url);
      setCatalogueOpen(false);
      setUploadStatus("Hero image set from catalogue.");
      return;
    }
    if (target !== "insert") {
      setBlocks((current) =>
        current.map((block) => {
          if (block.id !== target) return block;
          if (block.type === "image") {
            return { ...block, url: asset.url, publicId: asset.publicId };
          }
          if (block.type === "mermaid" || block.type === "drawio") {
            return { ...block, exportUrl: asset.url, publicId: asset.publicId };
          }
          return block;
        }),
      );
      setCatalogueOpen(false);
      setUploadStatus("Attached catalogue image to the block.");
      return;
    }
    const alt = asset.context.alt || asset.publicId.split("/").pop()?.replace(/[-_]+/g, " ") || "Diagram";
    const block = emptyBlock("image") as Extract<BlogBlock, { type: "image" }>;
    block.url = asset.url;
    block.publicId = asset.publicId;
    block.alt = alt;
    block.caption = alt;
    insert(block, insertAt.current);
    if (!heroUrl) setHeroUrl(asset.url);
    setCatalogueOpen(false);
    setUploadStatus("Inserted from catalogue.");
  }

  async function exportNow() {
    if (!cloudinaryEnabled) {
      setUploadStatus("Cloudinary is not set.");
      await persistCurrent();
      return;
    }
    setBusy(true);
    setUploadStatus("Exporting diagrams to Cloudinary…");
    try {
      await persistCurrent();
      const { blocks: next, errors } = await exportDiagramBlocks(
        snapshotRef.current.blocks,
        snapshotRef.current.slug || "draft",
        snapshotRef.current.topics,
      );
      setBlocks(next);
      snapshotRef.current = { ...snapshotRef.current, blocks: next };
      const leftover = pendingDiagramExports(next);
      await persistCurrent();
      if (errors.length) {
        setUploadStatus(`Draft saved. ${errors.join(" ")}`);
      } else if (leftover) {
        setUploadStatus(
          `Draft saved. ${leftover} diagram${leftover === 1 ? "" : "s"} still need a PNG.`,
        );
      } else {
        setUploadStatus("Diagram PNGs saved to Cloudinary.");
      }
    } catch (error) {
      await persistCurrent();
      setUploadStatus(
        `Draft saved. ${error instanceof Error ? error.message : "Export failed."}`,
      );
    } finally {
      setBusy(false);
    }
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const submitter = (event.nativeEvent as SubmitEvent).submitter as HTMLButtonElement | null;
    const intent = submitter?.value || "draft";
    setBusy(true);
    try {
      if (intent === "unpublish") {
        await persistCurrent(false);
        setUploadStatus("Unpublished. Draft is still saved.");
        return;
      }
      if (intent === "draft") {
        await persistCurrent(false);
        setUploadStatus("Draft saved. Not visible on the public site.");
        return;
      }

      await persistCurrent(isPublished);
      let nextBlocks = snapshotRef.current.blocks;
      let exportErrors: string[] = [];
      if (cloudinaryEnabled) {
        setUploadStatus("Saving draft, then exporting diagrams…");
        const exported = await exportDiagramBlocks(
          nextBlocks,
          snapshotRef.current.slug || "draft",
          snapshotRef.current.topics,
        );
        nextBlocks = exported.blocks;
        exportErrors = exported.errors;
        setBlocks(nextBlocks);
        snapshotRef.current = { ...snapshotRef.current, blocks: nextBlocks };
      }

      const publish = intent === "publish" || intent === "save";
      const leftover = countUnparsed(nextBlocks);
      if (publish && leftover) {
        await persistCurrent(false);
        setUploadStatus(
          `${leftover} leftover snippet${leftover === 1 ? "" : "s"} still need a block type. Draft saved; convert them before publishing.`,
        );
        return;
      }

      await persistCurrent(publish);
      if (exportErrors.length) {
        setUploadStatus(
          `Saved${publish ? " and published" : ""}. Fix remaining diagram errors: ${exportErrors.join(" ")}`,
        );
      } else {
        setUploadStatus(publish ? "Published to /blog." : "Saved.");
      }
    } catch (error) {
      await persistCurrent();
      setUploadStatus(error instanceof Error ? error.message : "Save failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
    <form onSubmit={handleSubmit} className="admin-editor">
      {postId ? <input type="hidden" name="id" value={postId} /> : null}
      <input type="hidden" name="topics" value={topics.join(", ")} />
      <input type="hidden" name="blocks" value={JSON.stringify(blocks)} />
      <input type="hidden" name="hero_url" value={heroUrl} />
      <input type="hidden" name="layout" value={layout} />

      <div className="admin-editor-meta">
        <p className={`admin-status admin-status-${isPublished ? "live" : "draft"}`}>
          {statusLabel(isPublished, post?.archived, !postId)}
        </p>
        <p className="admin-save-status">{persistStatus}</p>
        {saved === "draft" ? <p className="admin-ok">Draft saved. Not visible on the public site.</p> : null}
        {saved === "published" ? <p className="admin-ok">Published to /blog.</p> : null}
        {saved === "unparsed" ? (
          <p className="admin-warn">Convert leftover snippets before publishing.</p>
        ) : null}
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
        Dek / excerpt
        <textarea
          name="excerpt"
          rows={2}
          value={excerpt}
          onChange={(event) => setExcerpt(event.target.value)}
        />
      </label>
      <label>
        Hero image URL
        <input
          value={heroUrl}
          onChange={(event) => setHeroUrl(event.target.value)}
          placeholder="Optional lead image for the index and article"
        />
      </label>
      <p>
        <button
          type="button"
          className="admin-btn-secondary"
          onClick={() => openLibrary({ at: blocks.length }, "hero")}
        >
          Choose hero from catalogue
        </button>
      </p>

      <fieldset className="admin-fieldset">
        <legend>Page layout</legend>
        <label>
          <input
            type="radio"
            name="layout_choice"
            checked={layout === "flow"}
            onChange={() => setLayout("flow")}
          />
          Single column flow
        </label>
        <label>
          <input
            type="radio"
            name="layout_choice"
            checked={layout === "newspaper"}
            onChange={() => setLayout("newspaper")}
          />
          Newspaper — half / half
        </label>
        <p className="admin-muted">
          Flow stacks every block. Newspaper splits the story into two columns. Use a Half / half
          block to pair text with a diagram inside either layout.
        </p>
      </fieldset>

      <fieldset className="admin-fieldset">
        <legend>Topics</legend>
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

      <div className="admin-editor-split">
        <section className="admin-canvas" aria-label="Story canvas">
          <h2>Story blocks</h2>
          <p className="admin-muted">
            Add a line item, then move it up or down. Publish exports Mermaid and Draw.io as PNGs
            to Cloudinary.
          </p>
          {leftover ? (
            <p className="admin-warn">
              {leftover} leftover snippet{leftover === 1 ? "" : "s"} from import still need a block
              type. Convert them before publishing.
            </p>
          ) : null}
          <AddBar
            onAdd={(type) => insertType(type, { at: blocks.length })}
            onLibrary={() => openLibrary({ at: blocks.length })}
          />
          <input
            ref={imageRef}
            type="file"
            hidden
            accept="image/jpeg,image/png,image/webp,image/gif,image/svg+xml"
            onChange={onPickImage}
          />
          <input
            ref={drawioRef}
            type="file"
            hidden
            accept=".drawio,.dio,.xml,image/svg+xml,image/png"
            onChange={onPickDrawio}
          />
          {uploadStatus ? <p className="admin-muted">{uploadStatus}</p> : null}

          <ol className="admin-block-list">
            {blocks.map((block, index) => (
              <li
                key={block.id}
                className={block.type === "unparsed" ? "admin-block admin-block-unparsed" : "admin-block"}
              >
                <div className="admin-block-bar">
                  <span>
                    {block.type === "split"
                      ? "half / half"
                      : block.type === "unparsed"
                        ? "needs review"
                        : block.type}
                  </span>
                  <button type="button" onClick={() => move(index, -1)} disabled={index === 0}>
                    Up
                  </button>
                  <button
                    type="button"
                    onClick={() => move(index, 1)}
                    disabled={index === blocks.length - 1}
                  >
                    Down
                  </button>
                  <button type="button" className="admin-danger" onClick={() => remove(block.id)}>
                    Delete
                  </button>
                </div>
                {block.type === "split" ? (
                  <div className="admin-split-edit">
                    {(["left", "right"] as const).map((side) => (
                      <div key={side} className="admin-split-col">
                        <p className="admin-muted">{side === "left" ? "Left" : "Right"}</p>
                        {block[side].map((child, childIndex) => (
                          <div
                            key={child.id}
                            className={
                              child.type === "unparsed"
                                ? "admin-block admin-block-nested admin-block-unparsed"
                                : "admin-block admin-block-nested"
                            }
                          >
                            <div className="admin-block-bar">
                              <span>{child.type === "unparsed" ? "needs review" : child.type}</span>
                              <button
                                type="button"
                                onClick={() =>
                                  patchColumn(block.id, side, (column) => {
                                    if (childIndex === 0) return column;
                                    const next = [...column];
                                    [next[childIndex - 1], next[childIndex]] = [
                                      next[childIndex],
                                      next[childIndex - 1],
                                    ];
                                    return next;
                                  })
                                }
                                disabled={childIndex === 0}
                              >
                                Up
                              </button>
                              <button
                                type="button"
                                onClick={() =>
                                  patchColumn(block.id, side, (column) => {
                                    if (childIndex >= column.length - 1) return column;
                                    const next = [...column];
                                    [next[childIndex + 1], next[childIndex]] = [
                                      next[childIndex],
                                      next[childIndex + 1],
                                    ];
                                    return next;
                                  })
                                }
                                disabled={childIndex === block[side].length - 1}
                              >
                                Down
                              </button>
                              <button
                                type="button"
                                className="admin-danger"
                                onClick={() =>
                                  patchColumn(block.id, side, (column) =>
                                    column.length === 1
                                      ? column
                                      : column.filter((item) => item.id !== child.id),
                                  )
                                }
                              >
                                Delete
                              </button>
                            </div>
                            <BlockFields
                              block={child}
                              onChange={(next) =>
                                patchColumn(block.id, side, (column) =>
                                  column.map((item) => (item.id === child.id ? next : item)),
                                )
                              }
                              onReplace={(next) =>
                                patchColumn(block.id, side, (column) =>
                                  replaceBlockById(column, child.id, next),
                                )
                              }
                              onHero={(url) => setHeroUrl(url)}
                              onLibrary={() => openLibrary({ at: childIndex + 1, splitId: block.id, side }, child.id)}
                              onUploadDiagram={() => {
                                insertAt.current = { at: childIndex + 1, splitId: block.id, side };
                                drawioRef.current?.click();
                              }}
                            />
                          </div>
                        ))}
                        <AddBar
                          allowSplit={false}
                          onAdd={(type) =>
                            insertType(type, { at: block[side].length, splitId: block.id, side })
                          }
                          onLibrary={() =>
                            openLibrary({ at: block[side].length, splitId: block.id, side })
                          }
                        />
                      </div>
                    ))}
                  </div>
                ) : (
                  <BlockFields
                    block={block}
                    onChange={(next) => patchBlock(block.id, next)}
                    onReplace={(next) => setBlocks((current) => replaceBlockById(current, block.id, next))}
                    onHero={(url) => setHeroUrl(url)}
                    onLibrary={() => openLibrary({ at: index + 1 }, block.id)}
                    onUploadDiagram={() => {
                      insertAt.current = { at: index + 1 };
                      drawioRef.current?.click();
                    }}
                  />
                )}
                <AddBar
                  onAdd={(type) => insertType(type, { at: index + 1 })}
                  onLibrary={() => openLibrary({ at: index + 1 })}
                />
              </li>
            ))}
          </ol>
        </section>

        <section className="admin-preview" aria-label="Preview">
          <h2>Live article</h2>
          <div className="admin-preview-frame">
            <BlogArticle
              title={title}
              excerpt={excerpt}
              date={new Date().toISOString().slice(0, 10)}
              topics={topics}
              heroUrl={heroUrl || null}
              layout={layout}
              blocks={blocks}
              bodyText={bodyText}
              showChrome
              liveDiagrams
            />
          </div>
        </section>
      </div>

      <div className="admin-editor-actions">
        <button type="button" className="admin-btn-secondary" onClick={() => void exportNow()} disabled={busy}>
          Export diagrams
        </button>
        {isPublished ? (
          <>
            <button type="submit" name="intent" value="save" disabled={busy}>
              Save changes
            </button>
            <button type="submit" name="intent" value="unpublish" className="admin-btn-secondary" disabled={busy}>
              Unpublish to draft
            </button>
          </>
        ) : (
          <>
            <button type="submit" name="intent" value="draft" className="admin-btn-secondary" disabled={busy}>
              Save draft
            </button>
            <button type="submit" name="intent" value="publish" disabled={busy}>
              Publish
            </button>
          </>
        )}
      </div>
    </form>
    <MediaCatalogue
      open={catalogueOpen}
      onClose={() => setCatalogueOpen(false)}
      onPick={(asset) => void onPickAsset(asset)}
    />
    </>
  );
}

function BlockFields({
  block,
  onChange,
  onReplace,
  onHero,
  onLibrary,
  onUploadDiagram,
}: {
  block: BlogBlock;
  onChange: (block: BlogBlock) => void;
  onReplace?: (blocks: BlogBlock[]) => void;
  onHero: (url: string) => void;
  onLibrary: () => void;
  onUploadDiagram: () => void;
}) {
  if (block.type === "heading") {
    return (
      <div className="admin-block-fields">
        <label>
          Level
          <select
            value={block.level}
            onChange={(event) =>
              onChange({ ...block, level: event.target.value === "3" ? 3 : 2 })
            }
          >
            <option value="2">Section (H2)</option>
            <option value="3">Subsection (H3)</option>
          </select>
        </label>
        <label>
          Heading
          <input
            value={block.text}
            onChange={(event) => onChange({ ...block, text: event.target.value })}
          />
        </label>
      </div>
    );
  }
  if (block.type === "paragraph" || block.type === "pullquote") {
    return (
      <label>
        {block.type === "pullquote" ? "Pull quote" : "Text"}
        <textarea
          rows={block.type === "pullquote" ? 3 : 6}
          value={block.text}
          onChange={(event) => onChange({ ...block, text: event.target.value })}
        />
      </label>
    );
  }
  if (block.type === "quote") {
    return (
      <div className="admin-block-fields">
        <label>
          Quote
          <textarea
            rows={4}
            value={block.text}
            onChange={(event) => onChange({ ...block, text: event.target.value })}
          />
        </label>
        <label>
          Attribution
          <input
            value={block.cite ?? ""}
            onChange={(event) => onChange({ ...block, cite: event.target.value })}
          />
        </label>
      </div>
    );
  }
  if (block.type === "list") {
    return (
      <div className="admin-block-fields">
        <label>
          <input
            type="checkbox"
            checked={block.ordered}
            onChange={(event) => onChange({ ...block, ordered: event.target.checked })}
          />
          Numbered list
        </label>
        <label>
          Items (one per line)
          <textarea
            rows={5}
            value={block.items.join("\n")}
            onChange={(event) =>
              onChange({ ...block, items: event.target.value.split("\n") })
            }
          />
        </label>
      </div>
    );
  }
  if (block.type === "image") {
    return (
      <div className="admin-block-fields">
        <label>
          Image URL
          <input
            value={block.url}
            onChange={(event) => onChange({ ...block, url: event.target.value })}
          />
        </label>
        <label>
          Alt text
          <input
            value={block.alt}
            onChange={(event) => onChange({ ...block, alt: event.target.value })}
          />
        </label>
        <label>
          Caption
          <input
            value={block.caption ?? ""}
            onChange={(event) => onChange({ ...block, caption: event.target.value })}
          />
        </label>
        <label>
          Layout
          <select
            value={block.layout}
            onChange={(event) =>
              onChange({ ...block, layout: event.target.value === "wide" ? "wide" : "column" })
            }
          >
            <option value="column">Column</option>
            <option value="wide">Wide</option>
          </select>
        </label>
        <div className="admin-topic-chips">
          <button type="button" onClick={onLibrary}>
            Replace from catalogue
          </button>
          {block.url ? (
            <button type="button" onClick={() => onHero(block.url)}>
              Use as hero
            </button>
          ) : null}
        </div>
      </div>
    );
  }
  if (block.type === "mermaid") {
    return (
      <div className="admin-block-fields">
        <label>
          Mermaid
          <textarea
            rows={8}
            value={block.chart}
            onChange={(event) => onChange({ ...block, chart: event.target.value, exportHash: undefined })}
          />
        </label>
        <label>
          Caption
          <input
            value={block.caption ?? ""}
            onChange={(event) => onChange({ ...block, caption: event.target.value })}
          />
        </label>
        {block.exportUrl ? <p className="admin-ok">PNG ready for publish.</p> : null}
        <button type="button" onClick={onLibrary}>
          Attach PNG from catalogue
        </button>
      </div>
    );
  }
  if (block.type === "drawio") {
    return (
      <div className="admin-block-fields">
        <button type="button" onClick={onUploadDiagram}>
          Replace from .drawio file
        </button>
        <label>
          Draw.io XML or URL
          <textarea
            rows={8}
            value={block.source}
            onChange={(event) =>
              onChange({ ...block, source: event.target.value, exportHash: undefined })
            }
          />
        </label>
        <label>
          Caption
          <input
            value={block.caption ?? ""}
            onChange={(event) => onChange({ ...block, caption: event.target.value })}
          />
        </label>
        {block.exportUrl ? <p className="admin-ok">PNG ready for publish.</p> : null}
        <button type="button" onClick={onLibrary}>
          Attach PNG from catalogue
        </button>
      </div>
    );
  }
  if (block.type === "unparsed") {
    return (
      <UnparsedBlockFields
        block={block}
        onChange={onChange}
        onReplace={(next) => (onReplace ? onReplace(next) : onChange(next[0] ?? block))}
      />
    );
  }
  return <p className="admin-muted">Section break</p>;
}
