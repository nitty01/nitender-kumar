export type MailPayload = {
  to: string;
  subject: string;
  text: string;
  html: string;
};

export function mailConfigured() {
  return Boolean(
    process.env.RESEND_API_KEY?.trim() ||
      (process.env.SMTP_HOST?.trim() && process.env.SMTP_USER?.trim() && process.env.SMTP_PASS?.trim()),
  );
}

function fromAddress() {
  return (
    process.env.ADMIN_EMAIL_FROM?.trim() ||
    process.env.SMTP_USER?.trim() ||
    "onboarding@resend.dev"
  );
}

export async function sendAdminEmail(payload: MailPayload) {
  if (process.env.RESEND_API_KEY?.trim()) {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY.trim()}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: fromAddress(),
        to: [payload.to],
        subject: payload.subject,
        text: payload.text,
        html: payload.html,
      }),
    });
    if (!res.ok) {
      const body = await res.text();
      throw new Error(`Resend failed: ${res.status} ${body}`);
    }
    return { provider: "resend" as const };
  }

  if (process.env.SMTP_HOST?.trim() && process.env.SMTP_USER?.trim() && process.env.SMTP_PASS?.trim()) {
    const nodemailer = await import("nodemailer");
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST.trim(),
      port: Number(process.env.SMTP_PORT || 587),
      secure: process.env.SMTP_SECURE === "true",
      auth: {
        user: process.env.SMTP_USER.trim(),
        pass: process.env.SMTP_PASS.trim(),
      },
    });
    await transporter.sendMail({
      from: fromAddress(),
      to: payload.to,
      subject: payload.subject,
      text: payload.text,
      html: payload.html,
    });
    return { provider: "smtp" as const };
  }

  // Local/dev fallback so the flow is testable before mail is wired
  if (process.env.NODE_ENV !== "production") {
    console.info("[admin-mail:dev] recovery mail skipped; configure RESEND_API_KEY for delivery");
    return { provider: "console" as const };
  }

  throw new Error(
    "Email is not configured. Set RESEND_API_KEY or SMTP_HOST/SMTP_USER/SMTP_PASS.",
  );
}
