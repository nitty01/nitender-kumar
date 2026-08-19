"use client";

import { BlogIndexContent } from "@/components/BlogIndexContent";
import type { BlogPost } from "@/content/blog-posts";

export function BlogIndexPreview({ posts }: { posts: BlogPost[] }) {
  return (
    <div className="admin-blog-preview-shell">
      <div className="admin-blog-preview-page">
        <main className="blog-portal">
          <BlogIndexContent posts={posts} preview />
        </main>
      </div>
    </div>
  );
}
