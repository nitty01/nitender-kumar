"use client";

import { useEffect, useRef, useState } from "react";
import { searchMediaAction } from "@/app/admin/actions";
import type { CloudinaryMedia } from "@/lib/blog-media";

const FILTERS = [
  { value: "", label: "All" },
  { value: "diagram", label: "Diagrams" },
  { value: "mermaid", label: "Mermaid" },
  { value: "drawio", label: "Draw.io" },
  { value: "image", label: "Images" },
  { value: "blog", label: "Blog" },
];

type MediaCatalogueProps = {
  open: boolean;
  onClose: () => void;
  onPick: (asset: CloudinaryMedia) => void;
};

export function MediaCatalogue({ open, onClose, onPick }: MediaCatalogueProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [query, setQuery] = useState("");
  const [draft, setDraft] = useState("");
  const [tag, setTag] = useState("");
  const [items, setItems] = useState<CloudinaryMedia[]>([]);
  const [status, setStatus] = useState("");

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setStatus("Loading catalogue…");
    void searchMediaAction(query, tag).then((result) => {
      if (cancelled) return;
      if (!result.ok) {
        setItems([]);
        setStatus(result.error);
        return;
      }
      setItems(result.items);
      setStatus(result.items.length ? "" : "No matching diagrams or images.");
    });
    return () => {
      cancelled = true;
    };
  }, [open, query, tag]);

  return (
    <dialog
      ref={dialogRef}
      className="admin-catalogue"
      aria-labelledby="catalogue-title"
      onClose={onClose}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="admin-catalogue-search">
        <h2 id="catalogue-title">Media catalogue</h2>
        <p className="admin-muted">Search Cloudinary assets and inject them into this post. The same image can be reused across posts.</p>
        <label>
          Search
          <input
            type="search"
            value={draft}
            placeholder="Filename, tag, or post slug"
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={(event) => {
              if (event.key !== "Enter") return;
              event.preventDefault();
              setQuery(draft.trim());
            }}
          />
        </label>
        <div className="admin-catalogue-filters" role="group" aria-label="Filter by tag">
          {FILTERS.map((item) => (
            <button
              key={item.label}
              type="button"
              className={tag === item.value ? "is-active" : undefined}
              onClick={() => setTag(item.value)}
            >
              {item.label}
            </button>
          ))}
        </div>
        <div className="admin-catalogue-actions">
          <button type="button" onClick={() => setQuery(draft.trim())}>
            Search
          </button>
          <button type="button" className="admin-btn-secondary" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
      {status ? <p className="admin-muted">{status}</p> : null}
      <ul className="admin-catalogue-grid">
        {items.map((item) => (
          <li key={item.publicId}>
            <button type="button" onClick={() => onPick(item)}>
              <img src={item.thumbUrl} alt="" />
              <span>{item.publicId.split("/").pop()}</span>
              {item.tags.length ? <small>{item.tags.slice(0, 4).join(" · ")}</small> : null}
            </button>
          </li>
        ))}
      </ul>
    </dialog>
  );
}
