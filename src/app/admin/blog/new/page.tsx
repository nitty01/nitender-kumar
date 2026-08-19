import Link from "next/link";
import { BlogEditor } from "@/components/BlogEditor";
import { requireAdminOrRedirect } from "@/lib/admin-auth";
import { cloudinaryConfigured } from "@/lib/cloudinary";

export default async function NewBlogPostPage() {
  await requireAdminOrRedirect();
  return (
    <main className="admin-shell admin-shell-wide">
      <h1>New blog post</h1>
      <p className="admin-muted">Starts as a draft. Publish only when the piece is final.</p>
      <p>
        <Link href="/admin/blog/import" className="admin-btn-secondary">
          Upload markdown instead
        </Link>
      </p>
      <BlogEditor cloudinaryEnabled={cloudinaryConfigured()} />
    </main>
  );
}
