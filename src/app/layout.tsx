import type { Metadata } from "next";
import { AppShell } from "@/components/AppShell";
import { getPublicAppearance } from "@/lib/site-appearance";
import { HOME_METADATA } from "@/lib/site";
import { themeInitScript } from "@/lib/theme-init";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://nitty01.github.io/nitender-kumar"),
  title: HOME_METADATA.title,
  description: HOME_METADATA.description,
  icons: {
    icon: "/favicon.svg",
  },
  openGraph: {
    type: "website",
    title: HOME_METADATA.title,
    description: HOME_METADATA.description,
    images: ["/assets/images/profile_pic.jpg"],
  },
};

export const dynamic = "force-dynamic";

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const appearance = await getPublicAppearance();

  return (
    <html
      lang="en"
      data-site-mode={appearance.mode}
      data-theme={appearance.theme}
      data-show-blog={String(appearance.showBlog)}
      data-show-about={String(appearance.showAbout)}
      data-show-contact={String(appearance.showContact)}
      data-show-playground={String(appearance.showPlayground)}
      data-show-experience={String(appearance.showExperience)}
      className={appearance.theme === "sunrise" ? "light" : "dark"}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript(appearance.mode, appearance.theme) }} />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Newsreader:opsz,wght@6..72,400;6..72,500;6..72,600&family=Source+Sans+3:wght@400;500;600;700&display=swap"
        />
        <link rel="stylesheet" href="/css/tailwind.css" />
        <link rel="stylesheet" href="/css/main.css" />
        <link rel="stylesheet" href="/css/site-mode.css" />
        <link rel="stylesheet" href="/css/mermaid-diagrams.css" />
        <link rel="stylesheet" href="/css/page-specific.css" />
        <link
          rel="stylesheet"
          href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.0/css/all.min.css"
        />
        <link rel="stylesheet" href="/css/executive.css" />
        <link rel="stylesheet" href="/css/admin.css" />
      </head>
      <body className={appearance.theme === "sunrise" ? "light min-h-screen" : "dark min-h-screen"}>
        <AppShell appearance={appearance}>{children}</AppShell>
      </body>
    </html>
  );
}
