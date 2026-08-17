"use client";

import { useEffect, useState } from "react";
import { LinkedInButton } from "@/components/LinkedInButton";
import { SITE } from "@/lib/site";

export function ContactModal() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    window.openContactModal = () => {
      setOpen(true);
      document.body.style.overflow = "hidden";
    };
    window.closeContactModal = () => {
      setOpen(false);
      document.body.style.overflow = "";
    };
    window.copyEmailToClipboard = () => {
      const done = () => {
        window.alert(`Email address copied to clipboard: ${SITE.email}`);
        window.closeContactModal?.();
      };
      if (navigator.clipboard?.writeText) {
        navigator.clipboard.writeText(SITE.email).then(done).catch(done);
      } else {
        done();
      }
    };
    window.openEmailClient = () => {
      window.location.href = `mailto:${SITE.email}`;
      window.closeContactModal?.();
    };
    window.openLinkedIn = () => {
      window.open(SITE.linkedin, "_blank", "noopener");
      window.closeContactModal?.();
    };
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") window.closeContactModal?.();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <div
      id="contactModal"
      className={`contact-modal fixed inset-0 z-50 ${open ? "flex" : "hidden"} items-center justify-center p-4`}
      onClick={(event) => {
        if (event.target === event.currentTarget) window.closeContactModal?.();
      }}
    >
      <div className="contact-modal__panel p-6 max-w-md w-full mx-4">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl">Get in Touch</h3>
          <button
            type="button"
            onClick={() => window.closeContactModal?.()}
            className="text-gray-400 hover:text-accent"
            aria-label="Close contact options"
          >
            <i className="fas fa-times text-xl" aria-hidden="true" />
          </button>
        </div>
        <div className="space-y-4">
          <p className="text-center text-gray-400 mb-4">Choose how you would like to connect:</p>
          <div className="space-y-3">
            <button
              type="button"
              onClick={() => window.copyEmailToClipboard?.()}
              className="contact-modal__action contact-modal__action--primary"
            >
              <i className="fas fa-copy" aria-hidden="true" />
              Copy Email Address
            </button>
            <button
              type="button"
              onClick={() => window.openEmailClient?.()}
              className="contact-modal__action"
            >
              <i className="fas fa-envelope" aria-hidden="true" />
              Open Email Client
            </button>
            <LinkedInButton
              className="btn-linkedin--block"
              label="Connect on LinkedIn"
              onClick={() => window.closeContactModal?.()}
            />
          </div>
          <p className="text-center text-sm text-gray-400">{SITE.email}</p>
        </div>
      </div>
    </div>
  );
}
