"use client";

import { usePathname } from "next/navigation";
import { Analytics } from "@/components/Analytics";
import { ContactModal } from "@/components/ContactModal";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteNav } from "@/components/SiteNav";
import { ThemeProvider } from "@/components/ThemeProvider";
import type { SiteAppearance } from "@/lib/site-appearance";

export function AppShell({
  children,
  appearance,
}: {
  children: React.ReactNode;
  appearance: SiteAppearance;
}) {
  const pathname = usePathname();
  const isAdmin = pathname.startsWith("/admin");

  if (isAdmin) {
    return <>{children}</>;
  }

  return (
    <ThemeProvider theme={appearance.theme}>
      <Analytics />
      <SiteNav appearance={appearance} />
      {children}
      <SiteFooter appearance={appearance} />
      {appearance.showContact ? <ContactModal /> : null}
    </ThemeProvider>
  );
}
