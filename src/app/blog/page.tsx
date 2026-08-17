import type { Metadata } from "next";
import Link from "next/link";
import { getPosts, isSupabaseConfigured } from "@/lib/blog";
import { requirePublicPage } from "@/lib/public-pages";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Notes | Nitender Kumar",
  description:
    "Notes on platform engineering, data systems, and production GenAI from Nitender Kumar.",
};

export default async function BlogPage() {
  await requirePublicPage("showBlog");
  const posts = await getPosts();

  return (
    <main className="max-w-3xl mx-auto px-4 py-16">
      <p className="text-sm uppercase tracking-widest text-accent">Notes</p>
      <h1 className="mt-3">Writing on platform, data, and AI</h1>
      <p className="mt-4 text-gray-400 max-w-2xl">
        Short pieces on engineering organizations and production platforms. Notes are managed from
        the private admin control plane.
      </p>
      {!isSupabaseConfigured() ? (
        <p className="mt-4 text-sm text-gray-500">
          Supabase is not connected yet. Add NEXT_PUBLIC_SUPABASE_URL and
          NEXT_PUBLIC_SUPABASE_ANON_KEY (or NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY),
          then run supabase/schema.sql.
        </p>
      ) : null}
      {posts.length === 0 ? (
        <p className="mt-12 text-gray-500">No live notes yet.</p>
      ) : null}
      <ul className="mt-12 space-y-8">
        {posts.map((post) => (
          <li key={post.slug}>
            <article>
              <p className="text-sm text-gray-500">{post.date}</p>
              <h2 className="mt-1">
                <Link href={`/blog/${post.slug}`}>{post.title}</Link>
              </h2>
              <p className="mt-2 text-gray-400">{post.excerpt}</p>
            </article>
          </li>
        ))}
      </ul>
    </main>
  );
}
