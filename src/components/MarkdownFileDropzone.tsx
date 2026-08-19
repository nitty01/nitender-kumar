"use client";

import { useRef, useState } from "react";

export const MARKDOWN_FILE_ACCEPT = ".md,.markdown,.txt,text/markdown,text/plain";
export const MARKDOWN_FILE_MAX_BYTES = 1_000_000;

type MarkdownFileDropzoneProps = {
  filename?: string;
  busy?: boolean;
  compact?: boolean;
  onFile: (text: string, name: string) => void | Promise<void>;
  onError?: (message: string) => void;
};

function isMarkdownFile(file: File) {
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
  if (["md", "markdown", "txt"].includes(ext)) return true;
  return file.type.startsWith("text/");
}

export function MarkdownFileDropzone({
  filename,
  busy = false,
  compact = false,
  onFile,
  onError,
}: MarkdownFileDropzoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const dragDepth = useRef(0);
  const [dragging, setDragging] = useState(false);
  const [reading, setReading] = useState(false);

  async function ingest(file: File) {
    if (busy || reading) return;
    if (file.size > MARKDOWN_FILE_MAX_BYTES) {
      onError?.("File is larger than 1 MB.");
      return;
    }
    if (!isMarkdownFile(file)) {
      onError?.("Use a .md, .markdown, or .txt file.");
      return;
    }
    setReading(true);
    try {
      await onFile(await file.text(), file.name);
    } finally {
      setReading(false);
    }
  }

  function openPicker() {
    if (busy || reading) return;
    inputRef.current?.click();
  }

  function onDragEnter(event: React.DragEvent<HTMLElement>) {
    event.preventDefault();
    dragDepth.current += 1;
    setDragging(true);
  }

  function onDragLeave(event: React.DragEvent<HTMLElement>) {
    event.preventDefault();
    dragDepth.current = Math.max(0, dragDepth.current - 1);
    if (dragDepth.current === 0) setDragging(false);
  }

  function onDragOver(event: React.DragEvent<HTMLElement>) {
    event.preventDefault();
  }

  async function onDrop(event: React.DragEvent<HTMLElement>) {
    event.preventDefault();
    dragDepth.current = 0;
    setDragging(false);
    const file = event.dataTransfer.files?.[0];
    if (file) await ingest(file);
  }

  const active = dragging || reading;
  const className = [
    "admin-import-drop",
    compact ? "admin-import-drop-compact" : "",
    active ? "is-active" : "",
    reading ? "is-busy" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <section
      className={className}
      aria-label="Upload markdown file"
      onDragEnter={onDragEnter}
      onDragLeave={onDragLeave}
      onDragOver={onDragOver}
      onDrop={(event) => void onDrop(event)}
      onClick={openPicker}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          openPicker();
        }
      }}
      role="button"
      tabIndex={0}
    >
      <input
        ref={inputRef}
        type="file"
        hidden
        accept={MARKDOWN_FILE_ACCEPT}
        onClick={(event) => event.stopPropagation()}
        onChange={(event) => {
          const file = event.target.files?.[0];
          event.target.value = "";
          if (file) void ingest(file);
        }}
      />
      <p className="admin-import-drop-title">
        {reading ? "Reading file…" : "Drop markdown here"}
      </p>
      <p className="admin-muted">
        {reading
          ? "Parsing will start automatically."
          : "Drag a .md, .markdown, or .txt file — or click to browse."}
      </p>
      {!compact ? (
        <button
          type="button"
          className="admin-btn"
          onClick={(event) => {
            event.stopPropagation();
            openPicker();
          }}
          disabled={busy || reading}
        >
          Choose file
        </button>
      ) : null}
      {filename ? <p className="admin-import-drop-file">{filename}</p> : null}
    </section>
  );
}
