import Link from "next/link";
import { redirect } from "next/navigation";
import { loginAction } from "@/app/admin/actions";
import { adminConfigStatus, getAdminSession, PASSWORD_MAX } from "@/lib/admin-auth";

export default async function AdminLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const config = adminConfigStatus();
  if (!config.ok) {
    return (
      <main className="admin-shell">
        <h1>Admin not available</h1>
        <p>This control plane is not configured on this environment.</p>
        {process.env.NODE_ENV !== "production" ? (
          <p className="admin-muted">
            Missing env vars: {config.missing.join(", ")}. Add them to <code>.env.local</code> and
            restart the dev server.
          </p>
        ) : null}
      </main>
    );
  }

  const session = await getAdminSession();
  if (session) redirect("/admin");

  const params = await searchParams;

  return (
    <main className="admin-shell admin-login">
      <h1>Admin sign in</h1>
      <p className="admin-muted">Sign in with your admin email and password.</p>
      {params.error ? <p className="admin-error">Invalid email or password.</p> : null}
      <form action={loginAction} className="admin-form">
        <label>
          Email
          <input name="email" type="email" autoComplete="username" required />
        </label>
        <label>
          Password
          <input
            name="password"
            type="password"
            autoComplete="current-password"
            required
            maxLength={PASSWORD_MAX}
          />
        </label>
        <button type="submit">Sign in</button>
      </form>
      <p className="admin-muted admin-footer-link">
        <Link href="/admin/recover">Forgot password?</Link>
      </p>
    </main>
  );
}
