import * as architectureCopilotStudio from "@/content/architecture-copilot-studio";
import * as c6insights from "@/content/c6insights";
import * as deepViewAnalytics from "@/content/deep-view-analytics";
import * as necIotBigData from "@/content/nec-iot-big-data";
import * as paos from "@/content/paos";
import * as qlm from "@/content/qlm";
import * as selfAnalytics from "@/content/self-analytics";
import * as tprmPlatform from "@/content/tprm-platform";
import { PROJECTS, PROJECT_TITLES, type ProjectSlug } from "@/lib/site";

const CONTENT: Record<ProjectSlug, { html: string; script: string }> = {
  "architecture-copilot-studio": architectureCopilotStudio,
  "tprm-platform": tprmPlatform,
  c6insights,
  "deep-view-analytics": deepViewAnalytics,
  qlm,
  "self-analytics": selfAnalytics,
  paos,
  "nec-iot-big-data": necIotBigData,
};

export function getProjectPage(slug: string) {
  const project = PROJECTS.find((item) => item.slug === slug);
  if (!project) return null;
  return {
    ...project,
    title: PROJECT_TITLES[project.slug],
    ...CONTENT[project.slug],
  };
}
