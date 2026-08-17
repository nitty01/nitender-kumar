import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BlogContent } from "@/components/BlogContent";
import { getPost, getPosts } from "@/lib/blog";
import { requirePublicPage } from "@/lib/public-pages";

export const dynamic = "force-dynamic";

export async function generateStaticParams() {
  const posts = await getPosts();
  return posts.map((post) => ({ slug: post.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const post = await getPost(slug);
  if (!post) return { title: "Note | Nitender Kumar" };
  return {
    title: `${post.title} | Nitender Kumar`,
    description: post.excerpt,
  };
}

export default async function BlogPostPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  await requirePublicPage("showBlog");
  const { slug } = await params;
  const post = await getPost(slug);
  if (!post) notFound();

  return (
    <main className="max-w-3xl mx-auto px-4 py-16">
      <p className="text-sm">
        <Link href="/blog">← Notes</Link>
      </p>
      <p className="mt-6 text-sm text-gray-500">{post.date}</p>
      <h1 className="mt-2">{post.title}</h1>
      <BlogContent body={post.body} />
    </main>
  );
}
