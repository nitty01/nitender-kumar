import { notFound } from "next/navigation";
import { getPublicAppearance, type SiteAppearance } from "@/lib/site-appearance";

export async function requirePublicPage(
  key: keyof Pick<
    SiteAppearance,
    "showBlog" | "showPlayground" | "showAbout" | "showContact"
  >,
) {
  const appearance = await getPublicAppearance();
  if (key === "showPlayground" && appearance.mode !== "engineer") notFound();
  if (!appearance[key]) notFound();
  return appearance;
}
