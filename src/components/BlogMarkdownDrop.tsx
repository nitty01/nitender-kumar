"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { MarkdownFileDropzone } from "@/components/MarkdownFileDropzone";

const PENDING_KEY = "blog-import-pending";

export function BlogMarkdownDrop() {
  const router = useRouter();
  const [status, setStatus] = useState("");

  async function onFile(text: string, name: string) {
    sessionStorage.setItem(PENDING_KEY, JSON.stringify({ name, text }));
    router.push("/admin/blog/import");
  }

  return (
    <div className="admin-import-drop-wrap">
      <MarkdownFileDropzone compact onFile={onFile} onError={setStatus} />
      {status ? <p className="admin-warn">{status}</p> : null}
    </div>
  );
}

export function readPendingMarkdownImport():
  | {
      name: string;
      text: string;
    }
  | null {
  if (typeof window === "undefined") return null;
  const raw = sessionStorage.getItem(PENDING_KEY);
  if (!raw) return null;
  sessionStorage.removeItem(PENDING_KEY);
  try {
    const parsed = JSON.parse(raw) as { name?: string; text?: string };
    if (!parsed.text?.trim()) return null;
    return { name: parsed.name || "uploaded.md", text: parsed.text };
  } catch {
    return null;
  }
}
