"use client";

import { useEffect, useRef } from "react";
import { bindDiagramCanvas, installDiagramWindowApi } from "@/lib/diagram-canvas";

declare global {
  interface Window {
    mermaidElk?: unknown;
    __portfolioRenderMermaid?: (container: HTMLElement, source: string) => Promise<void>;
    loadDiagram?: DiagramLoader & { __wrapped?: boolean };
    switchDiagram?: (type: string, mode?: string) => void;
  }
}

function mermaidErrorMessage(error: unknown) {
  if (!error) return "Unknown mermaid error";
  if (typeof error === "string") return error;
  if (typeof error === "object") {
    const record = error as { str?: string; message?: string; hash?: { text?: string } };
    return record.str || record.message || record.hash?.text || JSON.stringify(error);
  }
  return String(error);
}

function compactMermaidSource(source: string) {
  return String(source || "")
    .replace(/^\uFEFF/, "")
    .replace(/layout:\s*elk/gi, "layout: dagre")
    .replace(/nodeSpacing:\s*\d+/gi, "nodeSpacing: 48")
    .replace(/rankSpacing:\s*\d+/gi, "rankSpacing: 64")
    .replace(/['"]nodeSpacing['"]\s*:\s*\d+/gi, '"nodeSpacing": 48')
    .replace(/['"]rankSpacing['"]\s*:\s*\d+/gi, '"rankSpacing": 64')
    .replace(/diagramPadding:\s*\d+/gi, "diagramPadding: 16")
    .replace(/['"]diagramPadding['"]\s*:\s*\d+/gi, '"diagramPadding": 16')
    .replace(/curve:\s*['"]?basis['"]?/gi, "curve: linear")
    .trim();
}

function installMermaidRenderer() {
  window.__portfolioRenderMermaid = async (container, source) => {
    const mermaid = window.mermaid;
    if (!mermaid || !container) return;

    const text = compactMermaidSource(source);
    if (!text) throw new Error("Empty diagram source");

    mermaid.initialize({
      startOnLoad: false,
      theme: "neutral",
      securityLevel: "strict",
      fontFamily: "Inter, Helvetica Neue, Segoe UI, sans-serif",
      themeVariables: {
        background: "#eef2f6",
        primaryColor: "#ccfbf1",
        primaryTextColor: "#042f2e",
        primaryBorderColor: "#0f766e",
        lineColor: "#334155",
        clusterBkg: "#f8fafc",
        clusterBorder: "#94a3b8",
        edgeLabelBackground: "#fafafa",
        fontFamily: "Inter, Helvetica Neue, Segoe UI, sans-serif",
      },
      flowchart: {
        htmlLabels: false,
        useMaxWidth: false,
        curve: "linear",
        padding: 16,
        nodeSpacing: 48,
        rankSpacing: 64,
        diagramPadding: 16,
      },
    });
    const holder = container.querySelector<HTMLElement>(".mermaid") ?? container;
    const id = `portfolio-mmd-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    try {
      const result = await mermaid.render(id, text);
      holder.innerHTML = result.svg;
      holder.classList.add("mermaid");
      bindDiagramCanvas(container);
    } catch (error) {
      console.error("Error loading diagram:", mermaidErrorMessage(error), error);
      throw error;
    }
  };
}

function patchLegacyScript(script: string) {
  const helper = `function __portfolioSection(href){
    if (!href) return null;
    var i = href.indexOf('#');
    if (i < 0) return null;
    var id = href.slice(i);
    if (id.length < 2) return null;
    try { return document.querySelector(id); } catch (e) { return null; }
  }
`;
  const body =
    helper +
    script
      .replace(
        /document\.addEventListener\(\s*(['"])DOMContentLoaded\1\s*,/g,
        "queueMicrotask(",
      )
      .replace(
        /document\.querySelector\(\s*this\.getAttribute\(\s*(['"])href\1\s*\)\s*\)/g,
        "__portfolioSection(this.getAttribute('href'))",
      )
      .replace(/loadDiagram\('overview',\s*'engineer'\);/g, "")
      .replace(/loadDiagram\('overview'\);/g, "")
      .replace(/\bloadDiagram\(type,\s*mode\);/g, "window.loadDiagram(type, mode);")
      .replace(/\bloadDiagram\(type\);/g, "window.loadDiagram(type);")
      .replace(
        /const diagramText = await response\.text\(\);/g,
        "if (!response.ok) throw new Error('Failed to fetch ' + filePath + ' (' + response.status + ')'); const diagramText = await response.text();",
      )
      .replace(
        /<div class="mermaid">\$\{finalDiagram\}<\/div>/g,
        '<div class="mermaid"></div>',
      )
      .replace(
        /<div class="mermaid">\$\{finalText\}<\/div>/g,
        '<div class="mermaid"></div>',
      )
      .replace(
        /if \(pre\.renderer\) \{/g,
        "if (pre.renderer && pre.renderer !== 'elk') {",
      )
      .replace(
        /const finalDiagram = initDirective \+ finalText;/g,
        "const finalDiagram = finalText;",
      )
      .replace(
        /await mermaid\.init\(undefined,\s*diagramContainer\.querySelectorAll\('\.mermaid'\)\);/g,
        "await window.__portfolioRenderMermaid(diagramContainer, finalDiagram);",
      )
      .replace(
        /await mermaid\.init\(\);/g,
        "await window.__portfolioRenderMermaid(diagramContainer, typeof finalDiagram !== 'undefined' ? finalDiagram : finalText);",
      );

  // Scope page scripts so client navigations do not redeclare let/const (mermaidConfig, etc.).
  return `(function(){\n${body}\n${exportPageHandlers()}\n})();`;
}

function exportPageHandlers() {
  const names = [
    "loadDiagram",
    "switchDiagram",
    "zoomIn",
    "zoomOut",
    "resetZoom",
    "toggleFullscreen",
    "getDiagramRefs",
    "preprocessMermaid",
  ];
  return names
    .map(
      (name) =>
        `try { if (typeof ${name} === 'function') window.${name} = ${name}; } catch (_) {}`,
    )
    .join("\n");
}

type DiagramLoader = (type?: string, mode?: string) => Promise<void> | void;

type DrawioHost = HTMLElement & { __drawioCleanup?: () => void };

function projectSlugFromPath() {
  const match = window.location.pathname.match(/\/projects\/([^/]+)/);
  return match?.[1] ?? "";
}

function disposeDrawio(container: HTMLElement) {
  const host = container as DrawioHost;
  host.__drawioCleanup?.();
  host.__drawioCleanup = undefined;
  container.classList.remove("diagram-container--drawio");
}

function diagramErrorMarkup() {
  return `
                    <div class="text-center text-red-400">
                        <i class="fas fa-exclamation-triangle text-2xl mb-2"></i>
                        <p>Error loading architecture diagram</p>
                    </div>
                `;
}

function diagramControlsMarkup(mode: string) {
  return `
                    <div class="diagram-controls">
                        <button class="diagram-control-btn" onclick="zoomIn('${mode}')" title="Zoom In">
                            <i class="fas fa-search-plus"></i>
                        </button>
                        <button class="diagram-control-btn" onclick="zoomOut('${mode}')" title="Zoom Out">
                            <i class="fas fa-search-minus"></i>
                        </button>
                        <button class="diagram-control-btn" onclick="resetZoom('${mode}')" title="Reset Zoom">
                            <i class="fas fa-expand-arrows-alt"></i>
                        </button>
                        <button class="diagram-control-btn" onclick="toggleFullscreen('${mode}')" title="Fullscreen">
                            <i class="fas fa-expand"></i>
                        </button>
                    </div>
                `;
}

async function renderProjectDrawio(container: HTMLElement, mode: string) {
  disposeDrawio(container);
  const slug = projectSlugFromPath();
  const zoomId = mode === "cto" ? "cto-diagram-zoom" : "diagram-zoom";
  const filePath = `/assets/images/diagrams/${slug}/${slug}-architecture_detailed.drawio`;
  const response = await fetch(filePath);
  if (!response.ok) {
    throw new Error(`Failed to fetch ${filePath} (${response.status})`);
  }
  const xml = await response.text();
  if (!xml.includes("<mxfile") && !xml.includes("<mxGraphModel")) {
    throw new Error("Invalid Draw.io source");
  }

  container.classList.add("diagram-container--drawio");
  container.innerHTML = `
                    <div class="diagram-zoom" id="${zoomId}">
                        <iframe class="project-drawio" title="Detailed architecture" loading="eager" referrerpolicy="no-referrer"></iframe>
                    </div>
                    ${diagramControlsMarkup(mode)}
                `;

  const iframe = container.querySelector<HTMLIFrameElement>("iframe.project-drawio");
  if (!iframe) throw new Error("Draw.io frame missing");

  const origin = "https://viewer.diagrams.net";
  iframe.src = `${origin}/?lightbox=1&toolbar=0&nav=1&layers=1&chrome=0&editable=0#R${encodeURIComponent(xml)}`;

  (container as DrawioHost).__drawioCleanup = () => undefined;
  bindDiagramCanvas(container);
}

function isRenderable(element: HTMLElement | null): element is HTMLElement {
  if (!element) return false;
  const details = element.closest("details");
  if (details && !details.open) return false;
  if (element.closest("[data-mode]") && getComputedStyle(element.closest("[data-mode]")!).display === "none") {
    return false;
  }
  return true;
}

function wrapDiagramLoader() {
  const original = window.loadDiagram;
  if (typeof original !== "function") return undefined;
  // Always re-wrap the current page's loader (client navigations replace it).
  if (original.__wrapped) return original;

  const wrapped: DiagramLoader & { __wrapped?: boolean } = async function loadDiagram(
    type = "overview",
    mode,
  ) {
    await new Promise<void>((resolve) => {
      requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
    });
    const siteMode = document.documentElement.getAttribute("data-site-mode") || "engineer";
    const preferred = mode || siteMode;
    const order = preferred === "cto" ? ["cto", "engineer"] : ["engineer", "cto"];
    const resolved =
      order.find((candidate) => {
        const id = candidate === "cto" ? "cto-diagram-container" : "diagram-container";
        return isRenderable(document.getElementById(id));
      }) || preferred;
    const container = document.getElementById(
      resolved === "cto" ? "cto-diagram-container" : "diagram-container",
    );
    if (!isRenderable(container)) return;
    if (type === "detailed") {
      try {
        await renderProjectDrawio(container, resolved);
      } catch (error) {
        console.error("Error loading diagram:", error);
        disposeDrawio(container);
        container.innerHTML = diagramErrorMarkup();
      }
      return;
    }
    disposeDrawio(container);
    return original(type, resolved);
  };
  wrapped.__wrapped = true;
  window.loadDiagram = wrapped;
  return wrapped;
}

function loadScript(src: string) {
  return new Promise<void>((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(`script[src="${src}"]`);
    if (existing) {
      if (existing.dataset.loaded === "true") {
        resolve();
        return;
      }
      if (existing.dataset.failed === "true") {
        reject(new Error(`Failed to load ${src}`));
        return;
      }
      existing.addEventListener("load", () => resolve(), { once: true });
      existing.addEventListener(
        "error",
        () => {
          existing.dataset.failed = "true";
          reject(new Error(`Failed to load ${src}`));
        },
        { once: true },
      );
      return;
    }
    const script = document.createElement("script");
    script.src = src;
    script.async = false;
    script.onload = () => {
      script.dataset.loaded = "true";
      resolve();
    };
    script.onerror = () => {
      script.dataset.failed = "true";
      reject(new Error(`Failed to load ${src}`));
    };
    document.head.appendChild(script);
  });
}

export function LegacyPage({
  html,
  script,
  mermaid = false,
}: {
  html: string;
  script?: string;
  mermaid?: boolean;
  elk?: boolean;
}) {
  const hostRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!script) return;
    const pageScript = script;
    let cancelled = false;
    const injected: HTMLScriptElement[] = [];

    async function run() {
      if (mermaid) {
        await loadScript("https://cdn.jsdelivr.net/npm/mermaid@10.6.1/dist/mermaid.min.js");
        await loadScript("/js/mermaid-project-config.js");
        if (!window.mermaid) {
          throw new Error("Mermaid failed to load");
        }
        installMermaidRenderer();
      }
      if (cancelled) return;

      const patched = patchLegacyScript(pageScript);
      const tag = document.createElement("script");
      tag.textContent = patched;
      try {
        document.body.appendChild(tag);
        injected.push(tag);
        installDiagramWindowApi();
        const loadDiagram = wrapDiagramLoader();
        if (cancelled) return;
        if (mermaid && loadDiagram) {
          const mode = document.documentElement.getAttribute("data-site-mode") || "engineer";
          await loadDiagram("overview", mode);
        }
      } catch (error) {
        console.error("Legacy page script failed", error);
        tag.remove();
      }
    }

    void run().catch((error) => {
      console.error("Legacy page script failed", error);
    });

    return () => {
      cancelled = true;
      injected.forEach((tag) => tag.remove());
      document
        .querySelectorAll<HTMLElement>("#diagram-container, #cto-diagram-container")
        .forEach((node) => disposeDrawio(node));
      // Drop page handlers so the next project can install fresh ones.
      delete window.loadDiagram;
      delete window.switchDiagram;
    };
  }, [script, mermaid]);

  return (
    <div
      ref={hostRef}
      className="legacy-page"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
