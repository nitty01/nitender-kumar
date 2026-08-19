import { isDrawioSource, splitMarkdownWithMermaid } from "@/lib/markdown";

export type BlockLayout = "column" | "wide";
export type ArticleLayout = "flow" | "newspaper";

type BlockBase = { id: string };

export type HeadingBlock = BlockBase & { type: "heading"; level: 2 | 3; text: string };
export type ParagraphBlock = BlockBase & { type: "paragraph"; text: string };
export type QuoteBlock = BlockBase & { type: "quote"; text: string; cite?: string };
export type PullquoteBlock = BlockBase & { type: "pullquote"; text: string };
export type ListBlock = BlockBase & { type: "list"; ordered: boolean; items: string[] };
export type ImageBlock = BlockBase & {
  type: "image";
  url: string;
  alt: string;
  caption?: string;
  layout: BlockLayout;
  publicId?: string;
};
export type DiagramExport = {
  exportUrl?: string;
  exportHash?: string;
  publicId?: string;
  caption?: string;
};
export type MermaidBlock = BlockBase & DiagramExport & { type: "mermaid"; chart: string };
export type DrawioBlock = BlockBase &
  DiagramExport & { type: "drawio"; source: string; format: "xml" | "url" };
export type DividerBlock = BlockBase & { type: "divider" };
export type UnparsedBlock = BlockBase & {
  type: "unparsed";
  raw: string;
  reason: string;
  hint?: string;
  expected?: string;
  code?: string;
  line?: number;
  example?: string;
};
export type SplitBlock = BlockBase & { type: "split"; left: BlogBlock[]; right: BlogBlock[] };

export type BlogBlock =
  | HeadingBlock
  | ParagraphBlock
  | QuoteBlock
  | PullquoteBlock
  | ListBlock
  | ImageBlock
  | MermaidBlock
  | DrawioBlock
  | DividerBlock
  | UnparsedBlock
  | SplitBlock;

export const BLOCK_TYPES = [
  "heading",
  "paragraph",
  "quote",
  "pullquote",
  "list",
  "image",
  "mermaid",
  "drawio",
  "divider",
  "unparsed",
  "split",
] as const;

export function createBlockId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `b-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

/** Compare hero and inline image paths without query strings or trailing slashes. */
export function normalizeAssetUrl(url: string): string {
  const trimmed = url.trim();
  if (!trimmed) return "";
  const base = trimmed.split("#")[0]?.split("?")[0] ?? trimmed;
  if (base.length > 1 && base.endsWith("/")) return base.slice(0, -1);
  return base;
}

export function assetUrlsMatch(a: string, b: string): boolean {
  const left = normalizeAssetUrl(a);
  const right = normalizeAssetUrl(b);
  return Boolean(left && right && left === right);
}

/** Drop body image blocks that repeat the article hero — hero already renders above the body. */
export function dedupeHeroImageBlocks(
  blocks: BlogBlock[],
  heroUrl: string | null | undefined,
): { blocks: BlogBlock[]; removed: ImageBlock[] } {
  if (!heroUrl?.trim()) return { blocks, removed: [] };
  const removed: ImageBlock[] = [];
  const kept = blocks.filter((block) => {
    if (block.type !== "image") return true;
    if (!assetUrlsMatch(block.url, heroUrl)) return true;
    removed.push(block);
    return false;
  });
  return { blocks: kept, removed };
}

export function isArticleLayout(value: unknown): value is ArticleLayout {
  return value === "newspaper" || value === "flow";
}

export function emptyBlock(type: BlogBlock["type"]): BlogBlock {
  const id = createBlockId();
  switch (type) {
    case "heading":
      return { id, type, level: 2, text: "" };
    case "paragraph":
      return { id, type, text: "" };
    case "quote":
      return { id, type, text: "" };
    case "pullquote":
      return { id, type, text: "" };
    case "list":
      return { id, type, ordered: false, items: [""] };
    case "image":
      return { id, type, url: "", alt: "", layout: "column" };
    case "mermaid":
      return { id, type, chart: "flowchart LR\n  A[Start] --> B[Outcome]" };
    case "drawio":
      return { id, type, source: DRAWIO_TEMPLATE, format: "xml" };
    case "split":
      return { id, type, left: [emptyBlock("paragraph")], right: [emptyBlock("paragraph")] };
    case "unparsed":
      return { id, type, raw: "", reason: "Needs a blog block type.", hint: "", expected: "paragraph" };
    default:
      return { id, type: "divider" };
  }
}

export const DRAWIO_TEMPLATE = `<mxfile host="app.diagrams.net">
  <diagram name="Diagram" id="page-1">
    <mxGraphModel dx="800" dy="500" grid="1" gridSize="10">
      <root>
        <mxCell id="0"/>
        <mxCell id="1" parent="0"/>
        <mxCell id="2" value="Start" style="rounded=1;whiteSpace=wrap;html=1;" vertex="1" parent="1">
          <mxGeometry x="40" y="40" width="140" height="60" as="geometry"/>
        </mxCell>
        <mxCell id="3" value="Outcome" style="rounded=1;whiteSpace=wrap;html=1;" vertex="1" parent="1">
          <mxGeometry x="260" y="40" width="140" height="60" as="geometry"/>
        </mxCell>
        <mxCell id="4" style="endArrow=classic;" edge="1" parent="1" source="2" target="3">
          <mxGeometry relative="1" as="geometry"/>
        </mxCell>
      </root>
    </mxGraphModel>
  </diagram>
</mxfile>`;

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function optionalString(value: unknown) {
  const text = typeof value === "string" ? value.trim() : "";
  return text || undefined;
}

function diagramFields(row: Record<string, unknown>): DiagramExport {
  return {
    exportUrl: optionalString(row.exportUrl),
    exportHash: optionalString(row.exportHash),
    publicId: optionalString(row.publicId),
    caption: optionalString(row.caption),
  };
}

function leafBlocks(raw: unknown): BlogBlock[] {
  return normalizeBlocks(raw).filter((block) => block.type !== "split");
}

export function normalizeBlocks(raw: unknown): BlogBlock[] {
  if (!Array.isArray(raw)) return [];
  const blocks: BlogBlock[] = [];
  for (const item of raw) {
    const row = asRecord(item);
    if (!row) continue;
    const type = String(row.type ?? "");
    const id = typeof row.id === "string" && row.id ? row.id : createBlockId();
    if (type === "heading") {
      blocks.push({
        id,
        type,
        level: row.level === 3 ? 3 : 2,
        text: String(row.text ?? ""),
      });
    } else if (type === "paragraph") {
      blocks.push({ id, type, text: String(row.text ?? "") });
    } else if (type === "quote") {
      blocks.push({
        id,
        type,
        text: String(row.text ?? ""),
        cite: String(row.cite ?? "") || undefined,
      });
    } else if (type === "pullquote") {
      blocks.push({ id, type, text: String(row.text ?? "") });
    } else if (type === "list") {
      const items = Array.isArray(row.items)
        ? row.items.map((entry) => String(entry)).filter((entry) => entry.trim())
        : [];
      blocks.push({ id, type, ordered: Boolean(row.ordered), items: items.length ? items : [""] });
    } else if (type === "image") {
      blocks.push({
        id,
        type,
        url: String(row.url ?? ""),
        alt: String(row.alt ?? ""),
        caption: String(row.caption ?? "") || undefined,
        layout: row.layout === "wide" ? "wide" : "column",
        publicId: optionalString(row.publicId),
      });
    } else if (type === "mermaid") {
      blocks.push({ id, type, chart: String(row.chart ?? ""), ...diagramFields(row) });
    } else if (type === "drawio") {
      blocks.push({
        id,
        type,
        source: String(row.source ?? ""),
        format: row.format === "url" ? "url" : "xml",
        ...diagramFields(row),
      });
    } else if (type === "split") {
      const left = leafBlocks(row.left);
      const right = leafBlocks(row.right);
      blocks.push({
        id,
        type,
        left: left.length ? left : [emptyBlock("paragraph")],
        right: right.length ? right : [emptyBlock("paragraph")],
      });
    } else if (type === "divider") {
      blocks.push({ id, type });
    } else if (type === "unparsed") {
      blocks.push({
        id,
        type,
        raw: String(row.raw ?? row.text ?? ""),
        reason: String(row.reason ?? "Needs a blog block type."),
        hint: optionalString(row.hint),
        expected: optionalString(row.expected),
        code: optionalString(row.code),
        line: typeof row.line === "number" ? row.line : undefined,
        example: optionalString(row.example),
      });
    }
  }
  return blocks;
}

export async function mapBlocksDeepAsync(
  blocks: BlogBlock[],
  fn: (block: BlogBlock) => Promise<BlogBlock>,
): Promise<BlogBlock[]> {
  const out: BlogBlock[] = [];
  for (const block of blocks) {
    if (block.type === "split") {
      const next = await fn(block);
      if (next.type !== "split") {
        out.push(next);
        continue;
      }
      out.push({
        ...next,
        left: await mapBlocksDeepAsync(next.left, fn),
        right: await mapBlocksDeepAsync(next.right, fn),
      });
      continue;
    }
    out.push(await fn(block));
  }
  return out;
}

export function diagramSourceHash(source: string) {
  let hash = 2166136261;
  for (let i = 0; i < source.length; i += 1) {
    hash ^= source.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16);
}

export function blocksToPlaintext(blocks: BlogBlock[]): string {
  return blocks
    .map((block) => {
      switch (block.type) {
        case "heading":
        case "paragraph":
        case "quote":
        case "pullquote":
          return block.text;
        case "list":
          return block.items.join("\n");
        case "image":
          return [block.alt, block.caption].filter(Boolean).join(" ");
        case "mermaid":
          return [block.caption, block.chart].filter(Boolean).join("\n");
        case "drawio":
          return block.caption || (block.format === "url" ? block.source : "");
        case "unparsed":
          return block.raw;
        case "split":
          return [blocksToPlaintext(block.left), blocksToPlaintext(block.right)]
            .filter(Boolean)
            .join("\n\n");
        default:
          return "";
      }
    })
    .filter(Boolean)
    .join("\n\n");
}

export function blocksToMarkdown(blocks: BlogBlock[]): string {
  return blocks
    .map((block) => {
      switch (block.type) {
        case "heading":
          return `${"#".repeat(block.level)} ${block.text}`.trim();
        case "paragraph":
          return block.text;
        case "quote":
          return block.text
            .split("\n")
            .map((line) => `> ${line}`)
            .join("\n");
        case "pullquote":
          return `> ${block.text}`;
        case "list":
          return block.items
            .map((item, index) => (block.ordered ? `${index + 1}. ${item}` : `- ${item}`))
            .join("\n");
        case "image":
          return `![${block.caption || block.alt}](${block.url})`;
        case "mermaid":
          return `\`\`\`mermaid\n${block.chart}\n\`\`\``;
        case "drawio":
          return `\`\`\`drawio\n${block.source}\n\`\`\``;
        case "unparsed":
          return block.raw;
        case "split":
          return [blocksToMarkdown(block.left), blocksToMarkdown(block.right)]
            .filter(Boolean)
            .join("\n\n");
        case "divider":
          return "---";
        default:
          return "";
      }
    })
    .filter(Boolean)
    .join("\n\n");
}

export function countUnparsed(blocks: BlogBlock[]): number {
  return blocks.reduce((sum, block) => {
    if (block.type === "unparsed") return sum + 1;
    if (block.type === "split") return sum + countUnparsed(block.left) + countUnparsed(block.right);
    return sum;
  }, 0);
}

export function replaceBlockById(blocks: BlogBlock[], id: string, next: BlogBlock[]): BlogBlock[] {
  const mapped: BlogBlock[] = [];
  for (const block of blocks) {
    if (block.id === id) {
      mapped.push(...next);
      continue;
    }
    if (block.type === "split") {
      const left = replaceBlockById(block.left, id, next);
      const right = replaceBlockById(block.right, id, next);
      mapped.push({
        ...block,
        left: left.length ? left : [emptyBlock("paragraph")],
        right: right.length ? right : [emptyBlock("paragraph")],
      });
      continue;
    }
    mapped.push(block);
  }
  return mapped.length ? mapped : [emptyBlock("paragraph")];
}

export function readingMinutes(text: string) {
  const words = text.trim() ? text.trim().split(/\s+/).length : 0;
  return Math.max(1, Math.round(words / 220));
}

function parseMarkdownChunk(chunk: string): BlogBlock[] {
  const text = chunk.trim();
  if (!text) return [];
  if (/^---$/.test(text)) return [emptyBlock("divider")];

  const heading = text.match(/^(#{1,3})\s+([\s\S]*)$/);
  if (heading) {
    const level = heading[1].length >= 3 ? 3 : 2;
    return [{ id: createBlockId(), type: "heading", level, text: heading[2].trim() }];
  }

  const quoteLines = text.split("\n");
  if (quoteLines.every((line) => line.startsWith(">"))) {
    const body = quoteLines.map((line) => line.replace(/^>\s?/, "")).join("\n").trim();
    return [{ id: createBlockId(), type: "quote", text: body }];
  }

  const listLines = text.split("\n");
  const bullet = listLines.every((line) => /^\- /.test(line));
  const numbered = listLines.every((line) => /^\d+\. /.test(line));
  if (bullet || numbered) {
    return [
      {
        id: createBlockId(),
        type: "list",
        ordered: numbered,
        items: listLines.map((line) => line.replace(/^(?:\d+\. |\- )/, "")),
      },
    ];
  }

  const image = text.match(/^!\[([^\]]*)\]\(([^)]+)\)$/);
  if (image) {
    const alt = image[1];
    const url = image[2].trim();
    if (isDrawioSource(url)) {
      return [{ id: createBlockId(), type: "drawio", source: url, format: "url" }];
    }
    return [{ id: createBlockId(), type: "image", url, alt, caption: alt || undefined, layout: "column" }];
  }

  return [{ id: createBlockId(), type: "paragraph", text }];
}

export function parseMarkdownToBlocks(source: string): BlogBlock[] {
  const parts = splitMarkdownWithMermaid(source);
  const blocks: BlogBlock[] = [];
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
      blocks.push({
        id: createBlockId(),
        type: "paragraph",
        text: `\`\`\`${part.lang}\n${part.content}\n\`\`\``,
      });
      continue;
    }
    for (const chunk of part.content.split(/\n{2,}/)) {
      blocks.push(...parseMarkdownChunk(chunk));
    }
  }
  return blocks.length ? blocks : [emptyBlock("paragraph")];
}

export function resolveBlocks(blocks: unknown, markdownBody: string): BlogBlock[] {
  const fromJson = normalizeBlocks(blocks);
  if (fromJson.length) return fromJson;
  if (markdownBody.trim()) return parseMarkdownToBlocks(markdownBody);
  return [emptyBlock("paragraph")];
}
