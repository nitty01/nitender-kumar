import {
  createBlockId,
  emptyBlock,
  isArticleLayout,
  type ArticleLayout,
  type BlogBlock,
  type UnparsedBlock,
} from "@/lib/blog-blocks";
import {
  BLOG_STRUCTURE_GUIDE,
  structureExample,
  type BlogStructureKind,
} from "@/lib/blog-markdown-template";
import { isDrawioSource, splitMarkdownWithMermaid } from "@/lib/markdown";

export { countUnparsed } from "@/lib/blog-blocks";
export { BLOG_MARKDOWN_TEMPLATE, BLOG_STRUCTURE_GUIDE } from "@/lib/blog-markdown-template";

export type ParseFailureCode =
  | "table"
  | "html"
  | "unclosed-fence"
  | "unknown-fence"
  | "malformed-image"
  | "empty-heading"
  | "mixed-list"
  | "incomplete-front-matter"
  | "empty-block"
  | "unsupported";

export type ParseDiagnostic = {
  code: ParseFailureCode;
  reason: string;
  hint: string;
  expected: BlogStructureKind | "paragraph-or-list";
  line?: number;
};

export type ImportIssue = {
  id: string;
  blockId?: string;
  severity: "info" | "warn";
  message: string;
  hint?: string;
  expected?: string;
  code?: ParseFailureCode;
  line?: number;
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
  sourceLineOffset: number;
};

function issue(
  severity: ImportIssue["severity"],
  message: string,
  extra: Partial<Omit<ImportIssue, "id" | "severity" | "message">> = {},
): ImportIssue {
  return { id: createBlockId(), severity, message, ...extra };
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80);
}

function unparsed(raw: string, diagnostic: ParseDiagnostic, line?: number): UnparsedBlock {
  return {
    id: createBlockId(),
    type: "unparsed",
    raw,
    reason: diagnostic.reason,
    hint: diagnostic.hint,
    expected: diagnostic.expected,
    code: diagnostic.code,
    line: line ?? diagnostic.line,
    example: structureExample(diagnostic.expected),
  };
}

function pushUnparsed(
  blocks: BlogBlock[],
  issues: ImportIssue[],
  raw: string,
  diagnostic: ParseDiagnostic,
  line?: number,
) {
  const block = unparsed(raw, diagnostic, line);
  issues.push(
    issue("warn", diagnostic.reason, {
      blockId: block.id,
      hint: diagnostic.hint,
      expected: diagnostic.expected,
      code: diagnostic.code,
      line: block.line,
    }),
  );
  blocks.push(block);
}

function lineNumber(source: string, index: number) {
  if (index <= 0) return 1;
  return source.slice(0, index).split("\n").length;
}

function diagnoseTable(_raw: string): ParseDiagnostic {
  return {
    code: "table",
    reason: "Markdown tables are not imported as a blog block.",
    hint:
      "Convert this table to a bullet list or plain paragraphs. Each row can become `- Column: value`.",
    expected: "list",
    line: undefined,
  };
}

function diagnoseHtml(raw: string, tag?: string): ParseDiagnostic {
  const name = tag ? `<${tag}>` : "HTML";
  return {
    code: "html",
    reason: `${name} markup is not a native blog block.`,
    hint: "Remove tags and keep the text as a paragraph, or convert lists/tables to markdown list syntax.",
    expected: "paragraph",
  };
}

function diagnoseUnclosedFence(raw: string): ParseDiagnostic {
  const opens = (raw.match(/```/g) || []).length;
  return {
    code: "unclosed-fence",
    reason: `Code fence is not closed (${opens} \`\`\` marker${opens === 1 ? "" : "s"} found; need an even count).`,
    hint: "Add a closing ``` on its own line, or rename the opening fence to ```mermaid or ```drawio.",
    expected: "mermaid",
  };
}

function diagnoseUnknownFence(lang: string, raw: string): ParseDiagnostic {
  const trimmed = lang.trim().toLowerCase();
  if (looksLikeMermaid(raw)) {
    return {
      code: "unknown-fence",
      reason: `Fence uses \`${lang || "code"}\` but the body looks like Mermaid.`,
      hint: "Change the opening line to ```mermaid and keep the chart body as-is.",
      expected: "mermaid",
    };
  }
  if (raw.includes("<mxfile") || raw.includes("<mxGraphModel")) {
    return {
      code: "unknown-fence",
      reason: `Fence uses \`${lang || "code"}\` but the body looks like Draw.io XML.`,
      hint: "Change the opening line to ```drawio.",
      expected: "drawio",
    };
  }
  return {
    code: "unknown-fence",
    reason: `Fenced block language \`${lang || "unknown"}\` is not supported.`,
    hint: "Use ```mermaid or ```drawio, or remove the fence and convert the content to a paragraph or list.",
    expected: "paragraph",
  };
}

function diagnoseMalformedImage(raw: string): ParseDiagnostic {
  if (/^!\[/.test(raw) && !/\]\([^)]+\)/.test(raw)) {
    return {
      code: "malformed-image",
      reason: "Image syntax is incomplete — missing ](url).",
      hint: "Use ![alt text](/path-or-url.png) on one line.",
      expected: "image",
    };
  }
  if (/^!\[[^\]]*\]\(\s*\)/.test(raw.trim())) {
    return {
      code: "malformed-image",
      reason: "Image URL is empty.",
      hint: "Add a path or URL inside the parentheses: ![alt](/assets/images/example.png).",
      expected: "image",
    };
  }
  return {
    code: "malformed-image",
    reason: "Image line could not be parsed.",
    hint: "Use ![alt text](url) exactly — alt in brackets, URL in parentheses.",
    expected: "image",
  };
}

function diagnoseMixedList(raw: string): ParseDiagnostic {
  return {
    code: "mixed-list",
    reason: "List mixes bullet (-) and numbered (1.) markers in the same block.",
    hint: "Use only bullets or only numbers for one list. Split into two lists if needed.",
    expected: "list",
  };
}

function diagnoseEmptyHeading(raw: string): ParseDiagnostic {
  return {
    code: "empty-heading",
    reason: "Heading has no text after the # markers.",
    hint: "Add a title after ## or ###, e.g. ## Section title.",
    expected: "heading",
  };
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

function parseFrontMatter(source: string, issues: ImportIssue[]) {
  const text = source.replace(/^\uFEFF/, "").replace(/\r\n/g, "\n");
  if (!text.startsWith("---") && text !== "---") {
    return { meta: {} as Record<string, string>, body: text, lineOffset: 0 };
  }
  const end = text.indexOf("\n---", 3);
  if (end < 0) {
    issues.push(
      issue("warn", "Front matter opens with --- but has no closing ---.", {
        code: "incomplete-front-matter",
        expected: "front-matter",
        hint: "Add a closing --- on its own line after title, slug, excerpt, and other keys.",
        line: 1,
      }),
    );
    return { meta: {} as Record<string, string>, body: text, lineOffset: 0 };
  }
  const raw = text.slice(4, end);
  const body = text.slice(end + 4).replace(/^\n/, "");
  const meta: Record<string, string> = {};
  const bodyLineOffset = text.slice(0, end + 4).split("\n").length;
  raw.split("\n").forEach((line, index) => {
    const match = line.match(/^([A-Za-z][\w-]*):\s*(.*)$/);
    if (!match) {
      if (line.trim()) {
        issues.push(
          issue("info", `Front matter line ${index + 2} is not key: value — skipped.`, {
            line: index + 2,
            expected: "front-matter",
            hint: "Use title: My post, slug: my-post, excerpt: …, topics: A, B, layout: flow, hero: /url.",
          }),
        );
      }
      return;
    }
    meta[match[1].toLowerCase()] = match[2].trim().replace(/^["']|["']$/g, "");
  });
  return { meta, body, lineOffset: bodyLineOffset };
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

function listUsesBullets(line: string) {
  return /^\s*[-*+]\s+/.test(line);
}

function listUsesNumbers(line: string) {
  return /^\s*\d+\.\s+/.test(line);
}

function parseMarkdownFlow(
  source: string,
  issues: ImportIssue[],
  lineOffset = 0,
): BlogBlock[] {
  const lines = source.replace(/\r\n/g, "\n").split("\n");
  const blocks: BlogBlock[] = [];
  let i = 0;

  while (i < lines.length) {
    while (i < lines.length && !lines[i].trim()) i += 1;
    if (i >= lines.length) break;
    const line = lines[i];
    const atLine = i + 1 + lineOffset;

    const heading = line.match(/^(#{1,6})\s+(.*)$/);
    if (heading) {
      const depth = heading[1].length;
      const text = heading[2].trim();
      if (!text) {
        pushUnparsed(blocks, issues, line, diagnoseEmptyHeading(line), atLine);
        i += 1;
        continue;
      }
      const block: BlogBlock = {
        id: createBlockId(),
        type: "heading",
        level: depth >= 3 ? 3 : 2,
        text,
      };
      if (depth === 1) {
        issues.push(
          issue("info", "Converted a top-level # heading into a section heading.", {
            blockId: block.id,
            expected: "heading",
            hint: "Prefer title: in front matter; use ## for sections in the body.",
            line: atLine,
          }),
        );
      }
      if (depth >= 4) {
        issues.push(
          issue("info", `H${depth} was stored as a subsection (H3).`, {
            blockId: block.id,
            expected: "heading",
            line: atLine,
          }),
        );
      }
      blocks.push(block);
      i += 1;
      continue;
    }

    if (/^#{1,6}\s*$/.test(line.trim())) {
      pushUnparsed(blocks, issues, line, diagnoseEmptyHeading(line), atLine);
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
      pushUnparsed(blocks, issues, raw, diagnoseTable(raw), start + 1 + lineOffset);
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
      pushUnparsed(blocks, issues, raw, diagnoseHtml(raw, tag), start + 1 + lineOffset);
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
      const listStart = i;
      const ordered = listUsesNumbers(line);
      const items: string[] = [];
      let mixed = false;
      while (i < lines.length) {
        const current = lines[i];
        if (!current.trim()) {
          if (i + 1 < lines.length) {
            const next = lines[i + 1];
            if (/^\s{2,}\S/.test(next)) {
              i += 1;
              continue;
            }
            const continuesList =
              (ordered && listUsesNumbers(next)) || (!ordered && listUsesBullets(next));
            if (continuesList) {
              i += 1;
              continue;
            }
          }
          break;
        }
        const isBullet = listUsesBullets(current);
        const isNumber = listUsesNumbers(current);
        if (isBullet && ordered) mixed = true;
        if (isNumber && !ordered) mixed = true;
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
      if (mixed) {
        const raw = lines.slice(listStart, i).join("\n");
        pushUnparsed(blocks, issues, raw, diagnoseMixedList(raw), listStart + 1 + lineOffset);
        continue;
      }
      blocks.push({
        id: createBlockId(),
        type: "list",
        ordered,
        items: items.length ? items : [line.replace(/^\s*(?:[-*+]|\d+\.)\s+/, "")],
      });
      continue;
    }

    if (/^!\[/.test(line.trim())) {
      const image = line.trim().match(/^!\[([^\]]*)\]\(([^)]+)\)$/);
      if (!image) {
        pushUnparsed(blocks, issues, line, diagnoseMalformedImage(line), atLine);
        i += 1;
        continue;
      }
      i += 1;
      let caption = image[1].trim();
      const italic = i < lines.length ? lines[i].trim().match(/^\*(.+)\*$/) : null;
      if (italic) {
        caption = italic[1].trim();
        i += 1;
      }
      const url = image[2].trim();
      if (!url) {
        pushUnparsed(blocks, issues, line, diagnoseMalformedImage(line), atLine);
        continue;
      }
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
      pushUnparsed(blocks, issues, raw, diagnoseUnclosedFence(raw), start + 1 + lineOffset);
      continue;
    }
    blocks.push({ id: createBlockId(), type: "paragraph", text: raw });
  }

  return blocks;
}

export function parseMarkdownBody(
  source: string,
  lineOffset = 0,
): { blocks: BlogBlock[]; issues: ImportIssue[] } {
  const issues: ImportIssue[] = [];
  const blocks: BlogBlock[] = [];
  const parts = splitMarkdownWithMermaid(source);
  let cursor = 0;
  for (const part of parts) {
    const partStart = source.indexOf(part.content, cursor);
    const partLine = partStart >= 0 ? lineNumber(source, partStart) + lineOffset : lineOffset;
    cursor = partStart >= 0 ? partStart + part.content.length : cursor;
    if (part.type === "mermaid") {
      if (!part.content.trim()) {
        pushUnparsed(
          blocks,
          issues,
          "```mermaid\n```",
          {
            code: "empty-block",
            reason: "Mermaid fence is empty.",
            hint: "Add a chart after ```mermaid, e.g. flowchart LR with nodes and edges.",
            expected: "mermaid",
            line: partLine,
          },
          partLine,
        );
        continue;
      }
      blocks.push({ id: createBlockId(), type: "mermaid", chart: part.content });
      continue;
    }
    if (part.type === "drawio") {
      if (!part.content.trim()) {
        pushUnparsed(
          blocks,
          issues,
          "```drawio\n```",
          {
            code: "empty-block",
            reason: "Draw.io fence is empty.",
            hint: "Paste <mxfile> XML inside ```drawio … ``` or use a diagrams.net URL.",
            expected: "drawio",
            line: partLine,
          },
          partLine,
        );
        continue;
      }
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
          issue("info", `Treated a \`${part.lang || "code"}\` fence as Mermaid.`, {
            blockId: block.id,
            expected: "mermaid",
            hint: "Rename the fence to ```mermaid for clarity.",
            line: partLine,
          }),
        );
        blocks.push(block);
        continue;
      }
      const diagnostic = diagnoseUnknownFence(part.lang, part.content);
      pushUnparsed(blocks, issues, part.content, diagnostic, partLine);
      continue;
    }
    blocks.push(...parseMarkdownFlow(part.content, issues, partLine - 1));
  }
  return { blocks, issues };
}

export function importBlogMarkdown(source: string): BlogImportResult {
  const issues: ImportIssue[] = [];
  const { meta, body, lineOffset } = parseFrontMatter(source, issues);
  let remaining = body.trim();
  let title = meta.title || "";
  const h1 = remaining.match(/^#\s+(.+)\n?/);
  if (h1) {
    if (!title) title = h1[1].trim();
    remaining = remaining.slice(h1[0].length).trim();
  }

  const { blocks, issues: bodyIssues } = parseMarkdownBody(remaining, lineOffset);
  issues.push(...bodyIssues);

  const layout = isArticleLayout(meta.layout) ? meta.layout : "flow";
  const topics = parseTopics(meta.topics || meta.tags || "");
  const excerpt = meta.excerpt || meta.description || "";
  const heroUrl = meta.hero || meta.herourl || meta.image || "";
  const slug = slugify(meta.slug || title) || `draft-${Date.now().toString(36)}`;

  if (!title) {
    issues.push(
      issue("warn", "Missing title.", {
        expected: "front-matter",
        hint: "Add title: in front matter or a single # Heading at the top of the body.",
        line: 1,
      }),
    );
  }
  if (!meta.slug && title) {
    issues.push(
      issue("info", "No slug in front matter — one will be generated from the title.", {
        expected: "front-matter",
        hint: "Add slug: your-post-url for a stable URL.",
      }),
    );
  }
  if (!excerpt) {
    const first = blocks.find((block) => block.type === "paragraph");
    issues.push(
      issue(
        "info",
        first
          ? "Missing excerpt in front matter — the first paragraph can be copied into the dek."
          : "Missing excerpt in front matter.",
        {
          expected: "front-matter",
          hint: "Add excerpt: One-line summary for the blog index.",
        },
      ),
    );
  }
  if (!topics.length && (meta.topics || meta.tags)) {
    issues.push(
      issue("info", "Topics field was empty or could not be parsed.", {
        expected: "front-matter",
        hint: "Use topics: GenAI, Platform or topics: [GenAI, Platform].",
      }),
    );
  }
  if (!isArticleLayout(meta.layout) && meta.layout) {
    issues.push(
      issue("info", `Unknown layout “${meta.layout}”. Using single-column flow.`, {
        expected: "front-matter",
        hint: "Use layout: flow or layout: newspaper.",
      }),
    );
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
    sourceLineOffset: lineOffset,
  };
}

/** Re-parse a single unparsed snippet after inline edits. */
export function reparseUnparsedSnippet(raw: string): {
  blocks: BlogBlock[];
  issues: ImportIssue[];
} {
  const trimmed = raw.trim();
  if (!trimmed) {
    return {
      blocks: [],
      issues: [
        issue("warn", "Snippet is empty.", {
          code: "empty-block",
          hint: "Paste markdown or use Insert example from the structure guide.",
        }),
      ],
    };
  }
  return parseMarkdownBody(trimmed);
}

export function structureGuideLabels() {
  return BLOG_STRUCTURE_GUIDE.map((row) => row.label).join(", ");
}
