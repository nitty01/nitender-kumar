export type MediaKind = "image" | "mermaid" | "drawio" | "diagram";

export type CloudinaryMedia = {
  publicId: string;
  url: string;
  thumbUrl: string;
  format: string | null;
  bytes: number;
  width: number | null;
  height: number | null;
  createdAt: string;
  tags: string[];
  context: Record<string, string>;
};

export function sanitizeMediaToken(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 48);
}

export function blogMediaTags(kind: MediaKind, slug: string, topics: string[] = []) {
  const tags = ["blog", kind];
  if (kind === "mermaid" || kind === "drawio") tags.push("diagram");
  const post = sanitizeMediaToken(slug);
  if (post) tags.push(`post-${post}`);
  for (const topic of topics) {
    const token = sanitizeMediaToken(topic);
    if (token) tags.push(`topic-${token}`);
  }
  return [...new Set(tags)].slice(0, 20);
}

export function blogMediaContext(kind: MediaKind, slug: string, alt = "") {
  return {
    kind,
    post: sanitizeMediaToken(slug) || "draft",
    alt: alt.slice(0, 120),
  };
}
