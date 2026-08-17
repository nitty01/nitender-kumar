export const SITE = {
  name: "Nitender Kumar",
  email: "nitender.kumar11@gmail.com",
  phone: "+91-7899911081",
  phoneHref: "tel:+917899911081",
  location: "Bangalore, India",
  linkedin: "https://www.linkedin.com/in/nitender-kumar/",
  github: "https://github.com/nitty01",
  resumeHref: "/assets/NITENDER_KUMAR_EXECUTIVE_V3.pdf",
  resumeDownload: "NITENDER_KUMAR_EXECUTIVE_V3.pdf",
} as const;

export const HOME_METADATA = {
  title: "Nitender Kumar | Engineering Leader — Platform, Data & AI",
  description:
    "Engineering leader: 14+ years, 5TB+/day streaming across 500K+ vehicles, Azure multi-tenant GenAI, 25–30% cloud cost reduction. Targeting Head of Platform Engineering, Director of Engineering, or Head of AI/Data Platform.",
} as const;

export const THEMES = [
  { id: "ocean", name: "Ink", label: "Ink theme", gradient: "linear-gradient(135deg, #0c0e12, #c6ae84)" },
  { id: "sunrise", name: "Paper", label: "Paper theme", gradient: "linear-gradient(135deg, #f4f0e8, #6f5634)" },
  { id: "midnight", name: "Midnight", label: "Midnight Blue theme", gradient: "linear-gradient(135deg, #3b82f6, #2563eb)" },
  { id: "royal", name: "Royal", label: "Royal Purple theme", gradient: "linear-gradient(135deg, #a855f7, #9333ea)" },
  { id: "forest", name: "Forest", label: "Forest Green theme", gradient: "linear-gradient(135deg, #10b981, #059669)" },
  { id: "sunset", name: "Sunset", label: "Sunset theme", gradient: "linear-gradient(135deg, #f97316, #ea580c)" },
  { id: "blossom", name: "Blossom", label: "Blossom theme", gradient: "linear-gradient(135deg, #ec4899, #db2777)" },
] as const;

export type ThemeId = (typeof THEMES)[number]["id"];

export const THEME_MIGRATION: Record<string, ThemeId> = {
  dark: "ocean",
  light: "sunrise",
  blue: "midnight",
  purple: "royal",
  green: "forest",
  orange: "sunset",
  pink: "blossom",
};

export const PROJECTS = [
  { slug: "architecture-copilot-studio", name: "Architecture Copilot Studio", mermaid: true, elk: false },
  { slug: "tprm-platform", name: "AI-Driven TPRM Platform", mermaid: true, elk: false },
  { slug: "c6insights", name: "C6 Insights", mermaid: true, elk: false },
  { slug: "deep-view-analytics", name: "Deep View Analytics", mermaid: true, elk: false },
  { slug: "qlm", name: "QLM Platform", mermaid: true, elk: false },
  { slug: "self-analytics", name: "Self Analytics", mermaid: true, elk: true },
  { slug: "paos", name: "PAOS (Predictive Auto Ordering System)", mermaid: true, elk: false },
  { slug: "nec-iot-big-data", name: "NEC IoT Big Data", mermaid: true, elk: false },
] as const;

export type ProjectSlug = (typeof PROJECTS)[number]["slug"];

export const FEATURED_PROJECTS = PROJECTS.slice(0, 3);

export const PROJECT_TITLES: Record<ProjectSlug, string> = {
  "architecture-copilot-studio": "Architecture Copilot Studio | Nitender Kumar Portfolio",
  "tprm-platform": "AI-Driven TPRM Platform | Nitender Kumar Portfolio",
  c6insights: "C6 Insights | Nitender Kumar Portfolio",
  "deep-view-analytics": "Deep View Analytics | Nitender Kumar Portfolio",
  qlm: "QLM Platform | Nitender Kumar Portfolio",
  "self-analytics": "Self Analytics | Nitender Kumar Portfolio",
  paos: "PAOS | Nitender Kumar Portfolio",
  "nec-iot-big-data": "NEC IoT Big Data | Nitender Kumar Portfolio",
};

/** Compile-time default; runtime mode comes from Supabase site_settings. */
export const SITE_MODE = "cto" as const;

export type SiteMode = "cto" | "engineer";

export function projectsForMode(mode: SiteMode) {
  return mode === "cto" ? FEATURED_PROJECTS : PROJECTS;
}

export function projectNavMeta(mode: SiteMode, slug: ProjectSlug) {
  const sequence = projectsForMode(mode);
  const index = sequence.findIndex((project) => project.slug === slug);
  return {
    sequence,
    index,
    previous: index > 0 ? sequence[index - 1] : null,
    next: index >= 0 && index < sequence.length - 1 ? sequence[index + 1] : null,
    allHref: mode === "cto" ? "/#case-studies" : "/#projects",
    allLabel: mode === "cto" ? "Case Studies" : "All Projects",
  };
}
