"use client";

import { useEffect, useId, useRef } from "react";

function loadMermaid() {
  return new Promise<void>((resolve, reject) => {
    if (window.mermaid) {
      resolve();
      return;
    }
    const existing = document.querySelector<HTMLScriptElement>('script[data-blog-mermaid="1"]');
    if (existing) {
      existing.addEventListener("load", () => resolve(), { once: true });
      existing.addEventListener("error", () => reject(new Error("Mermaid failed")), { once: true });
      return;
    }
    const script = document.createElement("script");
    script.src = "https://cdn.jsdelivr.net/npm/mermaid@10.6.1/dist/mermaid.min.js";
    script.async = true;
    script.dataset.blogMermaid = "1";
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Mermaid failed"));
    document.head.appendChild(script);
  });
}

export function MermaidDiagram({ chart }: { chart: string }) {
  const hostRef = useRef<HTMLDivElement>(null);
  const reactId = useId().replace(/:/g, "");

  useEffect(() => {
    let cancelled = false;
    async function run() {
      await loadMermaid();
      if (cancelled || !window.mermaid || !hostRef.current) return;
      window.mermaid.initialize({
        startOnLoad: false,
        theme: "neutral",
        securityLevel: "strict",
        flowchart: { htmlLabels: false, useMaxWidth: true },
      });
      const id = `blog-mmd-${reactId}-${Date.now()}`;
      const { svg } = await window.mermaid.render(id, chart);
      if (!cancelled && hostRef.current) {
        hostRef.current.innerHTML = svg;
      }
    }
    void run().catch((error) => {
      if (hostRef.current) {
        hostRef.current.textContent = "Diagram failed to render.";
      }
      console.error(error);
    });
    return () => {
      cancelled = true;
    };
  }, [chart, reactId]);

  return <div ref={hostRef} className="blog-mermaid diagram-canvas" />;
}
