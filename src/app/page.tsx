import { LegacyPage } from "@/components/LegacyPage";
import { ProjectModal } from "@/components/ProjectModal";
import { html, script } from "@/content/home";

export default function HomePage() {
  return (
    <>
      <LegacyPage html={html} script={script} />
      <ProjectModal />
    </>
  );
}
