export type BlogPost = {
  slug: string;
  title: string;
  excerpt: string;
  date: string;
  topics: string[];
  /** Markdown body; may include ```mermaid fences */
  body: string;
};

export const LOCAL_POSTS: BlogPost[] = [
  {
    slug: "platforms-over-projects",
    title: "Platforms over projects",
    excerpt:
      "Why reusable platform bets beat one-off delivery — and how that shows up in cost, risk, and team velocity.",
    date: "2026-08-01",
    topics: ["Platform", "Leadership"],
    body: `The highest-leverage work in platform and data organizations is not another dashboard. It is leaving behind infrastructure that the next team can extend without a rewrite.

That means contracts, tenancy, observability, and cost controls as first-class design, not cleanup after a demo works.

## Example architecture

\`\`\`mermaid
flowchart LR
  A[Product bet] --> B[Platform contract]
  B --> C[Reusable services]
  C --> D[Measurable outcomes]
\`\`\`
`,
  },
];
