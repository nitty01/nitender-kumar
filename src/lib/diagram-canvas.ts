type CanvasHandle = {
  zoom: (factor: number) => void;
  reset: () => void;
  toggleFullscreen: () => void;
};

type CanvasState = CanvasHandle & {
  viewport: HTMLElement;
  scale: number;
  tx: number;
  ty: number;
  apply: () => void;
  fit: () => void;
};

const handles = new Map<string, CanvasHandle>();
const states = new WeakMap<HTMLElement, CanvasState>();

function resolveContainerId(mode?: string) {
  if (mode === "cto") return "cto-diagram-container";
  if (mode === "engineer") return "diagram-container";
  const siteMode = document.documentElement.getAttribute("data-site-mode") || "engineer";
  const preferred = siteMode === "cto" ? "cto-diagram-container" : "diagram-container";
  return document.getElementById(preferred) ? preferred : "diagram-container";
}

export function getDiagramCanvas(mode?: string) {
  return handles.get(resolveContainerId(mode));
}

export function bindDiagramCanvas(container: HTMLElement): CanvasHandle {
  const viewport =
    container.querySelector<HTMLElement>(".diagram-zoom") ??
    container.querySelector<HTMLElement>(".mermaid") ??
    container;

  const existing = states.get(container);
  if (existing) {
    existing.viewport = viewport;
    viewport.classList.add("diagram-canvas__stage");
    existing.reset();
    return existing;
  }

  container.classList.add("diagram-canvas");

  const state: CanvasState = {
    viewport,
    scale: 1,
    tx: 0,
    ty: 0,
    apply() {
      state.viewport.style.transform = `translate(${state.tx}px, ${state.ty}px) scale(${state.scale})`;
      state.viewport.style.transformOrigin = "0 0";
    },
    fit() {
      const drawio = container.querySelector<HTMLIFrameElement>("iframe.project-drawio");
      const svg = container.querySelector("svg");
      const sidePad = 24;
      const topPad = 48;
      const bottomPad = 28;
      const availWidth = Math.max(container.clientWidth - sidePad * 2, 120);
      if (drawio) {
        const targetH = container.classList.contains("is-fullscreen")
          ? window.innerHeight
          : Math.max(36 * 16, Math.round(window.innerHeight * 0.62));
        container.style.height = `${targetH}px`;
        state.scale = 1;
        state.tx = 0;
        state.ty = 0;
        state.apply();
        return;
      }
      let box = {
        width: svg?.clientWidth || availWidth,
        height: svg?.clientHeight || 240,
      };
      try {
        if (svg?.getBBox) box = svg.getBBox();
      } catch {
        // SVG not ready
      }
      const graphW = Math.max(box.width, 1);
      const graphH = Math.max(box.height, 1);
      const widthScale = availWidth / graphW;
      const isFullscreen = container.classList.contains("is-fullscreen");
      let next = widthScale;
      if (isFullscreen) {
        const availHeight = Math.max(window.innerHeight - topPad - bottomPad, 180);
        next = Math.min(widthScale, availHeight / graphH);
      }
      state.scale = Number.isFinite(next) && next > 0 ? next : 1;
      const scaledW = graphW * state.scale;
      const scaledH = graphH * state.scale;
      state.tx = Math.max(sidePad, (container.clientWidth - scaledW) / 2);
      state.ty = topPad;
      state.apply();

      if (!isFullscreen) {
        const targetH = Math.min(
          Math.max(scaledH + topPad + bottomPad, 16 * 16),
          Math.round(window.innerHeight * 0.7),
        );
        container.style.height = `${targetH}px`;
      } else {
        container.style.height = "";
      }
    },
    zoom(factor: number) {
      state.scale = Math.min(2.8, Math.max(0.35, state.scale * factor));
      state.apply();
    },
    reset() {
      requestAnimationFrame(() => state.fit());
    },
    toggleFullscreen() {
      toggleFullscreen(container, state);
    },
  };

  viewport.classList.add("diagram-canvas__stage");
  attachGestures(container, state);
  states.set(container, state);
  if (container.id) handles.set(container.id, state);
  requestAnimationFrame(() => state.fit());
  return state;
}

function attachGestures(container: HTMLElement, state: CanvasState) {
  let dragging = false;
  let lastX = 0;
  let lastY = 0;

  container.addEventListener(
    "wheel",
    (event) => {
      event.preventDefault();
      state.zoom(event.deltaY > 0 ? 0.9 : 1.1);
    },
    { passive: false },
  );

  container.addEventListener("pointerdown", (event) => {
    const target = event.target as HTMLElement;
    if (target.closest("button, a, .diagram-controls, .diagram-canvas__close, iframe.project-drawio")) return;
    dragging = true;
    lastX = event.clientX;
    lastY = event.clientY;
    container.classList.add("is-panning");
    container.setPointerCapture(event.pointerId);
  });

  container.addEventListener("pointermove", (event) => {
    if (!dragging) return;
    state.tx += event.clientX - lastX;
    state.ty += event.clientY - lastY;
    lastX = event.clientX;
    lastY = event.clientY;
    state.apply();
  });

  const stopPan = () => {
    dragging = false;
    container.classList.remove("is-panning");
  };
  container.addEventListener("pointerup", stopPan);
  container.addEventListener("pointercancel", stopPan);
}

function toggleFullscreen(container: HTMLElement, state: CanvasState) {
  const open = container.classList.contains("is-fullscreen");
  if (open) {
    const home = restoreSpot.get(container);
    container.classList.remove("is-fullscreen");
    document.body.classList.remove("diagram-canvas-open");
    container.querySelector(".diagram-canvas__close")?.remove();
    if (home?.parent) home.parent.insertBefore(container, home.next);
    restoreSpot.delete(container);
    document.body.style.overflow = "";
  } else {
    restoreSpot.set(container, {
      parent: container.parentNode,
      next: container.nextSibling,
    });
    document.body.appendChild(container);
    container.classList.add("is-fullscreen");
    document.body.classList.add("diagram-canvas-open");
    document.body.style.overflow = "hidden";
    const button = document.createElement("button");
    button.type = "button";
    button.className = "diagram-canvas__close";
    button.setAttribute("aria-label", "Exit fullscreen diagram");
    button.innerHTML = '<i class="fas fa-times" aria-hidden="true"></i> Close';
    button.addEventListener("click", () => toggleFullscreen(container, state));
    container.appendChild(button);
  }
  requestAnimationFrame(() => state.fit());
}

const restoreSpot = new WeakMap<HTMLElement, { parent: Node | null; next: ChildNode | null }>();

if (typeof document !== "undefined") {
  document.addEventListener("keydown", (event) => {
    if (event.key !== "Escape") return;
    document.querySelectorAll<HTMLElement>(".diagram-canvas.is-fullscreen").forEach((node) => {
      const state = states.get(node);
      if (state) state.toggleFullscreen();
    });
  });
}

export function installDiagramWindowApi() {
  window.zoomIn = (mode?: string) => {
    getDiagramCanvas(mode)?.zoom(1.18);
  };
  window.zoomOut = (mode?: string) => {
    getDiagramCanvas(mode)?.zoom(1 / 1.18);
  };
  window.resetZoom = (mode?: string) => {
    getDiagramCanvas(mode)?.reset();
  };
  window.toggleFullscreen = (mode?: string) => {
    getDiagramCanvas(mode)?.toggleFullscreen();
  };
}

declare global {
  interface Window {
    zoomIn?: (mode?: string) => void;
    zoomOut?: (mode?: string) => void;
    resetZoom?: (mode?: string) => void;
    toggleFullscreen?: (mode?: string) => void;
  }
}
