"use client";

import { useEffect } from "react";
import type { ThemeId } from "@/lib/site";

declare global {
  interface Window {
    switchTheme?: (themeName: string) => void;
    getCurrentTheme?: () => string;
    openContactModal?: () => void;
    closeContactModal?: () => void;
    copyEmailToClipboard?: () => void;
    openEmailClient?: () => void;
    openLinkedIn?: () => void;
  }
}

function applyTheme(theme: ThemeId) {
  const root = document.documentElement;
  const body = document.body;
  root.setAttribute("data-theme", theme);
  body.setAttribute("data-theme", theme);
  body.classList.remove("dark", "light");
  if (theme === "sunrise") {
    body.classList.add("light");
    root.classList.add("light");
    root.classList.remove("dark");
  } else {
    body.classList.add("dark");
    root.classList.add("dark");
    root.classList.remove("light");
  }
}

export function ThemeProvider({
  children,
  theme,
}: {
  children: React.ReactNode;
  theme: ThemeId;
}) {
  useEffect(() => {
    applyTheme(theme);
    window.switchTheme = () => applyTheme(theme);
    window.getCurrentTheme = () => theme;
  }, [theme]);

  return children;
}
