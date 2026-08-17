"use client";

import Link from "next/link";
import { projectNavMeta, type ProjectSlug, type SiteMode } from "@/lib/site";

export function ProjectNav({ slug, mode }: { slug: ProjectSlug; mode: SiteMode }) {
  const { sequence, index, previous, next, allHref, allLabel } = projectNavMeta(mode, slug);
  if (index === -1) return null;

  return (
    <div className="project-navigation glass rounded-xl p-6 mb-8 border border-accent/20 max-w-7xl mx-auto px-4">
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="text-sm" style={{ color: "var(--text-muted)" }}>
          Project {index + 1} of {sequence.length}
        </div>
        <div className="flex items-center gap-4 flex-wrap justify-center">
          {previous ? (
            <Link
              href={`/projects/${previous.slug}`}
              className="project-nav-btn flex items-center gap-2 px-4 sm:px-6 py-3 bg-white/10 hover:bg-accent/20 rounded-lg font-medium transition-all duration-300 hover:scale-105 border border-white/20 hover:border-accent/50"
              style={{ color: "var(--text-light)" }}
            >
              <i className="fas fa-chevron-left" aria-hidden="true" />
              <span className="flex flex-col items-start">
                <span className="text-xs opacity-75 hidden sm:block">Previous</span>
                <span className="text-sm font-semibold">{previous.name}</span>
              </span>
            </Link>
          ) : (
            <div
              className="project-nav-btn flex items-center gap-2 px-4 sm:px-6 py-3 bg-white/5 rounded-lg font-medium cursor-not-allowed opacity-50"
              style={{ color: "var(--text-muted)" }}
            >
              <i className="fas fa-chevron-left" aria-hidden="true" />
              <span className="hidden sm:inline">Previous</span>
            </div>
          )}
          <a
            href={allHref}
            className="project-nav-btn flex items-center gap-2 px-4 py-3 bg-gradient-to-r from-accent/20 to-accent2/20 hover:from-accent/30 hover:to-accent2/30 rounded-lg font-medium transition-all duration-300 hover:scale-105 border border-accent/30"
            style={{ color: "var(--text-light)" }}
          >
            <i className="fas fa-th" aria-hidden="true" />
            <span className="hidden sm:inline">{allLabel}</span>
          </a>
          {next ? (
            <Link
              href={`/projects/${next.slug}`}
              className="project-nav-btn flex items-center gap-2 px-4 sm:px-6 py-3 bg-white/10 hover:bg-accent/20 rounded-lg font-medium transition-all duration-300 hover:scale-105 border border-white/20 hover:border-accent/50"
              style={{ color: "var(--text-light)" }}
            >
              <span className="flex flex-col items-end">
                <span className="text-xs opacity-75 hidden sm:block">Next</span>
                <span className="text-sm font-semibold">{next.name}</span>
              </span>
              <i className="fas fa-chevron-right" aria-hidden="true" />
            </Link>
          ) : (
            <div
              className="project-nav-btn flex items-center gap-2 px-4 sm:px-6 py-3 bg-white/5 rounded-lg font-medium cursor-not-allowed opacity-50"
              style={{ color: "var(--text-muted)" }}
            >
              <span className="hidden sm:inline">Next</span>
              <i className="fas fa-chevron-right" aria-hidden="true" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
