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
    <main className="blog-index blog-post">
      <p className="text-sm">
        <Link href="/blog">← Blog</Link>
      </p>
      {post.date ? <p className="blog-card-date">{post.date}</p> : null}
      <h1>{post.title}</h1>
      {post.topics.length > 0 ? (
        <ul className="blog-topics">
          {post.topics.map((topic) => (
            <li key={topic}>
              <Link href={`/blog/all?topic=${encodeURIComponent(topic)}`}>{topic}</Link>
            </li>
          ))}
        </ul>
      ) : null}
      <BlogContent body={post.body} />
    </main>
  );
}
