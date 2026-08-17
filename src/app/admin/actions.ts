"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  clearAdminSession,
  clearRecoveryPending,
  createAdminSession,
  emailLookupHash,
  getRecoveryPending,
  isAllowedPassword,
  isValidEmail,
  normalizeEmail,
  requireAdminSession,
  setRecoveryPending,
  verifyAdminLogin,
} from "@/lib/admin-auth";
import {
  deleteAdminPost as sbDelete,
  getAdminPost as sbGet,
  listAdminPosts as sbList,
  setPostFlags as sbFlags,
  upsertAdminPost as sbUpsert,
  type AdminPost,
} from "@/lib/admin-data";
import { THEMES, type ThemeId } from "@/lib/site";
import {
  getAdminAppearance,
  saveAppearance,
  type SiteAppearance,
} from "@/lib/site-appearance";
import {
  clientIpSubject,
  isRateLimited,
  recordSecurityEvent,
} from "@/lib/admin-rate-limit";
import { parseTopics } from "@/lib/blog";

function isNextControlFlow(error: unknown) {
  if (!error || typeof error !== "object" || !("digest" in error)) return false;
  const digest = String((error as { digest: unknown }).digest);
  return digest.includes("NEXT_REDIRECT") || digest.includes("NEXT_NOT_FOUND");
}

export async function loginAction(formData: FormData) {
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");
  const ipSubject = await clientIpSubject();
  const emailSubject = isValidEmail(email) ? emailLookupHash(email) : ipSubject;

  const limited =
    (await isRateLimited("login_fail", ipSubject, 25, 15 * 60 * 1000)) ||
    (await isRateLimited("login_fail", emailSubject, 5, 15 * 60 * 1000));
  if (limited) {
    redirect("/admin/login?error=1");
  }

  const account = await verifyAdminLogin(email, password);
  if (!account) {
    await recordSecurityEvent("login_fail", ipSubject);
    await recordSecurityEvent("login_fail", emailSubject);
    redirect("/admin/login?error=1");
  }

  await createAdminSession(normalizeEmail(email), account.sessionVersion);
  redirect("/admin");
}

export async function logoutAction() {
  await clearAdminSession();
  redirect("/admin/login");
}

export async function requestRecoveryAction(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim();
  if (!isValidEmail(email)) {
    redirect("/admin/recover?error=email");
  }
  try {
    const { requestRecoveryCode } = await import("@/lib/admin-recovery");
    await requestRecoveryCode(email);
    await setRecoveryPending(email);
  } catch (error) {
    if (isNextControlFlow(error)) throw error;
    redirect("/admin/recover?error=mail");
  }
  redirect("/admin/recover?step=code");
}

export async function recoverAdminAction(formData: FormData) {
  const email = await getRecoveryPending();
  const code = String(formData.get("recovery_code") ?? "");
  const password = String(formData.get("password") ?? "");
  const confirm = String(formData.get("confirm_password") ?? "");

  if (!email) {
    redirect("/admin/recover?error=session");
  }
  if (!code.trim()) {
    redirect("/admin/recover?step=code&error=code");
  }
  if (!isAllowedPassword(password)) {
    redirect("/admin/recover?step=code&error=password");
  }
  if (password !== confirm) {
    redirect("/admin/recover?step=code&error=match");
  }

  try {
    const { resetPasswordWithCode } = await import("@/lib/admin-recovery");
    const result = await resetPasswordWithCode({ email, code, password });
    if (!result.ok) {
      redirect(`/admin/recover?step=code&error=${result.reason}`);
    }
    await clearRecoveryPending();
    await clearAdminSession();
    await createAdminSession(email, result.sessionVersion);
  } catch (error) {
    if (isNextControlFlow(error)) throw error;
    redirect("/admin/recover?step=code&error=store");
  }

  redirect("/admin?saved=recovered");
}

export async function listPostsAction(): Promise<AdminPost[]> {
  await requireAdminSession();
  return sbList();
}

export async function getPostAction(id: string): Promise<AdminPost | null> {
  await requireAdminSession();
  return sbGet(id);
}

export async function uploadMediaAction(formData: FormData) {
  await requireAdminSession();
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { ok: false as const, error: "Choose a file to upload." };
  }
  try {
    const { uploadToCloudinary } = await import("@/lib/cloudinary");
    const uploaded = await uploadToCloudinary(file);
    return {
      ok: true as const,
      url: uploaded.url,
      resourceType: uploaded.resourceType,
      publicId: uploaded.publicId,
    };
  } catch {
    return { ok: false as const, error: "Upload failed." };
  }
}

export async function savePostAction(formData: FormData) {
  await requireAdminSession();
  const id = String(formData.get("id") ?? "") || undefined;
  const intent = String(formData.get("intent") ?? "draft");
  const published = intent === "publish" || intent === "save";
  let slug = String(formData.get("slug") ?? "");
  if (slug === "all") slug = "all-posts";
  const payload = {
    id,
    slug,
    title: String(formData.get("title") ?? ""),
    excerpt: String(formData.get("excerpt") ?? ""),
    body: String(formData.get("body") ?? ""),
    topics: parseTopics(String(formData.get("topics") ?? "")),
    published,
    archived: false,
  };
  if (!payload.slug || !payload.title || !payload.body) {
    throw new Error("Title, slug, and body are required");
  }
  const savedId = await sbUpsert(payload);
  revalidatePath("/", "layout");
  redirect(`/admin/blog/${savedId}?saved=${published ? "published" : "draft"}`);
}

export async function deletePostAction(formData: FormData) {
  await requireAdminSession();
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  await sbDelete(id);
  revalidatePath("/", "layout");
  redirect("/admin/blog");
}

export async function archivePostAction(formData: FormData) {
  await requireAdminSession();
  const id = String(formData.get("id") ?? "");
  const archived = formData.get("archived") === "true";
  if (!id) return;
  await sbFlags(id, { archived, ...(archived ? { published: false } : {}) });
  revalidatePath("/", "layout");
  redirect("/admin/blog");
}

export async function publishPostAction(formData: FormData) {
  await requireAdminSession();
  const id = String(formData.get("id") ?? "");
  const published = formData.get("published") === "true";
  if (!id) return;
  await sbFlags(id, { published, ...(published ? { archived: false } : {}) });
  revalidatePath("/", "layout");
  redirect("/admin/blog");
}

export async function getAppearanceAction(): Promise<SiteAppearance> {
  await requireAdminSession();
  return getAdminAppearance();
}

export async function saveAppearanceAction(formData: FormData) {
  await requireAdminSession();
  const themeValue = String(formData.get("theme") ?? "ocean");
  const theme = THEMES.some((item) => item.id === themeValue)
    ? (themeValue as ThemeId)
    : "ocean";
  await saveAppearance({
    mode: String(formData.get("site_mode") ?? "cto") === "engineer" ? "engineer" : "cto",
    theme,
    showBlog: formData.get("show_blog") === "on",
    showPlayground: formData.get("show_playground") === "on",
    showAbout: formData.get("show_about") === "on",
    showContact: formData.get("show_contact") === "on",
    showExperience: formData.get("show_experience") === "on",
  });
  revalidatePath("/", "layout");
  redirect("/admin?saved=appearance");
}
