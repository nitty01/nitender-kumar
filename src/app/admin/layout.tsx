import Link from "next/link";
import { logoutAction } from "@/app/admin/actions";
import { getAdminSession } from "@/lib/admin-auth";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getAdminSession();
  return (
    <div className="admin-root">
      {session ? (
        <header className="admin-topbar">
          <Link href="/admin" className="admin-brand">
            Admin
          </Link>
          <nav className="admin-nav">
            <Link href="/admin">Overview</Link>
            <Link href="/admin/blog">Blog</Link>
            <Link href="/admin/blog/new">New post</Link>
            <Link href="/admin/blog/import">Upload markdown</Link>
            <Link href="/" target="_blank" rel="noreferrer">
              View site
            </Link>
            <form action={logoutAction}>
              <button type="submit" className="admin-link-btn">
                Sign out ({session.sub})
              </button>
            </form>
          </nav>
        </header>
      ) : null}
      {children}
    </div>
  );
}
