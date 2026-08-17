import Link from "next/link";
import {
  archivePostAction,
  deletePostAction,
  listPostsAction,
  publishPostAction,
} from "@/app/admin/actions";
import { requireAdminOrRedirect } from "@/lib/admin-auth";

export default async function AdminPostsPage() {
  await requireAdminOrRedirect();
  const posts = await listPostsAction();

  return (
    <main className="admin-shell">
      <div className="admin-row">
        <h1>Notes</h1>
        <Link href="/admin/posts/new" className="admin-btn">
          New note
        </Link>
      </div>
      <p className="admin-muted">
        Publish to show on /blog. Archive to hide without deleting. Body supports Markdown and{" "}
        <code>```mermaid</code> diagrams.
      </p>
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
            {posts.map((post) => (
              <tr key={post.id}>
                <td>
                  <Link href={`/admin/posts/${post.id}`}>{post.title}</Link>
                  <div className="admin-muted">/{post.slug}</div>
                </td>
                <td>
                  {post.archived ? "Archived" : post.published ? "Live" : "Draft"}
                </td>
                <td>{post.updated_at?.slice(0, 10)}</td>
                <td className="admin-actions">
                  <Link href={`/admin/posts/${post.id}`}>Edit</Link>
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
