export type ContentBlock =
  | { type: "markdown"; content: string }
  | { type: "mermaid"; content: string };

function safeHref(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed || trimmed.startsWith("//")) return null;
  if (trimmed.startsWith("/") && !trimmed.startsWith("//")) {
    if (trimmed.includes("\\") || trimmed.includes(":")) return null;
    return trimmed;
  }
  try {
    const url = new URL(trimmed);
    if (url.protocol !== "http:" && url.protocol !== "https:" && url.protocol !== "mailto:") {
      return null;
    }
    return url.href;
  } catch {
    return null;
  }
}

function safeMediaSrc(raw: string): string | null {
  const href = safeHref(raw);
  if (!href) return null;
  if (href.startsWith("mailto:")) return null;
  return href;
}

function mediaHtml(alt: string, src: string) {
  const safe = safeMediaSrc(src);
  if (!safe) return "";
  const safeAlt = alt.replace(/"/g, "&quot;");
  const safeSrc = safe.replace(/"/g, "&quot;");
  const isVideo = /\.(mp4|webm|mov)(\?|$)/i.test(safe) || safe.includes("/video/upload/");
  if (isVideo) {
    return `<video src="${safeSrc}" controls playsinline preload="metadata" title="${safeAlt}"></video>`;
  }
  if (/\.pdf(\?|$)/i.test(safe) || safe.includes("/raw/upload/")) {
    return `<a href="${safeSrc}" rel="noopener noreferrer" target="_blank">${safeAlt || "Open file"}</a>`;
  }
  const optimized =
    safe.includes("res.cloudinary.com") && safe.includes("/upload/") && !safe.includes("f_auto")
      ? safe.replace("/upload/", "/upload/f_auto,q_auto,c_limit,w_1600/")
      : safe;
  return `<img alt="${safeAlt}" src="${optimized.replace(/"/g, "&quot;")}" loading="lazy" />`;
}

export function splitMarkdownWithMermaid(source: string): ContentBlock[] {
  const parts: ContentBlock[] = [];
  const re = /```mermaid\n([\s\S]*?)```/gi;
  let last = 0;
  let match: RegExpExecArray | null;
  while ((match = re.exec(source))) {
    if (match.index > last) {
      parts.push({ type: "markdown", content: source.slice(last, match.index) });
    }
    parts.push({ type: "mermaid", content: match[1].trim() });
    last = match.index + match[0].length;
  }
  if (last < source.length) {
    parts.push({ type: "markdown", content: source.slice(last) });
  }
  return parts.filter((part) => part.content.trim());
}

/** Small Markdown subset: headings, paragraphs, links, images, bold, lists. */
export function renderSimpleMarkdown(source: string) {
  const escaped = source
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

  const withBlocks = escaped
    .replace(/^### (.*)$/gm, "<h3>$1</h3>")
    .replace(/^## (.*)$/gm, "<h2>$1</h2>")
    .replace(/^# (.*)$/gm, "<h1>$1</h1>")
    .replace(/^\- (.*)$/gm, "<li>$1</li>")
    .replace(/(<li>.*<\/li>\n?)+/g, (block) => `<ul>${block}</ul>`)
    .replace(/!\[([^\]]*)\]\(([^)]+)\)/g, (_match, alt: string, src: string) => mediaHtml(alt, src))
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_match, label: string, href: string) => {
      const safe = safeHref(href);
      if (!safe) return label;
      return `<a href="${safe.replace(/"/g, "&quot;")}" rel="noopener noreferrer" target="_blank">${label}</a>`;
    })
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");

  return withBlocks
    .split(/\n{2,}/)
    .map((chunk) => {
      const trimmed = chunk.trim();
      if (!trimmed) return "";
      if (
        trimmed.startsWith("<h") ||
        trimmed.startsWith("<ul") ||
        trimmed.startsWith("<img") ||
        trimmed.startsWith("<video") ||
        trimmed.startsWith("<a")
      ) {
        return trimmed;
      }
      return `<p>${trimmed.replace(/\n/g, "<br />")}</p>`;
    })
    .join("\n");
}
