"use client";

import Link from "next/link";
import { useState } from "react";
import { LinkedInButton } from "@/components/LinkedInButton";
import { SITE } from "@/lib/site";
import type { SiteAppearance } from "@/lib/site-appearance";

function goToHomeSection(hash: string, close: () => void) {
  return (event: React.MouseEvent<HTMLAnchorElement>) => {
    close();
    if (window.location.pathname !== "/") return;
    event.preventDefault();
    document.getElementById(hash.slice(1))?.scrollIntoView({ behavior: "smooth" });
  };
}

export function SiteNav({ appearance }: { appearance: SiteAppearance }) {
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);

  return (
    <nav className="site-nav w-full flex items-center justify-between px-4 sticky top-0 z-50">
      <Link className="site-wordmark" href="/" aria-label="Home">
        {SITE.name}
      </Link>
      <button
        id="nav-toggle"
        type="button"
        className="site-nav-toggle md:hidden px-3 py-2"
        aria-label="Toggle navigation"
        aria-expanded={open}
        aria-controls="nav-links"
        onClick={() => setOpen((value) => !value)}
      >
        <i className="fas fa-bars" aria-hidden="true" />
      </button>
      <div
        id="nav-links"
        className={`${open ? "" : "hidden "}md:flex items-center gap-1 md:gap-2`}
      >
        {appearance.showAbout ? (
          <Link className="site-nav-link px-3 py-2" href="/about" onClick={close}>
            About
          </Link>
        ) : null}
        {appearance.showBlog ? (
          <Link className="site-nav-link px-3 py-2" href="/blog" onClick={close}>
            Blog
          </Link>
        ) : null}
        <Link
          data-mode="engineer"
          className="site-nav-link px-3 py-2"
          href="/#projects"
          onClick={goToHomeSection("#projects", close)}
        >
          Projects
        </Link>
        <Link
          data-mode="cto"
          className="site-nav-link px-3 py-2"
          href="/#case-studies"
          onClick={goToHomeSection("#case-studies", close)}
        >
          Case Studies
        </Link>
        {appearance.showExperience ? (
          <Link
            className="site-nav-link px-3 py-2"
            href="/#experience"
            onClick={goToHomeSection("#experience", close)}
          >
            Experience
          </Link>
        ) : null}
        {appearance.showContact ? (
          <Link className="site-nav-link px-3 py-2" href="/contact" onClick={close}>
            Contact
          </Link>
        ) : null}
        {appearance.showPlayground && appearance.mode === "engineer" ? (
          <Link
            data-mode="engineer"
            className="site-nav-link px-3 py-2"
            href="/tech-playground"
            onClick={close}
          >
            Playground
          </Link>
        ) : null}
        <LinkedInButton />
      </div>
    </nav>
  );
}
