"use client";

type DrawioDiagramProps = {
  source: string;
  format: "xml" | "url";
};

export function DrawioDiagram({ source, format }: DrawioDiagramProps) {
  const payload = source.trim();
  const hash = format === "url" ? `#U${encodeURIComponent(payload)}` : `#R${encodeURIComponent(payload)}`;
  const src = `https://viewer.diagrams.net/?lightbox=1&highlight=0000ff&nav=1&layers=1&toolbar=0${hash}`;

  return (
    <div className="blog-diagram-frame blog-diagram-frame--drawio">
      <iframe className="blog-drawio" title="Draw.io diagram" src={src} loading="lazy" referrerPolicy="no-referrer" />
    </div>
  );
}
