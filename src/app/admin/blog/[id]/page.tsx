import { notFound } from "next/navigation";
import { getPostAction } from "@/app/admin/actions";
import { BlogEditor } from "@/components/BlogEditor";
import { requireAdminOrRedirect } from "@/lib/admin-auth";
import { cloudinaryConfigured } from "@/lib/cloudinary";

export default async function EditBlogPostPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ saved?: string }>;
}) {
  await requireAdminOrRedirect();
  const [{ id }, { saved }] = await Promise.all([params, searchParams]);
  const post = await getPostAction(id);
  if (!post) notFound();

  return (
    <main className="admin-shell admin-shell-wide">
      <h1>Edit blog post</h1>
      <BlogEditor post={post} saved={saved} cloudinaryEnabled={cloudinaryConfigured()} />
    </main>
  );
}
