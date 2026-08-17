import type { Metadata } from "next";
import { LegacyPage } from "@/components/LegacyPage";
import { html, script } from "@/content/contact";
import { requirePublicPage } from "@/lib/public-pages";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Contact | Nitender Kumar Portfolio",
  description: "Contact Nitender Kumar for Head of Platform Engineering, Director of Engineering, and AI/data platform leadership conversations.",
};

export default async function ContactPage() {
  await requirePublicPage("showContact");
  return <LegacyPage html={html} script={script} />;
}
