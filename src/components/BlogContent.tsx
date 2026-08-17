import { MermaidDiagram } from "@/components/MermaidDiagram";
import { renderSimpleMarkdown, splitMarkdownWithMermaid } from "@/lib/markdown";

export function BlogContent({ body }: { body: string }) {
  const blocks = splitMarkdownWithMermaid(body);
  return (
    <div className="blog-content">
      {blocks.map((block, index) =>
        block.type === "mermaid" ? (
          <MermaidDiagram key={`m-${index}`} chart={block.content} />
        ) : (
          <div
            key={`md-${index}`}
            className="blog-markdown"
            dangerouslySetInnerHTML={{ __html: renderSimpleMarkdown(block.content) }}
          />
        ),
      )}
    </div>
  );
}
