import { notFound } from "next/navigation";
import { getPostAction } from "@/app/admin/actions";
import { PostEditor } from "@/components/PostEditor";
import { requireAdminOrRedirect } from "@/lib/admin-auth";
import { cloudinaryConfigured } from "@/lib/cloudinary";

export default async function EditPostPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAdminOrRedirect();
  const { id } = await params;
  const post = await getPostAction(id);
  if (!post) notFound();

  return (
    <main className="admin-shell">
      <h1>Edit note</h1>
      <PostEditor post={post} cloudinaryEnabled={cloudinaryConfigured()} />
    </main>
  );
}
