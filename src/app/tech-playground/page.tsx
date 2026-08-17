import type { Metadata } from "next";
import { LegacyPage } from "@/components/LegacyPage";
import { html, script } from "@/content/tech-playground";
import { requirePublicPage } from "@/lib/public-pages";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Tech Playground | Nitender Kumar Portfolio",
  description: "Interactive notes, experiments, and engineering interests from Nitender Kumar.",
};

export default async function TechPlaygroundPage() {
  await requirePublicPage("showPlayground");
  return <LegacyPage html={html} script={script} />;
}
