export function themeInitScript(
  siteMode: "cto" | "engineer" = "cto",
  theme: string = "ocean",
) {
  return `(function(){
  try {
    var theme = ${JSON.stringify(theme)};
    document.documentElement.setAttribute('data-theme', theme);
    document.documentElement.setAttribute('data-site-mode', ${JSON.stringify(siteMode)});
    var isLight = theme === 'sunrise';
    document.documentElement.classList.toggle('light', isLight);
    document.documentElement.classList.toggle('dark', !isLight);
  } catch (e) {
    document.documentElement.setAttribute('data-theme', 'ocean');
    document.documentElement.setAttribute('data-site-mode', ${JSON.stringify(siteMode)});
  }
})();`;
}

/** @deprecated use themeInitScript(mode, theme) */
export const THEME_INIT_SCRIPT = themeInitScript("cto", "ocean");
