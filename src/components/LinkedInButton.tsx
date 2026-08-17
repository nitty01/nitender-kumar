"use client";

import { SITE } from "@/lib/site";

type LinkedInButtonProps = {
  variant?: "pill" | "icon";
  label?: string;
  className?: string;
  onClick?: () => void;
};

export function LinkedInButton({
  variant = "pill",
  label = "LinkedIn",
  className = "",
  onClick,
}: LinkedInButtonProps) {
  const isIcon = variant === "icon";

  return (
    <a
      className={`btn-linkedin${isIcon ? " btn-linkedin--icon" : ""}${className ? ` ${className}` : ""}`}
      href={SITE.linkedin}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={isIcon ? "LinkedIn profile" : label}
      data-gtm="linkedin"
      onClick={onClick}
    >
      <span className="btn-linkedin__bug" aria-hidden="true">
        in
      </span>
      {isIcon ? null : <span className="btn-linkedin__label">{label}</span>}
    </a>
  );
}

