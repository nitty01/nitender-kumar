import { PostEditor } from "@/components/PostEditor";
import { requireAdminOrRedirect } from "@/lib/admin-auth";
import { cloudinaryConfigured } from "@/lib/cloudinary";

export default async function NewPostPage() {
  await requireAdminOrRedirect();
  return (
    <main className="admin-shell">
      <h1>New note</h1>
      <PostEditor cloudinaryEnabled={cloudinaryConfigured()} />
    </main>
  );
}
