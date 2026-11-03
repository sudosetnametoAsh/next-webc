"use client";

import { createContext, useEffect, useId, useRef, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";

// Menus inside a native modal must stay in its top layer.
export const DrawerPortalContext = createContext<HTMLElement | null>(null);

export function Drawer({
  open,
  onClose,
  title,
  side = "right",
  mobileOnly = false,
  className,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  side?: "left" | "right";
  mobileOnly?: boolean;
  className?: string;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const [container, setContainer] = useState<HTMLDivElement | null>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    else if (!open && dialog.open) dialog.close();
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = previous; };
  }, [open]);

  useEffect(() => {
    if (!open || !mobileOnly) return;
    const desktop = window.matchMedia("(min-width: 1024px)");
    const closeOnDesktop = () => { if (desktop.matches) onClose(); };
    closeOnDesktop();
    desktop.addEventListener("change", closeOnDesktop);
    return () => desktop.removeEventListener("change", closeOnDesktop);
  }, [open, mobileOnly, onClose]);

  return (
    <DrawerPortalContext.Provider value={container}>
      <dialog
        ref={ref}
        className="app-drawer"
        data-side={side}
        aria-labelledby={titleId}
        onCancel={(event) => { event.preventDefault(); onClose(); }}
        onClick={(event) => { if (event.target === event.currentTarget) onClose(); }}
      >
        <div ref={setContainer} className={cn("app-drawer-panel flex h-full min-h-0 flex-col bg-portal-surface text-portal-foreground shadow-2xl", className)}>
          <h2 id={titleId} className="sr-only">{title}</h2>
          {children}
        </div>
      </dialog>
    </DrawerPortalContext.Provider>
  );
}
