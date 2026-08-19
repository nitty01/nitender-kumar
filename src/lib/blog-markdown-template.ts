/** Supported blog markdown structures and the starter template used by the import UI. */

export type BlogStructureKind =
  | "front-matter"
  | "paragraph"
  | "heading"
  | "quote"
  | "pullquote"
  | "list"
  | "image"
  | "mermaid"
  | "drawio"
  | "divider";

export type StructureGuide = {
  kind: BlogStructureKind;
  label: string;
  rules: string[];
  example: string;
};

export const BLOG_STRUCTURE_GUIDE: StructureGuide[] = [
  {
    kind: "front-matter",
    label: "YAML front matter",
    rules: [
      "Wrap metadata between opening and closing --- on their own lines.",
      "Supported keys: title, slug, excerpt, topics, layout (flow | newspaper), hero.",
    ],
    example: `---
title: Your post title
slug: your-post-slug
excerpt: One-line dek shown on the blog index.
topics: GenAI, Platform, Architecture
layout: flow
hero: /assets/images/your-hero.png
---`,
  },
  {
    kind: "paragraph",
    label: "Paragraph",
    rules: ["Plain text separated by a blank line.", "Inline **bold** and *italic* are kept."],
    example: `Opening paragraph. Keep one idea per block.

Second paragraph after a blank line.`,
  },
  {
    kind: "heading",
    label: "Section heading",
    rules: [
      "Use ## for sections and ### for subsections.",
      "Set title in front matter or use a single # line (converted to metadata).",
    ],
    example: `## Section title

### Subsection title`,
  },
  {
    kind: "quote",
    label: "Quote with optional attribution",
    rules: [
      "Prefix each line with >.",
      "Optional attribution on its own line starting with —, --, or –.",
    ],
    example: `> Quote body on one or more lines.
>
> — Author or source`,
  },
  {
    kind: "pullquote",
    label: "Pull quote",
    rules: ["Same as a quote block; convert manually in the editor if you need pull-quote styling."],
    example: `> Standalone pull quote text.`,
  },
  {
    kind: "list",
    label: "Bullet or numbered list",
    rules: [
      "Use -, *, or + for bullets; 1. 2. for numbered lists.",
      "Do not mix bullet and numbered markers in the same list.",
      "Continuation lines may be indented with two or more spaces.",
    ],
    example: `- First item
- Second item

1. First step
2. Second step`,
  },
  {
    kind: "image",
    label: "Image",
    rules: [
      "Syntax: ![alt text](url)",
      "Optional caption on the next line wrapped in *italics*.",
      "Draw.io URLs in image syntax become diagram blocks automatically.",
    ],
    example: `![Diagram caption](/assets/images/example.png)
*Optional caption line*`,
  },
  {
    kind: "mermaid",
    label: "Mermaid diagram",
    rules: ["Fence must be ```mermaid on its own line.", "Close with ``` on its own line."],
    example: "```mermaid\nflowchart LR\n  A[Start] --> B[Outcome]\n```",
  },
  {
    kind: "drawio",
    label: "Draw.io diagram",
    rules: [
      "Fence with ```drawio and XML inside, or paste a diagrams.net viewer URL.",
      "XML must include <mxfile> or <mxGraphModel>.",
    ],
    example: "```drawio\n<mxfile host=\"app.diagrams.net\">\n  <!-- minimal diagram -->\n</mxfile>\n```",
  },
  {
    kind: "divider",
    label: "Section break",
    rules: ["A line with only ---, ***, or ___."],
    example: "---",
  },
];

export function structureExample(kind: BlogStructureKind | string): string | undefined {
  const row = BLOG_STRUCTURE_GUIDE.find((item) => item.kind === kind);
  return row?.example;
}

export function structureGuide(kind: BlogStructureKind | string): StructureGuide | undefined {
  return BLOG_STRUCTURE_GUIDE.find((item) => item.kind === kind);
}

/** Empty-but-valid starter file covering every auto-parsed structure. */
export const BLOG_MARKDOWN_TEMPLATE = `---
title:
slug:
excerpt:
topics:
layout: flow
hero:
---

# Post title (optional if title is in front matter)

Opening paragraph. Replace this with your lead.

## Section heading

Body paragraph under the section.

> Quote text.
>
> — Optional attribution

- Bullet one
- Bullet two

1. Numbered one
2. Numbered two

![Alt text](/assets/images/your-image.png)

\`\`\`mermaid
flowchart LR
  A[Start] --> B[Outcome]
\`\`\`

\`\`\`drawio
<mxfile host="app.diagrams.net">
  <diagram name="Diagram" id="page-1">
    <mxGraphModel dx="800" dy="500" grid="1" gridSize="10">
      <root>
        <mxCell id="0"/>
        <mxCell id="1" parent="0"/>
      </root>
    </mxGraphModel>
  </diagram>
</mxfile>
\`\`\`

---

Closing paragraph.
`;
