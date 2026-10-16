"use client";

import React, { useEffect, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { RoleSidebar } from "./role-sidebar";
import { TopUtilityBar } from "./top-utility-bar";
import { cn } from "@/lib/utils";

export interface PersistentAppShellProps {
  session: {
    user_id: string;
    user_name: string;
    user_email: string;
    role: "Admin" | "Staff" | "Department" | "Student";
    department?: string;
  };
  children: React.ReactNode;
  sidebarExtra?: React.ReactNode;
}

const STORAGE_KEY = "sti_webc_sidebar_collapsed";

export function PersistentAppShell({
  session,
  children,
  sidebarExtra,
}: PersistentAppShellProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Initialize collapse state from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved !== null) {
        setCollapsed(saved === "true");
      }
    } catch {
      // LocalStorage access may fail in certain environments
    }
  }, []);

  // Close mobile drawer on navigation
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname, searchParams]);

  // Release the modal when the desktop navigation takes over.
  useEffect(() => {
    const desktop = window.matchMedia("(min-width: 1024px)");
    const closeOnDesktop = () => {
      if (desktop.matches) setMobileOpen(false);
    };
    desktop.addEventListener("change", closeOnDesktop);
    return () => desktop.removeEventListener("change", closeOnDesktop);
  }, []);

  const handleToggleCollapse = () => {
    setCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(STORAGE_KEY, String(next));
      } catch {
        // ignore
      }
      return next;
    });
  };

  return (
    <Dialog open={mobileOpen} onOpenChange={setMobileOpen}>
      <div className="flex h-dvh w-full overflow-hidden bg-background text-foreground">
        {/* Desktop Sidebar (hidden on screens < lg) */}
        <div
          className={cn(
            "hidden lg:flex flex-col shrink-0 h-full",
            collapsed ? "w-[72px]" : "w-[260px]"
          )}
        >
          <RoleSidebar
            session={session}
            collapsed={collapsed}
            onToggleCollapse={handleToggleCollapse}
            extraContent={sidebarExtra}
          />
        </div>

        <DialogContent
          aria-describedby={undefined}
          className="left-0 top-0 h-dvh w-[280px] max-w-[85vw] translate-x-0 translate-y-0 rounded-none border-y-0 border-l-0 bg-white p-0 gap-0 flex flex-col sm:max-w-[280px] dark:bg-[#0B192C] data-[state=open]:slide-in-from-bottom-0 data-[state=open]:slide-in-from-left data-[state=closed]:slide-out-to-left data-[state=open]:zoom-in-100 data-[state=closed]:zoom-out-100"
        >
          <DialogTitle className="sr-only">Navigation menu</DialogTitle>
          <RoleSidebar
            session={session}
            collapsed={false}
            onToggleCollapse={() => setMobileOpen(false)}
            extraContent={sidebarExtra}
            onNavigate={() => setMobileOpen(false)}
          />
        </DialogContent>

        {/* Main Viewport */}
        <div className="flex-1 flex flex-col h-full min-w-0 overflow-hidden">
          {/* Sticky Top Utility Bar */}
          <TopUtilityBar session={session} />

          {/* Scrollable Content Canvas */}
          <main className="flex-1 min-h-0 min-w-0 overflow-auto bg-background p-4 sm:p-6 lg:p-8">
            {children}
          </main>
        </div>
      </div>
    </Dialog>
  );
}

export default PersistentAppShell;
