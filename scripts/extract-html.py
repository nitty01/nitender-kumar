#!/usr/bin/env python3
"""Extract html-portfolio page bodies into TS modules for the Next.js port."""
from __future__ import annotations

import json
import re
from pathlib import Path

SRC = Path("/home/nitender-kumar/PROJECTS/PERSONAL/GIT/PORTFOLIO/html-portfolio")
OUT = Path("/home/nitender-kumar/PROJECTS/PERSONAL/GIT/PORTFOLIO/next-portfolio/src/content")
CSS_OUT = Path("/home/nitender-kumar/PROJECTS/PERSONAL/GIT/PORTFOLIO/next-portfolio/src/styles/portfolio")

OUT.mkdir(parents=True, exist_ok=True)


def rewrite(text: str) -> str:
    pairs = [
        (r'href="\./index\.html"', 'href="/"'),
        (r"href='\./index\.html'", "href='/'"),
        (r'href="\.\./index\.html"', 'href="/"'),
        (r"href='\.\./index\.html'", "href='/'"),
        (r'href="index\.html"', 'href="/"'),
        (r'href="public/about\.html"', 'href="/about"'),
        (r'href="\.\./public/about\.html"', 'href="/about"'),
        (r'href="about\.html"', 'href="/about"'),
        (r'href="public/contact\.html"', 'href="/contact"'),
        (r'href="\.\./public/contact\.html"', 'href="/contact"'),
        (r'href="contact\.html"', 'href="/contact"'),
        (r'href="public/tech-playground\.html"', 'href="/tech-playground"'),
        (r'href="\.\./public/tech-playground\.html"', 'href="/tech-playground"'),
        (r'href="tech-playground\.html"', 'href="/tech-playground"'),
        (r'href="public/project-([a-z0-9-]+)\.html"', r'href="/projects/\1"'),
        (r'href="project-([a-z0-9-]+)\.html"', r'href="/projects/\1"'),
        (r'src="assets/', 'src="/assets/'),
        (r"src='assets/", "src='/assets/"),
        (r'src="\.\./assets/', 'src="/assets/'),
        (r'href="assets/', 'href="/assets/'),
        (r'href="\.\./assets/', 'href="/assets/'),
        (r'\.\./assets/images/', '/assets/images/'),
        (r'(?<!/)assets/images/', '/assets/images/'),
        (r'href="\.\./index\.html#', 'href="/#'),
        (r'href="index\.html#', 'href="/#'),
        (r"window\.location\.href='public/project-([a-z0-9-]+)\.html'", r"window.location.href='/projects/\1'"),
        (r'public/project-([a-z0-9-]+)\.html', r'/projects/\1'),
        (r'public/about\.html', '/about'),
        (r'public/contact\.html', '/contact'),
        (r'public/tech-playground\.html', '/tech-playground'),
    ]
    for pat, repl in pairs:
        text = re.sub(pat, repl, text)
    return text


def strip_tag_block(html: str, tag: str) -> str:
    return re.sub(rf"<{tag}\b[\s\S]*?</{tag}>", "", html, count=1, flags=re.I)


def extract_body(html: str) -> str:
    m = re.search(r"<body\b[^>]*>([\s\S]*)</body>", html, re.I)
    return m.group(1) if m else html


def strip_scripts(html: str) -> tuple[str, list[str]]:
    scripts: list[str] = []

    def repl(match: re.Match[str]) -> str:
        attrs = match.group(1) or ""
        body = match.group(2) or ""
        if "src=" in attrs:
            return ""
        scripts.append(body)
        return ""

    cleaned = re.sub(
        r"<script(\b[^>]*)>([\s\S]*?)</script>",
        repl,
        html,
        flags=re.I,
    )
    return cleaned, scripts


def extract_styles(html: str) -> tuple[str, str]:
    styles = re.findall(r"<style>([\s\S]*?)</style>", html, flags=re.I)
    cleaned = re.sub(r"<style>[\s\S]*?</style>", "", html, flags=re.I)
    return cleaned, "\n\n".join(styles).strip()


def _remove_function(script: str, name: str) -> str:
    needle = f"function {name}"
    start = script.find(needle)
    if start < 0:
        return script
    brace = script.find("{", start)
    if brace < 0:
        return script
    depth = 0
    i = brace
    while i < len(script):
        if script[i] == "{":
            depth += 1
        elif script[i] == "}":
            depth -= 1
            if depth == 0:
                end = i + 1
                comment = script.rfind("//", 0, start)
                line_start = script.rfind("\n", 0, start)
                cut = start
                if comment > line_start:
                    cut = comment
                return script[:cut] + script[end:]
        i += 1
    return script


def unwrap_dom_ready(script: str) -> str:
    """Keep full page scripts. Theme dropdown UI is owned by React."""
    script = _remove_function(script, "toggleThemeDropdown")
    script = re.sub(r"//\s*Theme dropdown toggle function\s*", "", script)
    script = re.sub(r"//\s*Utilities\s*", "", script)
    script = re.sub(
        r"document\.addEventListener\('keydown', function\(e\) \{\s*if \(e\.key === 'Escape'\) \{[\s\S]*?theme-dropdown[\s\S]*?\}\s*\}\s*\}\);\s*",
        "",
        script,
        count=1,
    )
    script = re.sub(
        r"document\.addEventListener\('click', function closeDropdown[\s\S]*?removeEventListener\('click', closeDropdown\);[\s\S]*?\}\s*\}\);",
        "",
        script,
    )
    script = re.sub(r"\s*\}, 0\);\s*\}\s*\}\s*\}\s*", "\n", script)
    return script.strip()


def strip_chrome(html: str) -> str:
    html = strip_tag_block(html, "nav")
    html = re.sub(
        r"<!--\s*Enhanced Footer\s*-->\s*<footer\b[\s\S]*?</footer>",
        "",
        html,
        count=1,
        flags=re.I,
    )
    html = re.sub(r"<footer\b[\s\S]*?</footer>", "", html, count=1, flags=re.I)
    html = re.sub(
        r"<!--\s*Project Details Modal\s*-->\s*<div id=\"project-modal\"[\s\S]*?</div>\s*</div>\s*</div>",
        "",
        html,
        count=1,
        flags=re.I,
    )
    html = re.sub(
        r"<!--\s*Contact Modal\s*-->\s*<div id=\"contactModal\"[\s\S]*?</div>\s*</div>",
        "",
        html,
        count=1,
        flags=re.I,
    )
    html = re.sub(
        r"<div id=\"contactModal\"[\s\S]*?</div>\s*</div>",
        "",
        html,
        count=1,
        flags=re.I,
    )
    html = re.sub(r"<!--\s*Enhanced JavaScript\s*-->", "", html, flags=re.I)
    html = re.sub(r"<!--\s*Enhanced Navigation\s*-->", "", html, flags=re.I)
    return html.strip()


def write_module(name: str, html: str, script: str) -> None:
    payload = {
        "html": html,
        "script": script,
    }
    (OUT / f"{name}.ts").write_text(
        "export const html = "
        + json.dumps(payload["html"], ensure_ascii=False)
        + ";\nexport const script = "
        + json.dumps(payload["script"], ensure_ascii=False)
        + ";\n",
        encoding="utf-8",
    )


PAGES = {
    "home": SRC / "index.html",
    "about": SRC / "public" / "about.html",
    "contact": SRC / "public" / "contact.html",
    "tech-playground": SRC / "public" / "tech-playground.html",
    "architecture-copilot-studio": SRC / "public" / "project-architecture-copilot-studio.html",
    "tprm-platform": SRC / "public" / "project-tprm-platform.html",
    "c6insights": SRC / "public" / "project-c6insights.html",
    "deep-view-analytics": SRC / "public" / "project-deep-view-analytics.html",
    "qlm": SRC / "public" / "project-qlm.html",
    "self-analytics": SRC / "public" / "project-self-analytics.html",
    "nec-iot-big-data": SRC / "public" / "project-nec-iot-big-data.html",
    "paos": SRC / "public" / "project-paos.html",
}

page_css: list[str] = []

for name, path in PAGES.items():
    raw = path.read_text(encoding="utf-8")
    raw, styles = extract_styles(raw)
    if styles:
        page_css.append(f"/* {name} */\n{styles}")
    body = extract_body(raw)
    body, scripts = strip_scripts(body)
    body = rewrite(strip_chrome(body))
    if name != "home":
        main = re.search(r"(<main\b[\s\S]*</main>)", body, re.I)
        if main:
            body = main.group(1)
    useful = []
    for s in scripts:
        if not s.strip():
            continue
        cleaned = unwrap_dom_ready(rewrite(s))
        if not cleaned.strip():
            continue
        if "function toggleThemeDropdown" in cleaned and "DOMContentLoaded" not in s and "openProjectModal" not in s and "switchView" not in s and "mermaid" not in s.lower():
            continue
        useful.append(cleaned)
    merged = "\n\n".join(useful)
    write_module(name, body, merged)
    print(f"{name:30} html={len(body):6} script={len(merged):6}")

(CSS_OUT / "page-specific.css").write_text("\n\n".join(page_css) + "\n", encoding="utf-8")
print("wrote page-specific.css", sum(len(s) for s in page_css))
