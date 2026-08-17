import Link from "next/link";
import { redirect } from "next/navigation";
import { recoverAdminAction, requestRecoveryAction } from "@/app/admin/actions";
import {
  adminConfigured,
  getAdminSession,
  getRecoveryPending,
  PASSWORD_MAX,
  PASSWORD_MIN,
} from "@/lib/admin-auth";

const ERRORS: Record<string, string> = {
  email: "Enter a valid email address.",
  code: "Invalid or expired recovery code.",
  password: `Password must be ${PASSWORD_MIN}–${PASSWORD_MAX} characters.`,
  match: "Password confirmation does not match.",
  mail: "Could not complete recovery. Try again later.",
  store: "Could not complete recovery. Try again later.",
  session: "Start recovery again from the beginning.",
};

export default async function AdminRecoverPage({
  searchParams,
}: {
  searchParams: Promise<{
    error?: string;
    step?: string;
  }>;
}) {
  if (!adminConfigured()) {
    redirect("/admin/login");
  }

  const session = await getAdminSession();
  if (session) redirect("/admin");

  const params = await searchParams;
  const error = params.error ? ERRORS[params.error] ?? "Recovery failed." : null;
  const pendingEmail = await getRecoveryPending();
  const showCodeStep = params.step === "code" && Boolean(pendingEmail);

  return (
    <main className="admin-shell admin-login">
      <h1>Recover admin access</h1>
      <p className="admin-muted">
        If this email can recover the admin account, a one-time code will be sent. It expires in 15
        minutes and can only be tried a few times.
      </p>
      {error ? <p className="admin-error">{error}</p> : null}
      {showCodeStep ? (
        <p className="admin-ok">If that address can recover this admin, a code was sent.</p>
      ) : null}

      {!showCodeStep ? (
        <form action={requestRecoveryAction} className="admin-form">
          <label>
            Email
            <input name="email" type="email" autoComplete="username" required />
          </label>
          <button type="submit">Send recovery code</button>
        </form>
      ) : (
        <form action={recoverAdminAction} className="admin-form">
          <label>
            Recovery code
            <input
              name="recovery_code"
              autoComplete="one-time-code"
              required
              spellCheck={false}
            />
          </label>
          <label>
            New password
            <input
              name="password"
              type="password"
              autoComplete="new-password"
              required
              minLength={PASSWORD_MIN}
              maxLength={PASSWORD_MAX}
            />
          </label>
          <label>
            Confirm password
            <input
              name="confirm_password"
              type="password"
              autoComplete="new-password"
              required
              minLength={PASSWORD_MIN}
              maxLength={PASSWORD_MAX}
            />
          </label>
          <button type="submit">Verify and set password</button>
        </form>
      )}

      <p className="admin-muted admin-footer-link">
        {showCodeStep ? (
          <Link href="/admin/recover">Use a different email</Link>
        ) : (
          <Link href="/admin/login">Back to sign in</Link>
        )}
      </p>
    </main>
  );
}
