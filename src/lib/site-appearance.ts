import { createAdminSupabase, createPublicSupabase, type SiteMode } from "@/lib/admin-data";
import { THEMES, type ThemeId } from "@/lib/site";

export const PUBLIC_SETTING_KEYS = [
  "site_mode",
  "theme",
  "show_blog",
  "show_playground",
  "show_about",
  "show_contact",
  "show_experience",
] as const;

export type PublicSettingKey = (typeof PUBLIC_SETTING_KEYS)[number];

export type SiteAppearance = {
  mode: SiteMode;
  theme: ThemeId;
  showBlog: boolean;
  showPlayground: boolean;
  showAbout: boolean;
  showContact: boolean;
  showExperience: boolean;
};

export const DEFAULT_APPEARANCE: SiteAppearance = {
  mode: "cto",
  theme: "ocean",
  showBlog: true,
  showPlayground: true,
  showAbout: true,
  showContact: true,
  showExperience: true,
};

function isThemeId(value: string): value is ThemeId {
  return THEMES.some((theme) => theme.id === value);
}

function asBool(value: string | undefined, fallback: boolean) {
  if (value === "true") return true;
  if (value === "false") return false;
  return fallback;
}

export function parseAppearance(map: Record<string, string>): SiteAppearance {
  const themeValue = map.theme ?? "";
  return {
    mode: map.site_mode === "engineer" ? "engineer" : "cto",
    theme: isThemeId(themeValue) ? themeValue : DEFAULT_APPEARANCE.theme,
    showBlog: asBool(map.show_blog, true),
    showPlayground: asBool(map.show_playground, true),
    showAbout: asBool(map.show_about, true),
    showContact: asBool(map.show_contact, true),
    showExperience: asBool(map.show_experience, true),
  };
}

async function readSettings(admin: boolean): Promise<Record<string, string>> {
  const client = admin ? createAdminSupabase() : createPublicSupabase();
  if (!client) return {};
  const { data, error } = await client
    .from("site_settings")
    .select("key,value")
    .in("key", [...PUBLIC_SETTING_KEYS]);
  if (error || !data) return {};
  return Object.fromEntries(data.map((row) => [row.key, row.value]));
}

export async function getPublicAppearance(): Promise<SiteAppearance> {
  return parseAppearance(await readSettings(false));
}

export async function getAdminAppearance(): Promise<SiteAppearance> {
  return parseAppearance(await readSettings(true));
}

export async function saveAppearance(next: SiteAppearance) {
  const client = createAdminSupabase();
  const now = new Date().toISOString();
  const rows = [
    { key: "site_mode", value: next.mode, updated_at: now },
    { key: "theme", value: next.theme, updated_at: now },
    { key: "show_blog", value: String(next.showBlog), updated_at: now },
    { key: "show_playground", value: String(next.showPlayground), updated_at: now },
    { key: "show_about", value: String(next.showAbout), updated_at: now },
    { key: "show_contact", value: String(next.showContact), updated_at: now },
    { key: "show_experience", value: String(next.showExperience), updated_at: now },
  ];
  const { error } = await client.from("site_settings").upsert(rows);
  if (error) throw new Error(error.message);
}
