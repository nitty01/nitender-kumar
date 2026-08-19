import Link from "next/link";
import {
  archivePostAction,
  deletePostAction,
  listPostsAction,
  publishPostAction,
} from "@/app/admin/actions";
import { requireAdminOrRedirect } from "@/lib/admin-auth";

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
      <nav className="admin-filters" aria-label="Filter posts">
        <Link href="/admin/blog" className={!status ? "is-active" : undefined}>
          All
        </Link>
        <Link href="/admin/blog?status=draft" className={status === "draft" ? "is-active" : undefined}>
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
    </main>
  );
}
