"use client";

import { useState } from "react";
import Link from "next/link";
import { BlogIndexPreview } from "@/components/BlogIndexPreview";
import { BlogMarkdownDrop } from "@/components/BlogMarkdownDrop";
import type { BlogPost } from "@/content/blog-posts";

type AdminBlogTab = "manage" | "index";

export function AdminBlogShell({
  previewPosts,
  status,
  children,
}: {
  previewPosts: BlogPost[];
  status?: string;
  children: React.ReactNode;
}) {
  const [tab, setTab] = useState<AdminBlogTab>("manage");

  return (
    <>
      <div className="admin-row">
        <h1>Blog</h1>
        <div className="admin-editor-actions">
          <Link href="/admin/blog/import" className="admin-btn-secondary">
            Upload markdown
          </Link>
          <Link href="/admin/blog/new" className="admin-btn">
            New post
          </Link>
        </div>
      </div>
      <p className="admin-muted">
        Save drafts until the piece is ready, then publish to /blog. Only published posts are
        public.
      </p>

      <div className="admin-view-tabs" role="tablist" aria-label="Blog admin view">
        <button
          type="button"
          role="tab"
          aria-selected={tab === "manage"}
          className={tab === "manage" ? "is-active" : undefined}
          onClick={() => setTab("manage")}
        >
          Manage
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === "index"}
          className={tab === "index" ? "is-active" : undefined}
          onClick={() => setTab("index")}
        >
          Index preview
        </button>
      </div>

      {tab === "manage" ? (
        <div className="admin-tab-panel" role="tabpanel">
          <BlogMarkdownDrop />
          <nav className="admin-filters" aria-label="Filter posts">
            <Link href="/admin/blog" className={!status ? "is-active" : undefined}>
              All
            </Link>
            <Link
              href="/admin/blog?status=draft"
              className={status === "draft" ? "is-active" : undefined}
            >
              Drafts
            </Link>
            <Link
              href="/admin/blog?status=published"
              className={status === "published" ? "is-active" : undefined}
            >
              Published
            </Link>
            <Link
              href="/admin/blog?status=archived"
              className={status === "archived" ? "is-active" : undefined}
            >
              Archived
            </Link>
          </nav>
          {children}
        </div>
      ) : null}

      {tab === "index" ? (
        <section className="admin-tab-panel admin-preview" aria-label="Blog index preview">
          <p className="admin-muted">
            How <code>/blog</code> will look with your currently published posts — lead story plus
            up to four more in the grid. Drafts and archived posts are excluded.
          </p>
          {previewPosts.length === 0 ? (
            <p className="admin-warn">No published posts yet. Publish a draft to see the index.</p>
          ) : (
            <BlogIndexPreview posts={previewPosts} />
          )}
        </section>
      ) : null}
    </>
  );
}
