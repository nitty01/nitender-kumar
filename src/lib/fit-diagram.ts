/** Fit live Mermaid SVG into the blog column like a Pandoc figure (width-bound, height-capped). */

export function readSvgAspectRatio(svg: SVGSVGElement): string | null {
  const viewBox = svg.getAttribute("viewBox");
  if (viewBox) {
    const parts = viewBox.trim().split(/[\s,]+/).map(Number);
    if (parts.length === 4 && parts[2] > 0 && parts[3] > 0) {
      return `${parts[2]} / ${parts[3]}`;
    }
  }
  const width = Number(svg.getAttribute("width"));
  const height = Number(svg.getAttribute("height"));
  if (width > 0 && height > 0) return `${width} / ${height}`;
  return null;
}

export function fitMermaidSvg(host: HTMLElement, svg: SVGSVGElement) {
  svg.removeAttribute("width");
  svg.removeAttribute("height");
  svg.setAttribute("preserveAspectRatio", "xMidYMid meet");
  svg.style.display = "block";
  svg.style.width = "100%";
  svg.style.height = "100%";
  svg.style.maxWidth = "100%";
  svg.style.maxHeight = "100%";

  const ratio = readSvgAspectRatio(svg);
  if (ratio) host.style.setProperty("--diagram-aspect", ratio);
  host.classList.add("is-fit");
}
