"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

// ─── Icons ───────────────────────────────────────────────────────────────────

const IconDashboard = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5 shrink-0">
    <rect x="3" y="3" width="7" height="7" rx="1" />
    <rect x="14" y="3" width="7" height="7" rx="1" />
    <rect x="3" y="14" width="7" height="7" rx="1" />
    <rect x="14" y="14" width="7" height="7" rx="1" />
  </svg>
);

const IconStudents = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5 shrink-0">
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
  </svg>
);

const IconSignOut = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5 shrink-0">
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
    <polyline points="16 17 21 12 16 7" />
    <line x1="21" y1="12" x2="9" y2="12" />
  </svg>
);

const IconChevron = ({ collapsed }: { collapsed: boolean }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"
    className={`w-4 h-4 transition-transform duration-300 ${collapsed ? "rotate-180" : ""}`}>
    <polyline points="15 18 9 12 15 6" />
  </svg>
);

const IconMenu = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
    <line x1="3" y1="6" x2="21" y2="6" />
    <line x1="3" y1="12" x2="21" y2="12" />
    <line x1="3" y1="18" x2="21" y2="18" />
  </svg>
);

const IconClose = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

// ─── Types ────────────────────────────────────────────────────────────────────

interface NavItem {
  label: string;
  href: string;
  icon: React.ReactNode;
}

interface AdminUser {
  name: string;
  email: string;
  role: string;
  avatarInitials: string;
}

interface SidebarProps {
  user?: AdminUser;
  onSignOut?: () => void;
  signOutSlot?: React.ReactNode;
}

// ─── Nav Config ───────────────────────────────────────────────────────────────

const NAV_ITEMS: NavItem[] = [
  { label: "Dashboard", href: "/admin/dashboard", icon: <IconDashboard /> },
  { label: "Students",  href: "/admin/students",  icon: <IconStudents />  },
];

const STORAGE_KEY = "admin_sidebar_collapsed";

// ─── Tooltip (for collapsed icon-only mode) ───────────────────────────────────

const Tooltip = ({ label, children }: { label: string; children: React.ReactNode }) => {
  const [visible, setVisible] = useState(false);
  return (
    <div className="relative flex items-center" onMouseEnter={() => setVisible(true)} onMouseLeave={() => setVisible(false)}>
      {children}
      {visible && (
        <div className="absolute left-full ml-3 z-50 px-2.5 py-1.5 rounded-md text-xs font-medium whitespace-nowrap pointer-events-none
          bg-[#e2e8f0] text-[#0f172a] shadow-lg animate-fade-in">
          {label}
          <div className="absolute right-full top-1/2 -translate-y-1/2 border-4 border-transparent border-r-[#e2e8f0]" />
        </div>
      )}
    </div>
  );
};

// ─── Nav Link Item ─────────────────────────────────────────────────────────────

const NavLink = ({ item, collapsed, onClick }: { item: NavItem; collapsed: boolean; onClick?: () => void }) => {
  const pathname = usePathname();
  const isActive = pathname === item.href || pathname.startsWith(item.href + "/");

  const linkContent = (
    <Link
      href={item.href}
      onClick={onClick}
      className={`
        group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium
        transition-all duration-200 select-none
        ${collapsed ? "justify-center" : ""}
        ${isActive
          ? "bg-[#ffb900] text-white shadow-md shadow-[#ffb900]/30"
          : "text-[#94a3b8] hover:bg-[#111c3a] hover:text-[#e2e8f0]"
        }
      `}
    >
      {/* Active indicator bar */}
      {isActive && !collapsed && (
        <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 rounded-r-full bg-white/60" />
      )}

      <span className={isActive ? "text-white" : "text-[#64748b] group-hover:text-[#e2e8f0] transition-colors"}>
        {item.icon}
      </span>

      {!collapsed && (
        <span className="truncate transition-opacity duration-200">{item.label}</span>
      )}
    </Link>
  );

  return collapsed ? (
    <Tooltip label={item.label}>{linkContent}</Tooltip>
  ) : (
    linkContent
  );
};

// ─── Main Sidebar ──────────────────────────────────────────────────────────────

export default function AdminSidebar({
  user = {
    name: "",
    email: "sti.edu.ph",
    role: "Admin",
    avatarInitials: "A",
  },
  onSignOut,
  signOutSlot
}: SidebarProps) {
  // Desktop collapse state — persisted in localStorage
  const [collapsed, setCollapsed] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  // Mobile drawer state
  const [mobileOpen, setMobileOpen] = useState(false);
  const overlayRef = useRef<HTMLDivElement>(null);

  // Read persisted preference after hydration (avoid SSR mismatch)
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored !== null) setCollapsed(stored === "true");
    setHydrated(true);
  }, []);

  const toggleCollapse = () => {
    setCollapsed((prev) => {
      localStorage.setItem(STORAGE_KEY, String(!prev));
      return !prev;
    });
  };

  const handleSignOut = () => {
    onSignOut?.();
  };

  // Prevent body scroll when mobile drawer open
  useEffect(() => {
    document.body.style.overflow = mobileOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [mobileOpen]);

  if (!hydrated) return null; // Avoid layout flash before localStorage is read

  // ── Shared sidebar body ────────────────────────────────────────────────────

  const SidebarBody = ({ isMobile = false }: { isMobile?: boolean }) => (
    <div className="flex flex-col h-full">

      {/* ── Logo + Collapse Button ── */}
      <div className={`flex items-center h-16 px-4 shrink-0 border-b border-[#111c3a]
        ${collapsed && !isMobile ? "justify-center" : "justify-between"}`}>

        {(!collapsed || isMobile) && (
          <div className="flex items-center gap-2.5 overflow-hidden">
            {/* Logo mark */}
            <div className="w-8 h-8 rounded-lg bg-[#ffb900] flex items-center justify-center shrink-0 shadow-md shadow-[#ffb900]/40">
              <svg viewBox="0 0 24 24" fill="white" className="w-4 h-4">
                <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
              </svg>
            </div>
            <div className="leading-tight overflow-hidden">
              <p className="text-[15px] font-bold text-[#f1f5f9] tracking-tight whitespace-nowrap">Admin</p>
              <p className="text-[10px] text-[#475569] font-medium tracking-widest uppercase whitespace-nowrap"></p>
            </div>
          </div>
        )}

        {/* Desktop toggle */}
        {!isMobile && (
          <button
            onClick={toggleCollapse}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            className={`
              p-1.5 rounded-lg text-[#475569] hover:bg-[#111c3a] hover:text-[#94a3b8]
              transition-all duration-200 shrink-0
              ${collapsed ? "" : ""}
            `}
          >
            <IconChevron collapsed={!collapsed} />
          </button>
        )}

        {/* Mobile close */}
        {isMobile && (
          <button onClick={() => setMobileOpen(false)} className="p-1.5 rounded-lg text-[#475569] hover:text-[#94a3b8]">
            <IconClose />
          </button>
        )}
      </div>

      {/* ── Nav Links ── */}
      <nav className="flex-1 overflow-y-auto overflow-x-hidden px-3 py-4 space-y-1">
        {!collapsed || isMobile ? (
          <p className="px-3 mb-2 text-[10px] font-semibold tracking-widest uppercase text-[#334155]">
            Main Menu
          </p>
        ) : (
          <div className="mb-2 h-4" /> // Spacer when collapsed
        )}
        {NAV_ITEMS.map((item) => (
          <NavLink
            key={item.href}
            item={item}
            collapsed={collapsed && !isMobile}
            onClick={isMobile ? () => setMobileOpen(false) : undefined}
          />
        ))}
      </nav>

      {/* ── User Profile + Sign Out ── */}
      <div className="shrink-0 border-t border-[#111c3a] p-3 space-y-1">

        {/* Profile */}
        {collapsed && !isMobile ? (
          <Tooltip label={`${user.name} — ${user.role}`}>
            <div className="w-9 h-9 mx-auto rounded-xl bg-gradient-to-br from-[#ffb900] to-[#ffd04d]
              flex items-center justify-center text-white text-xs font-bold cursor-default shadow-md">
              {user.avatarInitials}
            </div>
          </Tooltip>
        ) : (
          <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-[#111c3a]/60">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#ffb900] to-[#ffd04d]
              flex items-center justify-center text-white text-xs font-bold shrink-0 shadow-md">
              {user.avatarInitials}
            </div>
            <div className="overflow-hidden flex-1 min-w-0">
              <p className="text-sm font-semibold text-[#e2e8f0] truncate">{user.name}</p>
              <p className="text-[11px] text-[#475569] truncate">{user.role}</p>
            </div>
          </div>
        )}

        {/* Sign out */}
        {/* {collapsed && !isMobile ? (
          <Tooltip label="Sign Out">
            <button
              onClick={handleSignOut}
              className="w-full flex justify-center items-center p-2.5 rounded-xl text-[#64748b]
                hover:bg-[#1e293b] hover:text-red-400 transition-all duration-200 group"
              aria-label="Sign Out"
            >
              <IconSignOut />
            </button>
          </Tooltip>
        ) : (
          <button
            onClick={handleSignOut}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-[#64748b] text-sm font-medium
              hover:bg-red-500/10 hover:text-red-400 transition-all duration-200 group"
          >
            <IconSignOut />
            <span>Sign Out</span>
          </button>
        )} */}
        {signOutSlot ?? (
        <button
          onClick={handleSignOut}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-[#64748b] text-sm font-medium
            hover:bg-red-500/10 hover:text-red-400 transition-all duration-200 group"
        >
          <IconSignOut />
          <span>Sign Out</span>
        </button>
      )}
      </div>
    </div>
  );

  return (
    <>
      {/* ── Mobile Hamburger Trigger ─────────────────────────────────────────── */}
      <button
        onClick={() => setMobileOpen(true)}
        aria-label="Open navigation"
        className="lg:hidden fixed top-4 left-4 z-40 p-2.5 rounded-xl bg-[#0f172a] border border-[#111c3a]
          text-[#94a3b8] hover:text-white shadow-lg transition-colors"
      >
        <IconMenu />
      </button>

      {/* ── Mobile Overlay ────────────────────────────────────────────────────── */}
      {mobileOpen && (
        <div
          ref={overlayRef}
          onClick={() => setMobileOpen(false)}
          className="lg:hidden fixed inset-0 z-40 bg-black/60 backdrop-blur-sm transition-opacity"
          aria-hidden="true"
        />
      )}

      {/* ── Mobile Drawer ─────────────────────────────────────────────────────── */}
      <aside
        aria-label="Admin navigation"
        className={`
          lg:hidden fixed inset-y-0 left-0 z-50 w-72
          bg-[#0a1128] border-r border-[#111c3a]
          transform transition-transform duration-300 ease-in-out
          ${mobileOpen ? "translate-x-0" : "-translate-x-full"}
        `}
      >
        <SidebarBody isMobile />
      </aside>

      {/* ── Desktop Sidebar ───────────────────────────────────────────────────── */}
      <aside
        aria-label="Admin navigation"
        className={`
          hidden lg:flex flex-col
          h-screen sticky top-0
          bg-[#0a1128] border-r border-[#111c3a]
          transition-all duration-300 ease-in-out
          ${collapsed ? "w-[72px]" : "w-64"}
        `}
      >
        <SidebarBody />
      </aside>
    </>
  );
}