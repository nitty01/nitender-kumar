# Nitender Kumar

Personal site for **Nitender Kumar** — engineering leader for platform, data, and AI. Targeting Head of Platform Engineering, Director of Engineering, or Head of AI/Data Platform.

## Local

```bash
npm install
npm run dev
```

Open [http://localhost:3001](http://localhost:3001) (or 3000 if that port is free).

## Admin

Private control plane at `/admin` (login at `/admin/login`).

No default username/password is shipped in the app.

The first admin account is created only through recovery for the configured `ADMIN_EMAIL`. The
stored email is **AES-encrypted** and the password is **scrypt-hashed** in `admin_accounts`.

**Forgot password:**

1. Open `/admin/recover`
2. Enter your admin email → receive a one-time code (15 min TTL, limited attempts)
3. Enter code + new password (12–128 characters) → signed in; previous sessions are revoked

Configure mail in env vars:

- **Resend:** `RESEND_API_KEY` (+ optional `ADMIN_EMAIL_FROM`)
- **or SMTP:** `SMTP_HOST` / `SMTP_PORT` / `SMTP_USER` / `SMTP_PASS` (Gmail app password works)

Admin auth and admin writes require:

- `ADMIN_EMAIL`
- `ADMIN_SESSION_SECRET`
- `SUPABASE_SERVICE_ROLE_KEY`

Public reads still use the publishable/anon Supabase key. Apply `supabase/schema.sql`,
`supabase/schema-admin.sql`, then `supabase/schema-blog.sql`.

The public site does not change itself. Visitors cannot switch theme, layout mode, or live
pages. Those are published from `/admin` (Public website). Blog posts stay drafts until
published; only published, non-archived posts appear on `/blog`.

## Media (Cloudinary)

Blog posts can embed images, video, and PDFs from Cloudinary. In the admin editor, **Upload media**
sends the file with a signed server upload into the app-managed folder
`nitender-kumar-portfolio/site-media`.

Add to `.env.local` (Dashboard → API Keys):

```bash
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=
```

Then restart `npm run dev`. Public pages rewrite Cloudinary URLs with `f_auto,q_auto` delivery.
