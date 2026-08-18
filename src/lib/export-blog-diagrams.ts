"use client";

import { renderMermaidSvg } from "@/components/MermaidDiagram";
import {
  diagramSourceHash,
  mapBlocksDeepAsync,
  type BlogBlock,
} from "@/lib/blog-blocks";
import { exportDrawioPngAction, uploadMediaAction } from "@/app/admin/actions";

export type DiagramExportResult = {
  blocks: BlogBlock[];
  errors: string[];
};

function svgToPngBlob(svg: string): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const doc = new DOMParser().parseFromString(svg, "image/svg+xml");
    const parseError = doc.querySelector("parsererror");
    if (parseError) {
      reject(new Error("Mermaid returned invalid SVG"));
      return;
    }
    const root = doc.documentElement;
    root.setAttribute("xmlns", "http://www.w3.org/2000/svg");
    if (!root.getAttribute("xmlns:xlink")) {
      root.setAttribute("xmlns:xlink", "http://www.w3.org/1999/xlink");
    }
    const viewBox = root.getAttribute("viewBox")?.split(/[\s,]+/).map(Number) ?? [];
    const widthAttr = root.getAttribute("width") || "";
    const heightAttr = root.getAttribute("height") || "";
    let width = parseFloat(widthAttr);
    let height = parseFloat(heightAttr);
    if (!width || widthAttr.includes("%")) width = viewBox[2] || 800;
    if (!height || heightAttr.includes("%")) height = viewBox[3] || 450;
    width = Math.max(Math.round(width), 320);
    height = Math.max(Math.round(height), 180);
    root.setAttribute("width", String(width));
    root.setAttribute("height", String(height));
    if (!root.getAttribute("viewBox")) {
      root.setAttribute("viewBox", `0 0 ${width} ${height}`);
    }
    const markup = new XMLSerializer().serializeToString(root);
    const dataUrl = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(markup)}`;
    const image = new Image();
    image.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = width * 2;
      canvas.height = height * 2;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        reject(new Error("Canvas is unavailable"));
        return;
      }
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
      canvas.toBlob((png) => {
        if (png) resolve(png);
        else reject(new Error("PNG export failed"));
      }, "image/png");
    };
    image.onerror = () => reject(new Error("Mermaid SVG could not be rasterized"));
    image.src = dataUrl;
  });
}

async function uploadDiagramFile(
  file: File,
  kind: "mermaid" | "drawio",
  slug: string,
  topics: string[],
  hash: string,
) {
  const data = new FormData();
  data.set("file", file);
  data.set("kind", kind);
  data.set("slug", slug);
  data.set("topics", topics.join(","));
  data.set("hash", hash);
  const result = await uploadMediaAction(data);
  if (!result.ok) throw new Error(result.error);
  return result;
}

function exportDrawioPngInBrowser(xml: string): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const iframe = document.createElement("iframe");
    iframe.title = "Draw.io export";
    iframe.setAttribute(
      "style",
      "position:fixed;left:0;top:0;width:1px;height:1px;opacity:0;pointer-events:none;border:0",
    );
    iframe.src = "https://embed.diagrams.net/?embed=1&proto=json&spin=0&configure=0";
    const timeout = window.setTimeout(() => {
      cleanup();
      reject(new Error("Draw.io export timed out"));
    }, 40000);

    function cleanup() {
      window.clearTimeout(timeout);
      window.removeEventListener("message", onMessage);
      iframe.remove();
    }

    function onMessage(event: MessageEvent) {
      if (event.source !== iframe.contentWindow) return;
      let message: { event?: string; data?: string; message?: string };
      try {
        message = typeof event.data === "string" ? JSON.parse(event.data) : event.data;
      } catch {
        return;
      }
      if (message.event === "init") {
        iframe.contentWindow?.postMessage(
          JSON.stringify({ action: "load", xml, autosave: 0 }),
          "https://embed.diagrams.net",
        );
        return;
      }
      if (message.event === "load") {
        iframe.contentWindow?.postMessage(
          JSON.stringify({
            action: "export",
            format: "png",
            scale: 2,
            border: 8,
            background: "#ffffff",
          }),
          "https://embed.diagrams.net",
        );
        return;
      }
      if (message.event === "export" && message.data) {
        cleanup();
        void fetch(message.data)
          .then((res) => res.blob())
          .then(resolve)
          .catch(reject);
        return;
      }
      if (message.event === "error") {
        cleanup();
        reject(new Error(message.message || "Draw.io export error"));
      }
    }

    window.addEventListener("message", onMessage);
    document.body.appendChild(iframe);
  });
}

async function exportMermaidBlock(
  block: Extract<BlogBlock, { type: "mermaid" }>,
  slug: string,
  topics: string[],
) {
  const hash = diagramSourceHash(block.chart);
  if (block.exportUrl && block.exportHash === hash) return block;
  const renderId = `exportmmd${hash}${Date.now()}`;
  const svg = await renderMermaidSvg(block.chart, renderId, true);
  try {
    const png = await svgToPngBlob(svg);
    const uploaded = await uploadDiagramFile(
      new File([png], `mermaid-${hash}.png`, { type: "image/png" }),
      "mermaid",
      slug,
      topics,
      hash,
    );
    return { ...block, exportUrl: uploaded.url, exportHash: hash, publicId: uploaded.publicId };
  } catch {
    const svgFile = new File([svg], `mermaid-${hash}.svg`, { type: "image/svg+xml" });
    const uploaded = await uploadDiagramFile(svgFile, "mermaid", slug, topics, `${hash}-svg`);
    return { ...block, exportUrl: uploaded.url, exportHash: hash, publicId: uploaded.publicId };
  }
}

async function exportDrawioBlock(
  block: Extract<BlogBlock, { type: "drawio" }>,
  slug: string,
  topics: string[],
) {
  const hash = diagramSourceHash(block.source);
  if (block.exportUrl && block.exportHash === hash) return block;
  try {
    const png = await exportDrawioPngInBrowser(block.source);
    const uploaded = await uploadDiagramFile(
      new File([png], `drawio-${hash}.png`, { type: "image/png" }),
      "drawio",
      slug,
      topics,
      hash,
    );
    return { ...block, exportUrl: uploaded.url, exportHash: hash, publicId: uploaded.publicId };
  } catch (browserError) {
    const exported = await exportDrawioPngAction({
      source: block.source,
      format: block.format,
      slug,
      topics,
      hash,
    });
    if (exported.ok) {
      return { ...block, exportUrl: exported.url, exportHash: hash, publicId: exported.publicId };
    }
    const reason =
      exported.error ||
      (browserError instanceof Error ? browserError.message : "Draw.io PNG export failed");
    throw new Error(reason);
  }
}

export async function exportDiagramBlocks(
  blocks: BlogBlock[],
  slug: string,
  topics: string[],
): Promise<DiagramExportResult> {
  const errors: string[] = [];
  const next = await mapBlocksDeepAsync(blocks, async (block) => {
    try {
      if (block.type === "mermaid" && block.chart.trim()) {
        return await exportMermaidBlock(block, slug, topics);
      }
      if (block.type === "drawio" && block.source.trim()) {
        return await exportDrawioBlock(block, slug, topics);
      }
    } catch (error) {
      errors.push(
        `${block.type}: ${error instanceof Error ? error.message : "export failed"}`,
      );
    }
    return block;
  });
  return { blocks: next, errors };
}
