export type ContentBlock =
  | { type: "markdown"; content: string }
  | { type: "mermaid"; content: string }
  | { type: "drawio"; content: string; format: "xml" | "url" }
  | { type: "code"; lang: string; content: string };

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

export function isDrawioSource(raw: string): boolean {
  const value = raw.trim();
  if (/\.(drawio|dio)(\?|$)/i.test(value)) return true;
  if (/viewer\.diagrams\.net|embed\.diagrams\.net|app\.diagrams\.net/i.test(value)) return true;
  return value.includes("<mxfile") || value.includes("<mxGraphModel");
}

function fenceKind(lang: string, body: string): ContentBlock["type"] {
  const name = lang.toLowerCase();
  if (name === "mermaid") return "mermaid";
  if (name === "drawio" || name === "diagrams.net" || name === "mxfile") return "drawio";
  if (body.includes("<mxfile") || body.includes("<mxGraphModel")) return "drawio";
  return "code";
}

function drawioFormat(body: string): "xml" | "url" {
  const trimmed = body.trim();
  if (trimmed.includes("<mxfile") || trimmed.includes("<mxGraphModel")) return "xml";
  if (/^https?:\/\//i.test(trimmed) || trimmed.startsWith("/")) return "url";
  return "xml";
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
  const img = `<img alt="${safeAlt}" src="${optimized.replace(/"/g, "&quot;")}" loading="lazy" />`;
  if (!safeAlt) return img;
  return `<figure class="blog-figure">${img}<figcaption>${safeAlt}</figcaption></figure>`;
}

function splitDrawioImages(markdown: string): ContentBlock[] {
  const parts: ContentBlock[] = [];
  const re = /!\[([^\]]*)\]\(([^)]+)\)/g;
  let last = 0;
  let match: RegExpExecArray | null;
  while ((match = re.exec(markdown))) {
    const src = match[2].trim();
    if (!isDrawioSource(src)) continue;
    if (match.index > last) {
      parts.push({ type: "markdown", content: markdown.slice(last, match.index) });
    }
    parts.push({ type: "drawio", content: src, format: "url" });
    last = match.index + match[0].length;
  }
  if (last === 0) return [{ type: "markdown", content: markdown }];
  if (last < markdown.length) {
    parts.push({ type: "markdown", content: markdown.slice(last) });
  }
  return parts.filter((part) => part.type !== "markdown" || part.content.trim());
}

export function splitMarkdownWithMermaid(source: string): ContentBlock[] {
  const parts: ContentBlock[] = [];
  const re = /```([a-zA-Z0-9._-]*)[^\n]*\n([\s\S]*?)```/g;
  let last = 0;
  let match: RegExpExecArray | null;
  while ((match = re.exec(source))) {
    if (match.index > last) {
      parts.push(...splitDrawioImages(source.slice(last, match.index)));
    }
    const lang = match[1] || "";
    const body = match[2].trim();
    const kind = fenceKind(lang, body);
    if (kind === "mermaid") parts.push({ type: "mermaid", content: body });
    else if (kind === "drawio") parts.push({ type: "drawio", content: body, format: drawioFormat(body) });
    else parts.push({ type: "code", lang, content: body });
    last = match.index + match[0].length;
  }
  if (last < source.length) {
    parts.push(...splitDrawioImages(source.slice(last)));
  }
  return parts.filter((part) => part.content.trim());
}

function escapeHtml(source: string) {
  return source.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/** Small Markdown subset used by admin preview and the public post. */
export function renderSimpleMarkdown(source: string) {
  const escaped = escapeHtml(source);

  const withBlocks = escaped
    .replace(/^#{6} (.*)$/gm, "<h6>$1</h6>")
    .replace(/^#{5} (.*)$/gm, "<h5>$1</h5>")
    .replace(/^#{4} (.*)$/gm, "<h4>$1</h4>")
    .replace(/^### (.*)$/gm, "<h3>$1</h3>")
    .replace(/^## (.*)$/gm, "<h2>$1</h2>")
    .replace(/^# (.*)$/gm, "<h2>$1</h2>")
    .replace(/^---$/gm, "<hr />")
    .replace(/^(?:&gt; ?.*(?:\n|$))+/gm, (block) => {
      const text = block
        .trim()
        .split("\n")
        .map((line) => line.replace(/^&gt; ?/, ""))
        .join("<br />");
      return `<blockquote>${text}</blockquote>\n`;
    })
    .replace(/^\d+\. (.*)$/gm, "<li data-ol=\"1\">$1</li>")
    .replace(/^\- (.*)$/gm, "<li>$1</li>")
    .replace(/(?:<li data-ol="1">.*<\/li>\n?)+/g, (block) =>
      `<ol>${block.replace(/ data-ol="1"/g, "")}</ol>`,
    )
    .replace(/(?:<li>.*<\/li>\n?)+/g, (block) => `<ul>${block}</ul>`)
    .replace(/!\[([^\]]*)\]\(([^)]+)\)/g, (_match, alt: string, src: string) => mediaHtml(alt, src))
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_match, label: string, href: string) => {
      const safe = safeHref(href);
      if (!safe) return label;
      return `<a href="${safe.replace(/"/g, "&quot;")}" rel="noopener noreferrer" target="_blank">${label}</a>`;
    })
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/(^|[\s(])\*([^*\n]+)\*(?=[\s).,]|$)/g, "$1<em>$2</em>")
    .replace(/`([^`]+)`/g, "<code>$1</code>");

  return withBlocks
    .split(/\n{2,}/)
    .map((chunk) => {
      const trimmed = chunk.trim();
      if (!trimmed) return "";
      if (/^<(h[2-6]|ul|ol|li|img|video|a|blockquote|hr|figure|pre|p)\b/i.test(trimmed)) {
        return trimmed;
      }
      return `<p>${trimmed.replace(/\n/g, "<br />")}</p>`;
    })
    .join("\n");
}
