import { createHash } from "crypto";
import type { CloudinaryMedia } from "@/lib/blog-media";

const FOLDER = "nitender-kumar-portfolio/site-media";
const LIST_PREFIX = "nitender-kumar-portfolio";
const MAX_BYTES = 12 * 1024 * 1024;
const ALLOWED = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/svg+xml",
  "video/mp4",
  "video/webm",
  "application/pdf",
]);

const ALLOWED_EXT = new Set(["jpg", "jpeg", "png", "webp", "gif", "svg", "mp4", "webm", "pdf"]);

export function cloudinaryConfigured() {
  return Boolean(
    process.env.CLOUDINARY_CLOUD_NAME?.trim() &&
      process.env.CLOUDINARY_API_KEY?.trim() &&
      process.env.CLOUDINARY_API_SECRET?.trim(),
  );
}

export function cloudinaryCloudName() {
  return process.env.CLOUDINARY_CLOUD_NAME?.trim() || process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME?.trim() || "";
}

function sign(params: Record<string, string>, secret: string) {
  const payload = Object.keys(params)
    .sort()
    .map((key) => `${key}=${params[key]}`)
    .join("&");
  return createHash("sha1").update(`${payload}${secret}`).digest("hex");
}

export type CloudinaryUpload = {
  url: string;
  secureUrl: string;
  publicId: string;
  resourceType: "image" | "video" | "raw";
  format: string | null;
  bytes: number;
  tags: string[];
};

export type CloudinaryUploadOptions = {
  tags?: string[];
  context?: Record<string, string>;
  publicId?: string;
};

export type { CloudinaryMedia } from "@/lib/blog-media";

function credentials() {
  const cloud = process.env.CLOUDINARY_CLOUD_NAME?.trim();
  const apiKey = process.env.CLOUDINARY_API_KEY?.trim();
  const secret = process.env.CLOUDINARY_API_SECRET?.trim();
  if (!cloud || !apiKey || !secret) {
    throw new Error("Cloudinary is not configured");
  }
  return { cloud, apiKey, secret };
}

function adminAuth(apiKey: string, secret: string) {
  return `Basic ${Buffer.from(`${apiKey}:${secret}`).toString("base64")}`;
}

function sanitizeTags(tags: string[] = []) {
  return [...new Set(tags.map((tag) => tag.trim().slice(0, 64)).filter(Boolean))].slice(0, 20);
}

function contextParam(context: Record<string, string> = {}) {
  return Object.entries(context)
    .map(([key, value]) => `${key}=${String(value).replace(/[|=]/g, " ").slice(0, 120)}`)
    .join("|");
}

function contextFromUnknown(value: unknown): Record<string, string> {
  if (!value || typeof value !== "object") return {};
  const custom = "custom" in value && value.custom && typeof value.custom === "object"
    ? (value.custom as Record<string, unknown>)
    : (value as Record<string, unknown>);
  const out: Record<string, string> = {};
  for (const [key, entry] of Object.entries(custom)) {
    if (typeof entry === "string" && entry.trim()) out[key] = entry;
  }
  return out;
}

function thumbFromUrl(url: string) {
  if (!url.includes("res.cloudinary.com") || !url.includes("/upload/")) return url;
  return url.replace("/upload/", "/upload/f_auto,q_auto,c_limit,w_480/");
}

export async function uploadToCloudinary(
  file: File,
  options: CloudinaryUploadOptions = {},
): Promise<CloudinaryUpload> {
  const { cloud, apiKey, secret } = credentials();
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
  const typeOk = ALLOWED.has(file.type) || (!file.type && ALLOWED_EXT.has(ext));
  if (!typeOk || !ALLOWED_EXT.has(ext)) {
    throw new Error("Unsupported file type");
  }
  if (file.size > MAX_BYTES) {
    throw new Error("File is larger than 12 MB");
  }

  const timestamp = String(Math.floor(Date.now() / 1000));
  const tags = sanitizeTags(options.tags).join(",");
  const context = contextParam(options.context);
  const params: Record<string, string> = { folder: FOLDER, timestamp };
  if (tags) params.tags = tags;
  if (context) params.context = context;
  if (options.publicId) {
    params.public_id = options.publicId;
    params.overwrite = "true";
    params.invalidate = "true";
  }
  const signature = sign(params, secret);

  const body = new FormData();
  body.set("file", file);
  body.set("api_key", apiKey);
  body.set("timestamp", timestamp);
  body.set("folder", FOLDER);
  body.set("signature", signature);
  if (tags) body.set("tags", tags);
  if (context) body.set("context", context);
  if (options.publicId) {
    body.set("public_id", options.publicId);
    body.set("overwrite", "true");
    body.set("invalidate", "true");
  }

  const res = await fetch(`https://api.cloudinary.com/v1_1/${cloud}/auto/upload`, {
    method: "POST",
    body,
  });
  const data = (await res.json()) as {
    error?: { message?: string };
    secure_url?: string;
    url?: string;
    public_id?: string;
    resource_type?: string;
    format?: string;
    bytes?: number;
    tags?: string[];
  };
  if (!res.ok || !data.secure_url) {
    throw new Error(data.error?.message || "Cloudinary upload failed");
  }

  const resourceType =
    data.resource_type === "video" ? "video" : data.resource_type === "raw" ? "raw" : "image";

  return {
    url: optimizeCloudinaryUrl(data.secure_url, resourceType),
    secureUrl: data.secure_url,
    publicId: data.public_id ?? "",
    resourceType,
    format: data.format ?? null,
    bytes: data.bytes ?? file.size,
    tags: Array.isArray(data.tags) ? data.tags : sanitizeTags(options.tags),
  };
}

export async function uploadBufferToCloudinary(
  buffer: Buffer,
  filename: string,
  options: CloudinaryUploadOptions = {},
) {
  const file = new File([new Uint8Array(buffer)], filename, { type: "image/png" });
  return uploadToCloudinary(file, options);
}

function mapResource(row: Record<string, unknown>): CloudinaryMedia | null {
  const publicId = typeof row.public_id === "string" ? row.public_id : "";
  const secure = typeof row.secure_url === "string" ? row.secure_url : "";
  if (!publicId || !secure) return null;
  return {
    publicId,
    url: optimizeCloudinaryUrl(secure),
    thumbUrl: thumbFromUrl(secure),
    format: typeof row.format === "string" ? row.format : null,
    bytes: typeof row.bytes === "number" ? row.bytes : 0,
    width: typeof row.width === "number" ? row.width : null,
    height: typeof row.height === "number" ? row.height : null,
    createdAt: typeof row.created_at === "string" ? row.created_at : "",
    tags: Array.isArray(row.tags) ? row.tags.filter((tag): tag is string => typeof tag === "string") : [],
    context: contextFromUnknown(row.context),
  };
}

async function listFolderPage(cursor?: string) {
  const { cloud, apiKey, secret } = credentials();
  const params = new URLSearchParams({
    type: "upload",
    prefix: LIST_PREFIX,
    max_results: "80",
    tags: "true",
    context: "true",
  });
  if (cursor) params.set("next_cursor", cursor);
  const res = await fetch(`https://api.cloudinary.com/v1_1/${cloud}/resources/image?${params}`, {
    headers: { Authorization: adminAuth(apiKey, secret) },
    cache: "no-store",
  });
  const data = (await res.json()) as {
    error?: { message?: string };
    resources?: Record<string, unknown>[];
    next_cursor?: string;
  };
  if (!res.ok) throw new Error(data.error?.message || "Cloudinary list failed");
  return {
    items: (data.resources ?? []).map(mapResource).filter((item): item is CloudinaryMedia => Boolean(item)),
    next: data.next_cursor,
  };
}

export async function searchCloudinaryMedia(query = "", tag = ""): Promise<CloudinaryMedia[]> {
  const wantedTag = tag.trim();
  const q = query.trim().toLowerCase();
  const seen = new Set<string>();
  const items: CloudinaryMedia[] = [];
  let cursor: string | undefined;
  for (let page = 0; page < 4; page += 1) {
    const batch = await listFolderPage(cursor);
    for (const item of batch.items) {
      if (seen.has(item.publicId)) continue;
      if (wantedTag && !item.tags.some((entry) => entry.toLowerCase() === wantedTag.toLowerCase())) {
        continue;
      }
      if (q) {
        const haystack = [item.publicId, item.tags.join(" "), item.context.alt, item.context.kind, item.context.post]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        if (!haystack.includes(q)) continue;
      }
      seen.add(item.publicId);
      items.push(item);
    }
    if (!batch.next || items.length >= 80) break;
    cursor = batch.next;
  }
  return items.slice(0, 80);
}

export async function addCloudinaryTags(publicId: string, tags: string[]) {
  const { cloud, apiKey, secret } = credentials();
  const clean = sanitizeTags(tags);
  if (!publicId.trim() || clean.length === 0) return;
  for (const tag of clean) {
    const timestamp = String(Math.floor(Date.now() / 1000));
    const params = {
      timestamp,
      tag,
      public_ids: publicId,
      command: "add",
    };
    const signature = sign(params, secret);
    const body = new URLSearchParams({
      ...params,
      api_key: apiKey,
      signature,
    });
    const res = await fetch(`https://api.cloudinary.com/v1_1/${cloud}/image/tags`, {
      method: "POST",
      body,
    });
    const data = (await res.json()) as { error?: { message?: string } };
    if (!res.ok) throw new Error(data.error?.message || "Failed to tag media");
  }
}

export async function exportDrawioPng(xml: string): Promise<Buffer> {
  const payload = xml.trim();
  if (!payload) throw new Error("Draw.io source is empty");
  const jsonBody = JSON.stringify({
    xml: payload,
    format: "png",
    scale: 2,
    border: 8,
    background: "#ffffff",
    embedImages: true,
  });
  const form = new URLSearchParams({
    format: "png",
    xml: payload,
    filename: "diagram.png",
    bg: "#ffffff",
    scale: "2",
    border: "8",
  });
  const attempts: { url: string; headers: Record<string, string>; body: string | URLSearchParams }[] = [
    {
      url: "https://exp.draw.io/ImageExport4/export",
      headers: { "Content-Type": "application/json" },
      body: jsonBody,
    },
    {
      url: "https://export.diagrams.net/",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: form,
    },
    {
      url: "https://convert.diagrams.net/node/export",
      headers: { "Content-Type": "application/json" },
      body: jsonBody,
    },
  ];
  let lastError = "Draw.io export failed";
  for (const attempt of attempts) {
    try {
      const res = await fetch(attempt.url, {
        method: "POST",
        headers: attempt.headers,
        body: attempt.body,
        signal: AbortSignal.timeout(25000),
      });
      if (!res.ok) {
        lastError = `Draw.io export failed (${res.status})`;
        continue;
      }
      const type = res.headers.get("content-type") || "";
      if (type.includes("json")) {
        const data = (await res.json()) as { data?: string; error?: string };
        if (data.error) {
          lastError = data.error;
          continue;
        }
        if (data.data) return Buffer.from(data.data.replace(/^data:image\/\w+;base64,/, ""), "base64");
      }
      const buffer = Buffer.from(await res.arrayBuffer());
      if (buffer.length > 80) return buffer;
    } catch (error) {
      lastError = error instanceof Error ? error.message : lastError;
    }
  }
  throw new Error(lastError);
}

/** Insert f_auto,q_auto (and a width cap for images) into a Cloudinary delivery URL. */
export function optimizeCloudinaryUrl(url: string, resourceType: "image" | "video" | "raw" = "image") {
  if (!url.includes("res.cloudinary.com") || !url.includes("/upload/")) return url;
  if (/\/upload\/[^/]*f_auto/.test(url)) return url;
  if (resourceType === "raw") return url;
  const transform = resourceType === "video" ? "f_auto,q_auto" : "f_auto,q_auto,c_limit,w_1600";
  return url.replace("/upload/", `/upload/${transform}/`);
}

export function isCloudinaryUrl(url: string) {
  try {
    return new URL(url).hostname.endsWith("res.cloudinary.com");
  } catch {
    return false;
  }
}

export function isVideoUrl(url: string) {
  return /\.(mp4|webm|mov)(\?|$)/i.test(url) || url.includes("/video/upload/");
}
