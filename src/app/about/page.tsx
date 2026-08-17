import type { Metadata } from "next";
import { LegacyPage } from "@/components/LegacyPage";
import { html, script } from "@/content/about";
import { requirePublicPage } from "@/lib/public-pages";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "About Me | Nitender Kumar Portfolio",
  description:
    "About Nitender Kumar — engineering leader focused on platform engineering, GenAI architecture, data systems, and cloud FinOps.",
};

export default async function AboutPage() {
  await requirePublicPage("showAbout");
  return <LegacyPage html={html} script={script} />;
}
