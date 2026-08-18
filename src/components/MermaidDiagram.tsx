"use client";

import { useEffect, useId, useRef } from "react";

declare global {
  interface Window {
    mermaid?: {
      initialize: (config: Record<string, unknown>) => void;
      render: (id: string, text: string) => Promise<{ svg: string }>;
      registerLayout?: (layout: unknown) => void;
      registerLayoutLoaders?: (layout: unknown) => void;
    };
  }
}

export function loadMermaid() {
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

export async function renderMermaidSvg(chart: string, renderId: string, forExport = false) {
  await loadMermaid();
  if (!window.mermaid) throw new Error("Mermaid failed to load");
  window.mermaid.initialize({
    startOnLoad: false,
    theme: "neutral",
    securityLevel: "strict",
    flowchart: { htmlLabels: false, useMaxWidth: !forExport },
  });
  const { svg } = await window.mermaid.render(renderId.replace(/[^a-zA-Z0-9]/g, ""), chart);
  return svg;
}

export function MermaidDiagram({ chart }: { chart: string }) {
  const hostRef = useRef<HTMLDivElement>(null);
  const lastGood = useRef("");
  const reactId = useId().replace(/:/g, "");

  useEffect(() => {
    let cancelled = false;
    const timer = window.setTimeout(() => {
      void (async () => {
        const svg = await renderMermaidSvg(chart, `blog-mmd-${reactId}-${Date.now()}`);
        if (!cancelled && hostRef.current) {
          lastGood.current = svg;
          hostRef.current.innerHTML = svg;
        }
      })().catch(() => {
        if (!cancelled && hostRef.current && !lastGood.current) {
          hostRef.current.textContent = "Diagram failed to render. Check Mermaid syntax.";
        }
      });
    }, 280);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [chart, reactId]);

  return <div ref={hostRef} className="blog-mermaid diagram-canvas" />;
}
