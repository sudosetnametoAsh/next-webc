"use client";

import React, { useEffect, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { X } from "lucide-react";
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

  // Handle escape key to close mobile drawer
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && mobileOpen) {
        setMobileOpen(false);
      }
    };

    if (mobileOpen) {
      window.addEventListener("keydown", handleKeyDown);
    }
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [mobileOpen]);

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
    <div className="flex h-screen w-screen overflow-hidden bg-background text-foreground">
      {/* Desktop Sidebar (hidden on screens < lg) */}
      <div
        className={cn(
          "hidden lg:flex flex-col shrink-0 h-full transition-[width] duration-200 ease-in-out",
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

      {/* Mobile Drawer (visible on screens < lg when mobileOpen) */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs transition-opacity animate-in fade-in-0 duration-200"
            onClick={() => setMobileOpen(false)}
            aria-hidden="true"
          />

          {/* Drawer Slide-over */}
          <div className="fixed inset-y-0 left-0 z-50 w-[280px] max-w-[85vw] bg-white dark:bg-[#0B192C] border-r border-slate-200 dark:border-white/10 shadow-2xl transition-transform animate-in slide-in-from-left duration-200 flex flex-col">
            {/* Close button */}
            <div className="absolute top-4 right-3 z-10">
              <button
                type="button"
                onClick={() => setMobileOpen(false)}
                className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-white dark:hover:bg-white/10 transition-colors cursor-pointer"
                aria-label="Close navigation menu"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <RoleSidebar
              session={session}
              collapsed={false}
              onToggleCollapse={() => setMobileOpen(false)}
              extraContent={sidebarExtra}
              onNavigate={() => setMobileOpen(false)}
            />
          </div>
        </div>
      )}

      {/* Main Viewport */}
      <div className="flex-1 flex flex-col h-screen min-w-0 overflow-hidden">
        {/* Sticky Top Utility Bar */}
        <TopUtilityBar
          session={session}
          onOpenMobileMenu={() => setMobileOpen(true)}
        />

        {/* Scrollable Content Canvas */}
        <main className="flex-1 overflow-y-auto bg-background p-4 sm:p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}

export default PersistentAppShell;
