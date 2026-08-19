import Link from "next/link";
import { BlogImport } from "@/components/BlogImport";
import { requireAdminOrRedirect } from "@/lib/admin-auth";

export default async function ImportBlogPage() {
  await requireAdminOrRedirect();
  return (
    <main className="admin-shell admin-shell-wide">
      <div className="admin-row">
        <h1>Upload markdown</h1>
        <Link href="/admin/blog" className="admin-btn-secondary">
          Back to blog
        </Link>
      </div>
      <p className="admin-muted">
        Import markdown using the structure guide and template. Parsed sections are kept; failures
        show what is missing and can be fixed inline before saving a draft.
      </p>
      <BlogImport />
    </main>
  );
}
