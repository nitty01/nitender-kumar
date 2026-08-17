import Link from "next/link";
import { getAppearanceAction, listPostsAction, saveAppearanceAction } from "@/app/admin/actions";
import { requireAdminOrRedirect } from "@/lib/admin-auth";
import { THEMES } from "@/lib/site";

export default async function AdminHomePage({
  searchParams,
}: {
  searchParams: Promise<{ saved?: string }>;
}) {
  await requireAdminOrRedirect();
  const [posts, appearance, params] = await Promise.all([
    listPostsAction(),
    getAppearanceAction(),
    searchParams,
  ]);

  const live = posts.filter((p) => p.published && !p.archived).length;
  const drafts = posts.filter((p) => !p.published && !p.archived).length;
  const archived = posts.filter((p) => p.archived).length;

  return (
    <main className="admin-shell">
      <h1>Control plane</h1>
      <p className="admin-muted">
        The public site only changes from here: layout mode, theme, live pages, and notes.
      </p>
      {params.saved === "appearance" ? <p className="admin-ok">Website appearance published.</p> : null}
      {params.saved === "recovered" ? (
        <p className="admin-ok">Admin credentials updated. You are signed in.</p>
      ) : null}

      <section className="admin-cards">
        <article>
          <h2>{live}</h2>
          <p>Live notes</p>
        </article>
        <article>
          <h2>{drafts}</h2>
          <p>Drafts</p>
        </article>
        <article>
          <h2>{archived}</h2>
          <p>Archived</p>
        </article>
      </section>

      <section className="admin-panel">
        <h2>Public website</h2>
        <p className="admin-muted">
          Visitors cannot change these. Apply, then reload the live site to see the layout.
        </p>
        <form action={saveAppearanceAction} className="admin-form">
          <fieldset className="admin-fieldset">
            <legend>Layout mode</legend>
            <label>
              <input type="radio" name="site_mode" value="cto" defaultChecked={appearance.mode === "cto"} />
              CTO / leadership
            </label>
            <label>
              <input
                type="radio"
                name="site_mode"
                value="engineer"
                defaultChecked={appearance.mode === "engineer"}
              />
              Engineer / builder
            </label>
          </fieldset>

          <label>
            Theme
            <select name="theme" defaultValue={appearance.theme}>
              {THEMES.map((theme) => (
                <option key={theme.id} value={theme.id}>
                  {theme.name}
                </option>
              ))}
            </select>
          </label>

          <fieldset className="admin-fieldset">
            <legend>Live pages and sections</legend>
            <label>
              <input type="checkbox" name="show_blog" defaultChecked={appearance.showBlog} />
              Notes / blog
            </label>
            <label>
              <input type="checkbox" name="show_about" defaultChecked={appearance.showAbout} />
              About
            </label>
            <label>
              <input type="checkbox" name="show_contact" defaultChecked={appearance.showContact} />
              Contact
            </label>
            <label>
              <input
                type="checkbox"
                name="show_playground"
                defaultChecked={appearance.showPlayground}
              />
              Playground (engineer mode)
            </label>
            <label>
              <input
                type="checkbox"
                name="show_experience"
                defaultChecked={appearance.showExperience}
              />
              Experience section
            </label>
          </fieldset>
          <button type="submit">Publish website changes</button>
        </form>
      </section>

      <section className="admin-panel">
        <div className="admin-row">
          <h2>Recent notes</h2>
          <Link href="/admin/posts/new">New note</Link>
        </div>
        <ul className="admin-list">
          {posts.slice(0, 6).map((post) => (
            <li key={post.id}>
              <Link href={`/admin/posts/${post.id}`}>{post.title}</Link>
              <span className="admin-muted">
                {post.archived ? "archived" : post.published ? "live" : "draft"} · {post.slug}
              </span>
            </li>
          ))}
        </ul>
        <Link href="/admin/posts">Manage all notes →</Link>
      </section>
    </main>
  );
}
