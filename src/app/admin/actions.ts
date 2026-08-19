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
import { blocksToMarkdown, blocksToPlaintext, countUnparsed, isArticleLayout, normalizeBlocks } from "@/lib/blog-blocks";
import { blogMediaContext, blogMediaTags, sanitizeMediaToken, type MediaKind } from "@/lib/blog-media";

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
  const kindRaw = String(formData.get("kind") ?? "image");
  const kind: MediaKind =
    kindRaw === "mermaid" || kindRaw === "drawio" || kindRaw === "diagram" ? kindRaw : "image";
  const slug = sanitizeMediaToken(String(formData.get("slug") ?? "")) || "draft";
  const topics = parseTopics(String(formData.get("topics") ?? ""));
  const hash = sanitizeMediaToken(String(formData.get("hash") ?? ""));
  try {
    const { uploadToCloudinary } = await import("@/lib/cloudinary");
    const uploaded = await uploadToCloudinary(file, {
      tags: blogMediaTags(kind, slug, topics),
      context: blogMediaContext(kind, slug, file.name),
      publicId: hash ? `blog-${slug}-${kind}-${hash}` : undefined,
    });
    return {
      ok: true as const,
      url: uploaded.url,
      resourceType: uploaded.resourceType,
      publicId: uploaded.publicId,
      tags: uploaded.tags,
    };
  } catch (error) {
    return {
      ok: false as const,
      error: error instanceof Error ? error.message : "Upload failed.",
    };
  }
}

export async function searchMediaAction(query = "", tag = "") {
  await requireAdminSession();
  try {
    const { searchCloudinaryMedia } = await import("@/lib/cloudinary");
    const items = await searchCloudinaryMedia(query.slice(0, 80), tag.slice(0, 64));
    return { ok: true as const, items };
  } catch (error) {
    return {
      ok: false as const,
      error: error instanceof Error ? error.message : "Catalogue search failed.",
      items: [],
    };
  }
}

export async function tagMediaAction(publicId: string, slug: string, topics: string[] = []) {
  await requireAdminSession();
  const id = publicId.trim();
  if (!id) return { ok: false as const, error: "Missing media id." };
  try {
    const { addCloudinaryTags } = await import("@/lib/cloudinary");
    await addCloudinaryTags(id, blogMediaTags("image", slug, topics));
    return { ok: true as const };
  } catch (error) {
    return {
      ok: false as const,
      error: error instanceof Error ? error.message : "Could not tag media.",
    };
  }
}

export async function exportDrawioPngAction(input: {
  source: string;
  format: "xml" | "url";
  slug: string;
  topics: string[];
  hash: string;
}) {
  await requireAdminSession();
  const source = input.source.trim();
  if (!source) return { ok: false as const, error: "Draw.io source is empty." };
  try {
    const {
      exportDrawioPng,
      isCloudinaryUrl,
      optimizeCloudinaryUrl,
      uploadBufferToCloudinary,
    } = await import("@/lib/cloudinary");
    if (input.format === "url" && /\.(png|jpe?g|webp|gif|svg)(\?|$)/i.test(source)) {
      return {
        ok: true as const,
        url: isCloudinaryUrl(source) ? optimizeCloudinaryUrl(source) : source,
        publicId: "",
      };
    }
    let xml = source;
    if (input.format === "url") {
      let allowed = false;
      try {
        const parsed = new URL(source);
        allowed =
          parsed.protocol === "https:" &&
          (parsed.hostname.endsWith("res.cloudinary.com") ||
            parsed.hostname.endsWith("diagrams.net") ||
            parsed.hostname.endsWith("draw.io"));
      } catch {
        allowed = false;
      }
      if (!allowed) throw new Error("Draw.io URL is not allowed");
      const res = await fetch(source, { cache: "no-store", signal: AbortSignal.timeout(15000) });
      if (!res.ok) throw new Error("Could not fetch Draw.io source");
      xml = await res.text();
    }
    const png = await exportDrawioPng(xml);
    const slug = sanitizeMediaToken(input.slug) || "draft";
    const hash = sanitizeMediaToken(input.hash) || "diagram";
    const uploaded = await uploadBufferToCloudinary(png, `drawio-${hash}.png`, {
      tags: blogMediaTags("drawio", slug, input.topics),
      context: blogMediaContext("drawio", slug, "drawio diagram"),
      publicId: `blog-${slug}-drawio-${hash}`,
    });
    return { ok: true as const, url: uploaded.url, publicId: uploaded.publicId };
  } catch (error) {
    return {
      ok: false as const,
      error: error instanceof Error ? error.message : "Draw.io PNG export failed.",
    };
  }
}

function parseBlocksField(raw: string) {
  try {
    return normalizeBlocks(JSON.parse(raw || "[]"));
  } catch {
    return [];
  }
}

function fallbackSlug(title: string, existing?: string) {
  const fromTitle =
    existing?.trim() ||
    title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
  const slug = fromTitle.slice(0, 80);
  if (!slug || slug === "all") return `draft-${Date.now().toString(36)}`;
  return slug;
}

export async function persistPostAction(input: {
  id?: string;
  slug: string;
  title: string;
  excerpt: string;
  blocks: unknown;
  heroUrl: string | null;
  layout: string;
  topics: string[];
  published?: boolean;
}) {
  await requireAdminSession();
  const blocks = normalizeBlocks(input.blocks);
  const title = input.title.trim() || "Untitled draft";
  let slug = fallbackSlug(title, input.slug);
  if (slug === "all") slug = "all-posts";
  try {
    const existing = input.id ? await sbGet(input.id) : null;
    const published =
      typeof input.published === "boolean" ? input.published : Boolean(existing?.published);
    if (published && countUnparsed(blocks) > 0) {
      return {
        ok: false as const,
        error: "Convert leftover snippets before publishing.",
      };
    }
    const payload = {
      id: input.id,
      slug,
      title,
      excerpt: input.excerpt,
      body: blocksToPlaintext(blocks) || blocksToMarkdown(blocks),
      blocks: blocks.length ? blocks : normalizeBlocks([{ type: "paragraph", text: "" }]),
      heroUrl: input.heroUrl,
      layout: isArticleLayout(input.layout) ? input.layout : "flow",
      topics: input.topics,
      published,
      archived: false,
    };
    let savedId: string;
    try {
      savedId = await sbUpsert(payload);
    } catch (error) {
      const message = error instanceof Error ? error.message : "";
      if (!/duplicate|unique/i.test(message)) throw error;
      payload.slug = `${slug}-${Date.now().toString(36).slice(-4)}`.slice(0, 80);
      slug = payload.slug;
      savedId = await sbUpsert(payload);
    }
    if (published) revalidatePath("/", "layout");
    revalidatePath("/admin/blog");
    return {
      ok: true as const,
      id: savedId,
      slug,
      title,
      published,
      savedAt: new Date().toISOString(),
    };
  } catch (error) {
    return {
      ok: false as const,
      error: error instanceof Error ? error.message : "Could not save draft.",
    };
  }
}

export async function savePostAction(formData: FormData) {
  const intent = String(formData.get("intent") ?? "draft");
  const published = intent === "publish" || intent === "save";
  const result = await persistPostAction({
    id: String(formData.get("id") ?? "") || undefined,
    slug: String(formData.get("slug") ?? ""),
    title: String(formData.get("title") ?? ""),
    excerpt: String(formData.get("excerpt") ?? ""),
    blocks: parseBlocksField(String(formData.get("blocks") ?? "[]")),
    heroUrl: String(formData.get("hero_url") ?? "").trim() || null,
    layout: String(formData.get("layout") ?? "flow"),
    topics: parseTopics(String(formData.get("topics") ?? "")),
    published,
  });
  if (!result.ok) throw new Error(result.error);
  redirect(`/admin/blog/${result.id}?saved=${result.published ? "published" : "draft"}`);
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
  if (published) {
    const existing = await sbGet(id);
    if (existing && countUnparsed(existing.blocks) > 0) {
      redirect(`/admin/blog/${id}?saved=unparsed`);
    }
  }
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
