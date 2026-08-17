"use client";

import { useEffect, useRef, useState } from "react";
import { THEMES, type ThemeId } from "@/lib/site";

export function ThemeSwitcher() {
  const [open, setOpen] = useState(false);
  const [current, setCurrent] = useState<ThemeId>("ocean");
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const stored = window.getCurrentTheme?.() ?? localStorage.getItem("portfolio-theme");
    if (stored && THEMES.some((theme) => theme.id === stored)) {
      setCurrent(stored as ThemeId);
    }

    const onChange = (event: Event) => {
      const theme = (event as CustomEvent<{ theme: ThemeId }>).detail?.theme;
      if (theme) setCurrent(theme);
    };
    window.addEventListener("themechange", onChange);
    return () => window.removeEventListener("themechange", onChange);
  }, []);

  useEffect(() => {
    if (!open) return;
    const onClick = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("click", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("click", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div className="theme-switcher" ref={rootRef}>
      <button
        id="theme-switcher-btn"
        className="theme-switcher-btn"
        type="button"
        aria-label="Change theme"
        aria-expanded={open}
        aria-haspopup="true"
        onClick={() => setOpen((value) => !value)}
      >
        <i id="current-theme-icon" className="fas fa-palette" aria-hidden="true" />
        <span id="current-theme-indicator" className="hidden sm:inline">
          Theme
        </span>
        <i className="fas fa-chevron-down text-xs" aria-hidden="true" />
      </button>
      <div
        id="theme-dropdown"
        className={`theme-dropdown${open ? " show" : ""}`}
        role="menu"
        aria-label="Theme selection"
      >
        <div className="theme-grid">
          {THEMES.map((theme) => (
            <button
              key={theme.id}
              type="button"
              data-theme-option={theme.id}
              className={`theme-option${current === theme.id ? " active" : ""}`}
              role="menuitem"
              aria-label={theme.label}
              onClick={() => {
                window.switchTheme?.(theme.id);
                setCurrent(theme.id);
                setOpen(false);
              }}
            >
              <div
                className="theme-color-preview"
                style={{ background: theme.gradient }}
              />
              <div className="theme-name">{theme.name}</div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
