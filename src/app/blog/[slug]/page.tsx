import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BlogArticle } from "@/components/BlogArticle";
import { blocksToPlaintext } from "@/lib/blog-blocks";
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
  if (!post) return { title: "Blog | Nitender Kumar" };
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
    <main className="blog-portal blog-portal-article">
      <p className="blog-back">
        <Link href="/blog">← The ledger</Link>
      </p>
      <BlogArticle
        title={post.title}
        excerpt={post.excerpt}
        date={post.date}
        topics={post.topics}
        heroUrl={post.heroUrl}
        layout={post.layout}
        blocks={post.blocks}
        bodyText={post.body || blocksToPlaintext(post.blocks)}
      />
    </main>
  );
}
