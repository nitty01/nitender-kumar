"use client";

import Link from "next/link";
import { LinkedInButton } from "@/components/LinkedInButton";
import { SITE } from "@/lib/site";
import type { SiteAppearance } from "@/lib/site-appearance";

export function SiteFooter({ appearance }: { appearance: SiteAppearance }) {
  return (
    <footer className="site-footer">
      <div className="max-w-7xl mx-auto px-4 py-16">
        <div className="grid md:grid-cols-4 gap-10">
          <div className="md:col-span-2">
            <h3>{SITE.name}</h3>
            <p className="text-gray-400 mt-3 max-w-xl">
              Engineering leader targeting Head of Platform Engineering, Director of Engineering,
              or Head of AI/Data Platform — platform, data, and GenAI at enterprise scale.
            </p>
            <p className="text-gray-400 mt-3 max-w-xl">
              Production proven: 5TB+/day streaming, 500K+ vehicles, 8–12 engineer pods, 25–30%
              cloud savings, governed multi-tenant GenAI.
            </p>
            <div className="flex gap-3 mt-6">
              <LinkedInButton variant="icon" />
              <a href={SITE.github} className="site-footer-social" aria-label="GitHub">
                <i className="fab fa-github" aria-hidden="true" />
              </a>
            </div>
          </div>
          <div>
            <h4 className="font-semibold mb-4">Quick Links</h4>
            <ul className="space-y-2">
              {appearance.showAbout ? (
                <li>
                  <Link href="/about" className="text-gray-400 hover:text-accent transition-colors">
                    About
                  </Link>
                </li>
              ) : null}
              {appearance.showBlog ? (
                <li>
                  <Link href="/blog" className="text-gray-400 hover:text-accent transition-colors">
                    Notes
                  </Link>
                </li>
              ) : null}
              <li>
                <Link href="/#projects" className="text-gray-400 hover:text-accent transition-colors">
                  Projects
                </Link>
              </li>
              {appearance.showContact ? (
                <li>
                  <Link href="/contact" className="text-gray-400 hover:text-accent transition-colors">
                    Contact
                  </Link>
                </li>
              ) : null}
              {appearance.showPlayground && appearance.mode === "engineer" ? (
                <li>
                  <Link
                    data-mode="engineer"
                    href="/tech-playground"
                    className="text-gray-400 hover:text-accent transition-colors"
                  >
                    Playground
                  </Link>
                </li>
              ) : null}
            </ul>
          </div>
          <div>
            <h4 className="font-semibold mb-4">Get In Touch</h4>
            <ul className="space-y-2 text-gray-400">
              <li className="flex items-center gap-2">
                <i className="fas fa-envelope" aria-hidden="true" />
                <a href={`mailto:${SITE.email}`} className="hover:text-accent transition-colors">
                  {SITE.email}
                </a>
              </li>
              <li className="flex items-center gap-2">
                <i className="fas fa-phone" aria-hidden="true" />
                <a href={SITE.phoneHref} className="hover:text-accent transition-colors">
                  {SITE.phone}
                </a>
              </li>
              <li className="flex items-center gap-2">
                <i className="fas fa-map-marker-alt" aria-hidden="true" />
                <span>{SITE.location}</span>
              </li>
            </ul>
          </div>
        </div>
        <div className="border-t border-gray-800 pt-8 mt-12">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-gray-400 text-sm">
              © 2026 {SITE.name} · Bangalore · Platform · Data · AI
            </p>
            <div className="flex gap-4">
              <a
                href={SITE.resumeHref}
                download={SITE.resumeDownload}
                className="text-accent hover:text-accent2 text-sm transition-colors"
                data-gtm="download_resume_footer"
              >
                Download Resume
              </a>
              <span className="text-gray-600">|</span>
              <button
                id="scroll-to-top"
                type="button"
                className="text-accent hover:text-accent2 text-sm transition-colors"
                onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
              >
                Back to Top
              </button>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}

