import { createHash } from "crypto";

const FOLDER = "nitender-kumar-portfolio/site-media";
const MAX_BYTES = 12 * 1024 * 1024;
const ALLOWED = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "video/mp4",
  "video/webm",
  "application/pdf",
]);

const ALLOWED_EXT = new Set(["jpg", "jpeg", "png", "webp", "gif", "mp4", "webm", "pdf"]);

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
};

export async function uploadToCloudinary(file: File): Promise<CloudinaryUpload> {
  const cloud = process.env.CLOUDINARY_CLOUD_NAME?.trim();
  const apiKey = process.env.CLOUDINARY_API_KEY?.trim();
  const secret = process.env.CLOUDINARY_API_SECRET?.trim();
  if (!cloud || !apiKey || !secret) {
    throw new Error("Cloudinary is not configured");
  }
  if (!ALLOWED.has(file.type)) {
    throw new Error("Unsupported file type");
  }
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
  if (!ALLOWED_EXT.has(ext)) {
    throw new Error("Unsupported file type");
  }
  if (file.size > MAX_BYTES) {
    throw new Error("File is larger than 12 MB");
  }

  const timestamp = String(Math.floor(Date.now() / 1000));
  const params = { folder: FOLDER, timestamp };
  const signature = sign(params, secret);

  const body = new FormData();
  body.set("file", file);
  body.set("api_key", apiKey);
  body.set("timestamp", timestamp);
  body.set("folder", FOLDER);
  body.set("signature", signature);

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
  };
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
