import Link from "next/link";
import {
  archivePostAction,
  deletePostAction,
  listPostsAction,
  publishPostAction,
} from "@/app/admin/actions";
import { AdminBlogShell } from "@/components/AdminBlogShell";
import { requireAdminOrRedirect } from "@/lib/admin-auth";
import type { AdminPost } from "@/lib/admin-data";
import type { BlogPost } from "@/content/blog-posts";

function toBlogPost(post: AdminPost): BlogPost {
  return {
    slug: post.slug,
    title: post.title,
    excerpt: post.excerpt ?? "",
    date: (post.published_at ?? post.updated_at).slice(0, 10),
    topics: post.topics,
    body: post.body,
    blocks: post.blocks,
    heroUrl: post.heroUrl,
    layout: post.layout,
  };
}

function publishedPostsForPreview(posts: AdminPost[]): BlogPost[] {
  return posts
    .filter((post) => post.published && !post.archived)
    .sort((a, b) => {
      const left = a.published_at ?? a.updated_at;
      const right = b.published_at ?? b.updated_at;
      return right.localeCompare(left);
    })
    .map(toBlogPost);
}

export default async function AdminBlogPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  await requireAdminOrRedirect();
  const { status } = await searchParams;
  const posts = await listPostsAction();
  const filtered = posts.filter((post) => {
    if (status === "draft") return !post.published && !post.archived;
    if (status === "published") return post.published && !post.archived;
    if (status === "archived") return post.archived;
    return true;
  });

  return (
    <main className="admin-shell">
      <AdminBlogShell previewPosts={publishedPostsForPreview(posts)} status={status}>
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Title</th>
                <th>Status</th>
                <th>Updated</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={4} className="admin-muted">
                    No posts in this view.
                  </td>
                </tr>
              ) : null}
              {filtered.map((post) => (
                <tr key={post.id}>
                  <td>
                    <Link href={`/admin/blog/${post.id}`}>{post.title}</Link>
                    <div className="admin-muted">/{post.slug}</div>
                  </td>
                  <td>{post.archived ? "Archived" : post.published ? "Published" : "Draft"}</td>
                  <td>{post.updated_at?.slice(0, 10)}</td>
                  <td className="admin-actions">
                    <Link href={`/admin/blog/${post.id}`}>Edit</Link>
                    <form action={publishPostAction}>
                      <input type="hidden" name="id" value={post.id} />
                      <input
                        type="hidden"
                        name="published"
                        value={post.published ? "false" : "true"}
                      />
                      <button type="submit">{post.published ? "Unpublish" : "Publish"}</button>
                    </form>
                    <form action={archivePostAction}>
                      <input type="hidden" name="id" value={post.id} />
                      <input
                        type="hidden"
                        name="archived"
                        value={post.archived ? "false" : "true"}
                      />
                      <button type="submit">{post.archived ? "Restore" : "Archive"}</button>
                    </form>
                    <form action={deletePostAction}>
                      <input type="hidden" name="id" value={post.id} />
                      <button type="submit" className="admin-danger">
                        Delete
                      </button>
                    </form>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </AdminBlogShell>
    </main>
  );
}
