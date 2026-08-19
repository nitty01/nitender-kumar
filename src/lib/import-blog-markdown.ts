import {
  createBlockId,
  emptyBlock,
  isArticleLayout,
  type ArticleLayout,
  type BlogBlock,
  type UnparsedBlock,
} from "@/lib/blog-blocks";
import { isDrawioSource, splitMarkdownWithMermaid } from "@/lib/markdown";

export { countUnparsed } from "@/lib/blog-blocks";

export type ImportIssue = {
  id: string;
  blockId?: string;
  severity: "info" | "warn";
  message: string;
};

export type UnparsedAs =
  | "paragraph"
  | "heading"
  | "quote"
  | "pullquote"
  | "list"
  | "mermaid"
  | "drawio"
  | "divider";

export const UNPARSED_AS: { as: UnparsedAs; label: string }[] = [
  { as: "paragraph", label: "Text" },
  { as: "heading", label: "Heading" },
  { as: "quote", label: "Quote" },
  { as: "pullquote", label: "Pull quote" },
  { as: "list", label: "List" },
  { as: "mermaid", label: "Mermaid" },
  { as: "drawio", label: "Draw.io" },
  { as: "divider", label: "Break" },
];

export type BlogImportResult = {
  title: string;
  slug: string;
  excerpt: string;
  topics: string[];
  layout: ArticleLayout;
  heroUrl: string;
  blocks: BlogBlock[];
  issues: ImportIssue[];
};

function issue(severity: ImportIssue["severity"], message: string, blockId?: string): ImportIssue {
  return { id: createBlockId(), severity, message, blockId };
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80);
}

function unparsed(raw: string, reason: string): UnparsedBlock {
  return { id: createBlockId(), type: "unparsed", raw, reason };
}

function parseTopics(value: string) {
  return value
    .replace(/^\[/, "")
    .replace(/\]$/, "")
    .split(/[,;]/)
    .map((item) => item.trim().replace(/^["']|["']$/g, ""))
    .filter(Boolean)
    .slice(0, 8);
}

function parseFrontMatter(source: string) {
  const text = source.replace(/^\uFEFF/, "").replace(/\r\n/g, "\n");
  if (!text.startsWith("---\n") && text !== "---") {
    return { meta: {} as Record<string, string>, body: text };
  }
  const end = text.indexOf("\n---", 3);
  if (end < 0) return { meta: {} as Record<string, string>, body: text };
  const raw = text.slice(4, end);
  const body = text.slice(end + 4).replace(/^\n/, "");
  const meta: Record<string, string> = {};
  for (const line of raw.split("\n")) {
    const match = line.match(/^([A-Za-z][\w-]*):\s*(.*)$/);
    if (!match) continue;
    meta[match[1].toLowerCase()] = match[2].trim().replace(/^["']|["']$/g, "");
  }
  return { meta, body };
}

function looksLikeMermaid(text: string) {
  return /^(flowchart|graph|sequenceDiagram|classDiagram|stateDiagram|erDiagram|journey|gantt|pie|mindmap)\b/m.test(
    text.trim(),
  );
}

export function suggestedUnparsedAs(raw: string): UnparsedAs {
  const text = raw.trim();
  if (text.includes("<mxfile") || text.includes("<mxGraphModel") || isDrawioSource(text)) return "drawio";
  if (looksLikeMermaid(text.replace(/^```(?:mermaid)?\s*|\s*```$/g, ""))) return "mermaid";
  if (/^#{1,3}\s+\S/m.test(text) && text.split("\n").length <= 2) return "heading";
  if (text.split("\n").filter(Boolean).every((line) => /^[-*+]\s+|^\d+\.\s+/.test(line.trim()))) {
    return "list";
  }
  if (text.split("\n").every((line) => !line.trim() || line.startsWith(">"))) return "quote";
  if (/^(-{3,}|\*{3,}|_{3,})$/.test(text)) return "divider";
  return "paragraph";
}

export function resolveUnparsed(raw: string, as: UnparsedAs, id = createBlockId()): BlogBlock {
  const text = raw.trim();
  if (as === "heading") {
    return { id, type: "heading", level: 2, text: text.replace(/^#+\s*/, "") };
  }
  if (as === "quote") {
    const body = text
      .split("\n")
      .map((line) => line.replace(/^>\s?/, ""))
      .join("\n")
      .trim();
    const cited = body.match(/^([\s\S]*)\n(?:—|--|–)\s*(.+)$/);
    if (cited) return { id, type: "quote", text: cited[1].trim(), cite: cited[2].trim() };
    return { id, type: "quote", text: body };
  }
  if (as === "pullquote") {
    return {
      id,
      type: "pullquote",
      text: text.replace(/^>\s?/gm, "").trim(),
    };
  }
  if (as === "list") {
    const items = text
      .split("\n")
      .map((line) => line.replace(/^\s*(?:[-*+]|\d+\.)\s+/, "").trim())
      .filter(Boolean);
    return {
      id,
      type: "list",
      ordered: /^\s*\d+\./.test(text),
      items: items.length ? items : [text],
    };
  }
  if (as === "mermaid") {
    return {
      id,
      type: "mermaid",
      chart: text.replace(/^```(?:mermaid)?\s*/i, "").replace(/\s*```$/, "").trim(),
    };
  }
  if (as === "drawio") {
    const source = text.replace(/^```(?:drawio|diagrams\.net|mxfile)?\s*/i, "").replace(/\s*```$/, "").trim();
    return {
      id,
      type: "drawio",
      source,
      format: source.includes("<mxfile") || source.includes("<mxGraphModel") ? "xml" : "url",
    };
  }
  if (as === "divider") return { id, type: "divider" };
  return { id, type: "paragraph", text };
}

function parseQuote(lines: string[]) {
  const body = lines.join("\n").trim();
  const cited = body.match(/^([\s\S]*)\n+(?:—|--|–)\s*(.+)$/);
  if (cited) {
    return {
      id: createBlockId(),
      type: "quote" as const,
      text: cited[1].trim(),
      cite: cited[2].trim(),
    };
  }
  return { id: createBlockId(), type: "quote" as const, text: body };
}

function parseMarkdownFlow(source: string, issues: ImportIssue[]): BlogBlock[] {
  const lines = source.replace(/\r\n/g, "\n").split("\n");
  const blocks: BlogBlock[] = [];
  let i = 0;

  while (i < lines.length) {
    while (i < lines.length && !lines[i].trim()) i += 1;
    if (i >= lines.length) break;
    const line = lines[i];

    const heading = line.match(/^(#{1,6})\s+(.*)$/);
    if (heading) {
      const depth = heading[1].length;
      const text = heading[2].trim();
      const block: BlogBlock = {
        id: createBlockId(),
        type: "heading",
        level: depth >= 3 ? 3 : 2,
        text,
      };
      if (depth === 1) {
        issues.push(issue("info", "Converted a top-level heading into a section heading.", block.id));
      }
      if (depth >= 4) {
        issues.push(issue("info", `H${depth} was stored as a subsection heading.`, block.id));
      }
      blocks.push(block);
      i += 1;
      continue;
    }

    if (/^(-{3,}|\*{3,}|_{3,})$/.test(line.trim())) {
      blocks.push({ id: createBlockId(), type: "divider" });
      i += 1;
      continue;
    }

    if (i + 1 < lines.length && /^=+$/.test(lines[i + 1].trim()) && line.trim()) {
      blocks.push({ id: createBlockId(), type: "heading", level: 2, text: line.trim() });
      i += 2;
      continue;
    }
    if (
      i + 1 < lines.length &&
      /^-+$/.test(lines[i + 1].trim()) &&
      line.trim() &&
      !line.includes("|")
    ) {
      blocks.push({ id: createBlockId(), type: "heading", level: 2, text: line.trim() });
      i += 2;
      continue;
    }

    if (line.trim().startsWith("<!--")) {
      while (i < lines.length && !lines[i].includes("-->")) i += 1;
      i += 1;
      continue;
    }

    if (line.includes("|") && i + 1 < lines.length && /^\s*\|?\s*:?-+:?/.test(lines[i + 1])) {
      const start = i;
      i += 2;
      while (i < lines.length && lines[i].includes("|")) i += 1;
      const raw = lines.slice(start, i).join("\n");
      const block = unparsed(raw, "Markdown tables are not a blog block. Convert to a list or paragraph.");
      issues.push(issue("warn", block.reason, block.id));
      blocks.push(block);
      continue;
    }

    if (/^<\/?[a-zA-Z]/.test(line.trim())) {
      const start = i;
      const tag = line.trim().match(/^<\/?([a-zA-Z][\w-]*)/)?.[1];
      i += 1;
      if (tag && !new RegExp(`</${tag}>`, "i").test(line) && !/\/>/.test(line)) {
        while (i < lines.length && !new RegExp(`</${tag}>`, "i").test(lines[i])) i += 1;
        if (i < lines.length) i += 1;
      }
      const raw = lines.slice(start, i).join("\n");
      const block = unparsed(raw, "HTML is not a native blog block. Convert it or paste the text.");
      issues.push(issue("warn", block.reason, block.id));
      blocks.push(block);
      continue;
    }

    if (/^>\s?/.test(line)) {
      const quoted: string[] = [];
      while (i < lines.length && (/^>\s?/.test(lines[i]) || (quoted.length && lines[i].trim() === ""))) {
        if (lines[i].trim() === "" && i + 1 < lines.length && !/^>/.test(lines[i + 1])) break;
        quoted.push(lines[i].replace(/^>\s?/, ""));
        i += 1;
      }
      blocks.push(parseQuote(quoted));
      continue;
    }

    if (/^\s*[-*+]\s+/.test(line) || /^\s*\d+\.\s+/.test(line)) {
      const ordered = /^\s*\d+\.\s+/.test(line);
      const items: string[] = [];
      while (i < lines.length) {
        const current = lines[i];
        if (!current.trim()) {
          if (
            i + 1 < lines.length &&
            (/^\s*[-*+]\s+|^\s*\d+\.\s+/.test(lines[i + 1]) || /^\s{2,}\S/.test(lines[i + 1]))
          ) {
            i += 1;
            continue;
          }
          break;
        }
        const item = current.match(/^\s*(?:[-*+]|\d+\.)\s+(.*)$/);
        if (item) {
          items.push(item[1]);
          i += 1;
          continue;
        }
        if (/^\s{2,}\S/.test(current) && items.length) {
          items[items.length - 1] += ` ${current.trim()}`;
          i += 1;
          continue;
        }
        break;
      }
      blocks.push({
        id: createBlockId(),
        type: "list",
        ordered,
        items: items.length ? items : [line],
      });
      continue;
    }

    const image = line.trim().match(/^!\[([^\]]*)\]\(([^)]+)\)$/);
    if (image) {
      i += 1;
      let caption = image[1].trim();
      const italic = i < lines.length ? lines[i].trim().match(/^\*(.+)\*$/) : null;
      if (italic) {
        caption = italic[1].trim();
        i += 1;
      }
      const url = image[2].trim();
      if (isDrawioSource(url)) {
        blocks.push({ id: createBlockId(), type: "drawio", source: url, format: "url" });
      } else {
        blocks.push({
          id: createBlockId(),
          type: "image",
          url,
          alt: image[1].trim() || caption,
          caption: caption || undefined,
          layout: "column",
        });
      }
      continue;
    }

    const start = i;
    while (i < lines.length && lines[i].trim()) {
      const next = lines[i];
      if (
        /^(#{1,6})\s+/.test(next) ||
        /^>\s?/.test(next) ||
        /^!\[/.test(next) ||
        /^(-{3,}|\*{3,}|_{3,})$/.test(next.trim()) ||
        next.trim().startsWith("```")
      ) {
        break;
      }
      i += 1;
    }
    const raw = lines.slice(start, Math.max(i, start + 1)).join("\n").trim();
    if (!raw) {
      i += 1;
      continue;
    }
    if (((raw.match(/```/g) || []).length % 2) === 1) {
      const block = unparsed(raw, "Unclosed code fence. Close it with ``` or convert to Mermaid / Draw.io.");
      issues.push(issue("warn", block.reason, block.id));
      blocks.push(block);
      continue;
    }
    blocks.push({ id: createBlockId(), type: "paragraph", text: raw });
  }

  return blocks;
}

export function parseMarkdownBody(source: string): { blocks: BlogBlock[]; issues: ImportIssue[] } {
  const issues: ImportIssue[] = [];
  const blocks: BlogBlock[] = [];
  const parts = splitMarkdownWithMermaid(source);
  for (const part of parts) {
    if (part.type === "mermaid") {
      blocks.push({ id: createBlockId(), type: "mermaid", chart: part.content });
      continue;
    }
    if (part.type === "drawio") {
      blocks.push({
        id: createBlockId(),
        type: "drawio",
        source: part.content,
        format: part.format,
      });
      continue;
    }
    if (part.type === "code") {
      if (looksLikeMermaid(part.content)) {
        const block: BlogBlock = { id: createBlockId(), type: "mermaid", chart: part.content };
        issues.push(
          issue("info", `Treated a \`${part.lang || "code"}\` fence as Mermaid.`, block.id),
        );
        blocks.push(block);
        continue;
      }
      const block = unparsed(
        part.content,
        `Unknown fenced block${part.lang ? ` (${part.lang})` : ""}. Convert to Mermaid, Draw.io, or text.`,
      );
      issues.push(issue("warn", block.reason, block.id));
      blocks.push(block);
      continue;
    }
    blocks.push(...parseMarkdownFlow(part.content, issues));
  }
  return { blocks, issues };
}

export function importBlogMarkdown(source: string): BlogImportResult {
  const { meta, body } = parseFrontMatter(source);
  let remaining = body.trim();
  let title = meta.title || "";
  const h1 = remaining.match(/^#\s+(.+)\n?/);
  if (h1) {
    if (!title) title = h1[1].trim();
    remaining = remaining.slice(h1[0].length).trim();
  }

  const { blocks, issues } = parseMarkdownBody(remaining);

  const layout = isArticleLayout(meta.layout) ? meta.layout : "flow";
  const topics = parseTopics(meta.topics || meta.tags || "");
  const excerpt = meta.excerpt || meta.description || "";
  const heroUrl = meta.hero || meta.herourl || meta.image || "";
  const slug = slugify(meta.slug || title) || `draft-${Date.now().toString(36)}`;

  if (!title) issues.push(issue("warn", "No title found. Add a title: field or a # heading."));
  if (!excerpt) {
    const first = blocks.find((block) => block.type === "paragraph");
    issues.push(
      issue(
        "info",
        first
          ? "No excerpt in front matter. The first paragraph can be copied into the dek."
          : "No excerpt in front matter.",
      ),
    );
  }
  if (!isArticleLayout(meta.layout) && meta.layout) {
    issues.push(issue("info", `Unknown layout “${meta.layout}”. Using single-column flow.`));
  }

  const resolved = blocks.length ? blocks : [emptyBlock("paragraph")];
  const firstParagraph = resolved.find((block) => block.type === "paragraph");
  return {
    title: title || "Untitled draft",
    slug,
    excerpt:
      excerpt ||
      (firstParagraph && firstParagraph.type === "paragraph"
        ? firstParagraph.text.split("\n")[0].slice(0, 280)
        : ""),
    topics,
    layout,
    heroUrl,
    blocks: resolved,
    issues,
  };
}
