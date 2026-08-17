import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { LegacyPage } from "@/components/LegacyPage";
import { ProjectNav } from "@/components/ProjectNav";
import { getProjectPage } from "@/lib/project-content";
import { getPublicAppearance } from "@/lib/site-appearance";
import { PROJECTS, type ProjectSlug } from "@/lib/site";

export const dynamic = "force-dynamic";

export function generateStaticParams() {
  return PROJECTS.map((project) => ({ slug: project.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const project = getProjectPage(slug);
  if (!project) return { title: "Project | Nitender Kumar Portfolio" };
  return {
    title: project.title,
    description: `${project.name} — architecture, impact, and leadership notes from Nitender Kumar.`,
  };
}

export default async function ProjectPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const project = getProjectPage(slug);
  if (!project) notFound();
  const appearance = await getPublicAppearance();

  return (
    <>
      <LegacyPage
        html={project.html}
        script={project.script}
        mermaid={project.mermaid}
        elk={project.elk}
      />
      <ProjectNav slug={project.slug as ProjectSlug} mode={appearance.mode} />
    </>
  );
}
