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
        Import a plain-text or markdown file into a draft. Parsed sections are kept. Leftover
        snippets can be converted here, then edited or published from the editor — including
        diagram PNG export.
      </p>
      <BlogImport />
    </main>
  );
}
