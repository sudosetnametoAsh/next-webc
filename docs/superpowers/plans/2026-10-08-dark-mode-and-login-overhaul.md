# Universal Dark Mode & Editorial Login Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement universal institutional dark mode across Student, Faculty, and Admin portals using `next-themes`, and rebuild the login page into a responsive editorial split-screen gateway with Microsoft Entra ID authentication.

**Architecture:** A client-side `ThemeProvider` wraps the root layout with `attribute="class"` while `globals.css` defines the calibrated Deep Institutional Navy & Slate palette (`#080E1A` canvas, `#0F172A` cards, `#1E293B` borders). Components adopt adaptive Tailwind `dark:` variants. A reusable `<ThemeToggle />` is integrated into the top utility bar and login view. The login screen is completely rewritten into a split-screen institutional layout.

**Tech Stack:** Next.js 16 (App Router / Turbopack), React 19, Tailwind CSS v4, `next-themes`, Radix UI primitives, Lucide React, Supabase Auth (Azure OAuth).

---

### Task 1: Theme Infrastructure & Deep Institutional Navy Tokens

**Files:**
- Create: `src/lib/providers/theme-provider.tsx`
- Modify: `src/app/layout.tsx:1-31`
- Modify: `src/app/globals.css:99-132`

- [ ] **Step 1: Create client ThemeProvider component**

```tsx
// src/lib/providers/theme-provider.tsx
"use client";

import * as React from "react";
import { ThemeProvider as NextThemesProvider } from "next-themes";

export default function ThemeProvider({
  children,
  ...props
}: React.ComponentProps<typeof NextThemesProvider>) {
  return <NextThemesProvider {...props}>{children}</NextThemesProvider>;
}
```

- [ ] **Step 2: Update `src/app/layout.tsx` to include `ThemeProvider` and `suppressHydrationWarning`**

```tsx
// src/app/layout.tsx
import QueryProvider from "@/lib/providers/query-provider";
import MSALProvider from "@/lib/providers/msal-provider";
import ThemeProvider from "@/lib/providers/theme-provider";
import "./globals.css";
import { Geist } from "next/font/google";
import { Toaster } from "sonner";

export const metadata = {
  title: "STI College Clearance Portal",
  description: "Official Institutional Clearance & Credential Verification System",
};

const geist = Geist({
  subsets: ["latin"],
});

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={geist.className} suppressHydrationWarning>
      <body className="antialiased min-h-screen bg-background text-foreground transition-colors duration-200">
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <MSALProvider>
            <QueryProvider>{children}</QueryProvider>
            <Toaster />
          </MSALProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
```

- [ ] **Step 3: Update `.dark` tokens in `src/app/globals.css`**

Replace lines 99-131 of `src/app/globals.css` with:
```css
.dark {
  --background: #080E1A;
  --foreground: #F8FAFC;
  --card: #0F172A;
  --card-foreground: #F8FAFC;
  --popover: #0F172A;
  --popover-foreground: #F8FAFC;
  --primary: #F59E0B;
  --primary-foreground: #080E1A;
  --secondary: #162032;
  --secondary-foreground: #F8FAFC;
  --muted: #162032;
  --muted-foreground: #94A3B8;
  --accent: #F59E0B;
  --accent-foreground: #080E1A;
  --destructive: #EF4444;
  --border: #1E293B;
  --input: #1E293B;
  --ring: #F59E0B;
  --chart-1: #38BDF8;
  --chart-2: #10B981;
  --chart-3: #F59E0B;
  --chart-4: #818CF8;
  --chart-5: #F43F5E;
  --sidebar: #080E1A;
  --sidebar-foreground: #F8FAFC;
  --sidebar-primary: #F59E0B;
  --sidebar-primary-foreground: #080E1A;
  --sidebar-accent: rgba(255, 255, 255, 0.05);
  --sidebar-accent-foreground: #FFFFFF;
  --sidebar-border: #1E293B;
  --sidebar-ring: #F59E0B;
}
```

- [ ] **Step 4: Verify typecheck passes**

Run: `npx tsc --noEmit`
Expected: 0 errors.

- [ ] **Step 5: Commit changes**

```bash
git add src/lib/providers/theme-provider.tsx src/app/layout.tsx src/app/globals.css
git commit -m "feat(theme): add next-themes provider and deep institutional navy tokens"
```

---

### Task 2: Accessible Theme Toggle Component & Shell Integration

**Files:**
- Create: `src/components/shell/theme-toggle.tsx`
- Modify: `src/components/shell/top-utility-bar.tsx:1-50, 150-263`

- [ ] **Step 1: Create `src/components/shell/theme-toggle.tsx`**

```tsx
"use client";

import * as React from "react";
import { Moon, Sun, Monitor } from "lucide-react";
import { useTheme } from "next-themes";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export default function ThemeToggle({ className }: { className?: string }) {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <button
        aria-label="Toggle theme"
        className={`relative inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200/80 bg-white text-slate-700 shadow-2xs dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 ${className || ""}`}
      >
        <Sun className="h-4 w-4" />
      </button>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          aria-label="Select theme"
          className={`relative inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200/80 bg-white text-slate-700 shadow-2xs transition hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-[#0B192C]/10 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:focus:ring-amber-400/20 cursor-pointer ${className || ""}`}
        >
          <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0 text-amber-500" />
          <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100 text-sky-400" />
          <span className="sr-only">Toggle theme</span>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-36 rounded-xl border border-slate-200/90 bg-white p-1 text-xs shadow-md dark:border-slate-800 dark:bg-slate-900">
        <DropdownMenuItem
          onClick={() => setTheme("light")}
          className={`flex items-center gap-2 rounded-lg px-2.5 py-1.5 font-semibold cursor-pointer ${theme === "light" ? "bg-slate-100 text-slate-900 dark:bg-slate-800 dark:text-white" : "text-slate-600 dark:text-slate-400"}`}
        >
          <Sun className="h-3.5 w-3.5 text-amber-500" />
          <span>Light</span>
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => setTheme("dark")}
          className={`flex items-center gap-2 rounded-lg px-2.5 py-1.5 font-semibold cursor-pointer ${theme === "dark" ? "bg-slate-100 text-slate-900 dark:bg-slate-800 dark:text-white" : "text-slate-600 dark:text-slate-400"}`}
        >
          <Moon className="h-3.5 w-3.5 text-sky-400" />
          <span>Dark</span>
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => setTheme("system")}
          className={`flex items-center gap-2 rounded-lg px-2.5 py-1.5 font-semibold cursor-pointer ${theme === "system" ? "bg-slate-100 text-slate-900 dark:bg-slate-800 dark:text-white" : "text-slate-600 dark:text-slate-400"}`}
        >
          <Monitor className="h-3.5 w-3.5 text-slate-500" />
          <span>System</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
```

- [ ] **Step 2: Add `ThemeToggle` to `TopUtilityBar` in `src/components/shell/top-utility-bar.tsx`**

Import `ThemeToggle` and insert it immediately before the notifications popover in the top utility header:
```tsx
import ThemeToggle from "./theme-toggle";
// In TopUtilityBar JSX, alongside notifications:
<ThemeToggle />
```

- [ ] **Step 3: Update `top-utility-bar.tsx` surface styles for dark mode**
Add `dark:bg-slate-900/90 dark:border-slate-800 dark:text-slate-100` to the header container and popovers.

- [ ] **Step 4: Verify typecheck passes**

Run: `npx tsc --noEmit`
Expected: 0 errors.

- [ ] **Step 5: Commit changes**

```bash
git add src/components/shell/theme-toggle.tsx src/components/shell/top-utility-bar.tsx
git commit -m "feat(shell): integrate ThemeToggle in top utility bar"
```

---

### Task 3: Student Portal Dark Mode Coverage

**Files:**
- Modify: `src/components/student/clearance-seal.tsx:50-250`
- Modify: `src/components/student/clearance-item.tsx:50-200`
- Modify: `src/components/clearance/tasks/tasks-page.tsx:80-210`
- Modify: `src/components/clearance/office-hours/office-hours.tsx:70-155`
- Modify: `src/app/(pages)/student/page.tsx:145-210`

- [ ] **Step 1: Enhance `clearance-seal.tsx` with dark certificate styling**
Add dark surface variants:
- Certificate container: `dark:bg-slate-900/90 dark:border-slate-800 dark:shadow-2xs`
- Seal ring: `dark:border-amber-500/40 dark:bg-amber-950/20`
- Metric blocks: `dark:bg-slate-800/60 dark:border-slate-700/60 dark:text-slate-100`
- Pipeline cards: `dark:bg-slate-800/40 dark:border-slate-700/60`
- Verified emerald pills: `dark:bg-emerald-950/40 dark:border-emerald-800/80 dark:text-emerald-300`

- [ ] **Step 2: Enhance `clearance-item.tsx` with dark department cards**
Add dark surface variants:
- Department card: `dark:bg-slate-900/80 dark:border-slate-800`
- Sub-items: `dark:bg-slate-800/50 dark:border-slate-700/50 dark:text-slate-200`
- Action buttons: `dark:bg-[#1A2E46] dark:hover:bg-[#253D5C] dark:text-white`
- Reviewer comments: `dark:bg-rose-950/40 dark:border-rose-900/60 dark:text-rose-200`

- [ ] **Step 3: Enhance `tasks-page.tsx` with dark requirement cards**
Add dark surface variants:
- Task card: `dark:bg-slate-900/80 dark:border-slate-800`
- In-person note: `dark:bg-slate-800/60 dark:border-slate-700/60 dark:text-slate-300`
- Submit document button: `dark:bg-amber-500 dark:hover:bg-amber-400 dark:text-slate-950`
- View document link: `dark:bg-slate-800 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-700`

- [ ] **Step 4: Enhance `office-hours.tsx` with dark schedule list**
Add dark surface variants:
- Container: `dark:bg-slate-900/90 dark:border-slate-800`
- Open Now card: `dark:bg-emerald-950/30 dark:border-emerald-800/60 dark:text-emerald-200`
- Closed card: `dark:bg-slate-900/50 dark:border-slate-800/80 dark:text-slate-400`
- Department abbreviation badge: `dark:border-slate-700 dark:bg-[#0B192C] dark:text-amber-400`

- [ ] **Step 5: Enhance student tab navigation in `src/app/(pages)/student/page.tsx`**
Update segmented tab container to `dark:bg-slate-900/90 dark:border-slate-800` and active tab pill to `dark:bg-slate-800 dark:text-white dark:ring-slate-700`.

- [ ] **Step 6: Verify typecheck passes**

Run: `npx tsc --noEmit`
Expected: 0 errors.

- [ ] **Step 7: Commit changes**

```bash
git add src/components/student/clearance-seal.tsx src/components/student/clearance-item.tsx src/components/clearance/tasks/tasks-page.tsx src/components/clearance/office-hours/office-hours.tsx src/app/\(pages\)/student/page.tsx
git commit -m "feat(student): add dark mode coverage to student clearance portal"
```

---

### Task 4: Faculty / Department Workspace Dark Mode Coverage

**Files:**
- Modify: `src/components/department/dashboard/dashboard-client.tsx:1-275`
- Modify: `src/components/department/dashboard/priority-sign-queue.tsx:1-185`
- Modify: `src/components/department/clients/task-view.tsx:280-550`

- [ ] **Step 1: Enhance `dashboard-client.tsx` with dark command ribbon and activity feed**
Add dark surface variants:
- Command Strip: `dark:bg-slate-900/90 dark:border-slate-800`
- Metric KPI cards: `dark:bg-slate-800/60 dark:border-slate-700/60 dark:text-slate-100`
- Progress gauge tracks: `dark:bg-slate-700/60`
- Activity feed: `dark:bg-slate-900/70 dark:border-slate-800 dark:divide-slate-800`

- [ ] **Step 2: Enhance `priority-sign-queue.tsx` with dark priority queue**
Add dark surface variants:
- Container: `dark:bg-slate-900/90 dark:border-amber-900/60`
- Header banner: `dark:bg-amber-950/30 dark:border-amber-900/40`
- Student row: `dark:hover:bg-slate-800/60 dark:divide-slate-800`
- Sign button: `dark:bg-amber-500 dark:hover:bg-amber-400 dark:text-slate-950`

- [ ] **Step 3: Enhance `task-view.tsx` with dark drawer review**
Add dark surface variants:
- Header and container: `dark:bg-slate-900 dark:border-slate-800 dark:text-slate-100`
- Student profile card: `dark:bg-slate-800/60 dark:border-slate-700/60`
- Department status cards: `dark:bg-slate-800/40 dark:border-slate-700/50`
- Required task items: `dark:bg-slate-850 dark:border-slate-800`
- Review File button: `dark:bg-amber-500 dark:hover:bg-amber-400 dark:text-slate-950`
- In-person Approve button: `dark:bg-emerald-600 dark:hover:bg-emerald-700 dark:text-white`

- [ ] **Step 4: Verify typecheck passes**

Run: `npx tsc --noEmit`
Expected: 0 errors.

- [ ] **Step 5: Commit changes**

```bash
git add src/components/department/dashboard/dashboard-client.tsx src/components/department/dashboard/priority-sign-queue.tsx src/components/department/clients/task-view.tsx
git commit -m "feat(department): add dark mode coverage to faculty workspace"
```

---

### Task 5: Admin Workspace Dark Mode Coverage

**Files:**
- Modify: `src/components/admin/admin-stats.tsx:20-120`
- Modify: `src/app/(pages)/admin/dashboard/page.tsx:50-230`
- Modify: `src/app/(pages)/admin/students/page.tsx:250-510`
- Modify: `src/components/admin/hierarchy-manager.tsx:105-228`

- [ ] **Step 1: Enhance `admin-stats.tsx` with dark KPI cards**
Add dark surface variants:
- Card containers: `dark:bg-slate-900/90 dark:border-slate-800 dark:text-slate-100`
- Cleared card: `dark:bg-emerald-950/20 dark:border-emerald-800/50 dark:text-emerald-300`
- Hold card: `dark:bg-amber-950/20 dark:border-amber-800/50 dark:text-amber-300`

- [ ] **Step 2: Enhance `admin/dashboard/page.tsx` with dark analytics layout**
Add dark surface variants:
- Analytics matrix cards: `dark:bg-slate-900/90 dark:border-slate-800`
- Department bottleneck bars: `dark:bg-slate-800/60 dark:border-slate-700/60`
- Degree program completion cards: `dark:bg-slate-800/40 dark:border-slate-700/50`

- [ ] **Step 3: Enhance `admin/students/page.tsx` with dark student registry**
Add dark surface variants:
- Registry container: `dark:bg-slate-900/90 dark:border-slate-800`
- Filter strip: `dark:bg-slate-850 dark:border-slate-800`
- Search input: `dark:bg-slate-800 dark:border-slate-700 dark:text-slate-100 dark:placeholder:text-slate-500`
- Course filter pills: `dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700`
- Table header: `dark:bg-slate-800/70 dark:text-slate-400 dark:border-slate-800`
- Table rows: `dark:hover:bg-slate-800/40 dark:divide-slate-800`
- Mobile card view: `dark:bg-slate-900 dark:divide-slate-800`

- [ ] **Step 4: Enhance `hierarchy-manager.tsx` with dark sequence view**
Add dark surface variants:
- Card: `dark:bg-slate-900/90 dark:border-slate-800`
- Sequence flow steps: `dark:bg-slate-800/60 dark:border-slate-700/60 dark:text-slate-100`

- [ ] **Step 5: Verify typecheck passes**

Run: `npx tsc --noEmit`
Expected: 0 errors.

- [ ] **Step 6: Commit changes**

```bash
git add src/components/admin/admin-stats.tsx src/app/\(pages\)/admin/dashboard/page.tsx src/app/\(pages\)/admin/students/page.tsx src/components/admin/hierarchy-manager.tsx
git commit -m "feat(admin): add dark mode coverage to admin workspace"
```

---

### Task 6: Redesigned Editorial Split-Screen Login Page

**Files:**
- Modify: `src/components/auth/azure-sign-in-button.tsx:1-47`
- Modify: `src/components/landing.tsx:1-59`
- Delete / Deprecate: `src/styles/sti-login.module.css`

- [ ] **Step 1: Rebuild `azure-sign-in-button.tsx` with Entra ID branding and pure Tailwind**

```tsx
"use client";

import React, { useState } from "react";
import { createClient } from "@/lib/db/supabase-client";
import { Loader2 } from "lucide-react";

export default function AzureLoginButton() {
  const [isLoading, setIsLoading] = useState(false);

  const handleAzureLogin = async () => {
    try {
      setIsLoading(true);
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "azure",
        options: {
          scopes: "email profile",
          redirectTo: `${window.location.origin}/api/auth/callback`,
        },
      });

      if (error) {
        console.error("Error logging in:", error.message);
        setIsLoading(false);
      }
    } catch (err) {
      console.error("Unexpected error:", err);
      setIsLoading(false);
    }
  };

  return (
    <button
      onClick={handleAzureLogin}
      disabled={isLoading}
      aria-label="Continue with Microsoft Entra ID"
      className="group relative flex w-full items-center justify-center gap-3 rounded-xl border border-slate-300 bg-white px-5 py-3.5 text-sm font-bold text-slate-800 shadow-sm transition-all duration-150 hover:bg-slate-50 hover:border-slate-400 hover:shadow active:scale-[0.99] focus:outline-none focus:ring-2 focus:ring-[#0B192C]/20 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-750 dark:hover:border-slate-600 dark:focus:ring-amber-400/20 disabled:opacity-60 cursor-pointer"
    >
      {isLoading ? (
        <Loader2 className="h-5 w-5 animate-spin text-slate-600 dark:text-slate-300" />
      ) : (
        <svg
          width="18"
          height="18"
          viewBox="0 0 21 21"
          xmlns="http://www.w3.org/2000/svg"
          className="shrink-0"
        >
          <rect x="1" y="1" width="9" height="9" fill="#F25022" />
          <rect x="11" y="1" width="9" height="9" fill="#7FBA00" />
          <rect x="1" y="11" width="9" height="9" fill="#00A4EF" />
          <rect x="11" y="11" width="9" height="9" fill="#FFB900" />
        </svg>
      )}
      <span className="tracking-tight">
        {isLoading ? "Authenticating..." : "Continue with Microsoft Entra ID"}
      </span>
    </button>
  );
}
```

- [ ] **Step 2: Rebuild `src/components/landing.tsx` into responsive editorial split screen**

```tsx
"use client";

import React from "react";
import Image from "next/image";
import AzureLoginButton from "./auth/azure-sign-in-button";
import ThemeToggle from "./shell/theme-toggle";
import { ShieldCheck, GitFork, Activity, CheckCircle2, Lock } from "lucide-react";

export default function Landing() {
  return (
    <main className="relative flex min-h-screen w-full flex-col lg:flex-row bg-background text-foreground transition-colors duration-200">
      
      {/* ── Left Editorial Showcase (Desktop) ── */}
      <section className="relative hidden lg:flex lg:w-7/12 flex-col justify-between overflow-hidden bg-[#071322] p-12 xl:p-16 text-white border-r border-slate-800/80">
        {/* Subtle Architectural Blueprint Grid */}
        <div 
          className="absolute inset-0 opacity-[0.04] pointer-events-none"
          style={{
            backgroundImage: `radial-gradient(circle at 1px 1px, #ffffff 1px, transparent 0)`,
            backgroundSize: '24px 24px',
          }}
        />
        {/* Ambient Gold Radial Flare */}
        <div className="absolute -top-32 -left-32 h-96 w-96 rounded-full bg-amber-500/10 blur-3xl pointer-events-none" />

        {/* Top Branding Strip */}
        <div className="relative z-10 flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/10 backdrop-blur-md p-1.5 border border-white/15 shadow-sm">
            <Image
              src="/stilogo.png"
              alt="STI Crest"
              width={36}
              height={36}
              className="object-contain"
              priority
            />
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-amber-400">
              STI College
            </p>
            <h2 className="text-sm font-semibold tracking-tight text-slate-200">
              Clearance & Credential Gateway
            </h2>
          </div>
        </div>

        {/* Center Narrative */}
        <div className="relative z-10 my-auto max-w-xl py-12">
          <div className="inline-flex items-center gap-2 rounded-full border border-amber-400/30 bg-amber-400/10 px-3 py-1 text-xs font-bold text-amber-300 mb-6">
            <ShieldCheck className="h-3.5 w-3.5 text-amber-400" />
            <span>Official Institutional Protocol</span>
          </div>

          <h1 className="text-3xl xl:text-4xl font-extrabold tracking-tight text-white leading-tight">
            Centralized Clearance & Credential Verification Protocol
          </h1>

          <p className="mt-4 text-base text-slate-300 leading-relaxed">
            A unified, prerequisite-enforced digital signing ecosystem connecting students, academic departments, and registrars for end-of-term graduation and enrollment clearance.
          </p>

          {/* Institutional Pillars */}
          <div className="mt-10 grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="rounded-xl border border-white/10 bg-white/[0.04] p-4 backdrop-blur-xs">
              <GitFork className="h-5 w-5 text-amber-400 mb-2" />
              <h3 className="text-xs font-bold text-white uppercase tracking-wider">Prerequisite Order</h3>
              <p className="mt-1 text-xs text-slate-300 leading-relaxed">Hierarchical unlocking: Cashier to Department to Registrar.</p>
            </div>

            <div className="rounded-xl border border-white/10 bg-white/[0.04] p-4 backdrop-blur-xs">
              <Activity className="h-5 w-5 text-emerald-400 mb-2" />
              <h3 className="text-xs font-bold text-white uppercase tracking-wider">Live Audit</h3>
              <p className="mt-1 text-xs text-slate-300 leading-relaxed">Instant status tracking, milestone certificates, and remarks.</p>
            </div>

            <div className="rounded-xl border border-white/10 bg-white/[0.04] p-4 backdrop-blur-xs">
              <Lock className="h-5 w-5 text-sky-400 mb-2" />
              <h3 className="text-xs font-bold text-white uppercase tracking-wider">Campus SSO</h3>
              <p className="mt-1 text-xs text-slate-300 leading-relaxed">Zero-trust single sign-on via Microsoft Entra ID.</p>
            </div>
          </div>
        </div>

        {/* Bottom Status Ticker */}
        <div className="relative z-10 flex items-center justify-between text-xs text-slate-400 border-t border-white/10 pt-6">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="font-semibold text-slate-300">Academic Year 2025–2026 Clearance Active</span>
          </div>
          <span className="font-mono text-[11px] text-slate-400">Build v2.4</span>
        </div>
      </section>

      {/* ── Right Authentication Column (All Viewports) ── */}
      <section className="relative flex flex-1 flex-col justify-between p-6 sm:p-12 lg:p-16">
        {/* Top Action Bar with Theme Toggle */}
        <div className="flex items-center justify-between w-full">
          {/* Mobile Top Brand */}
          <div className="flex lg:hidden items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#071322] p-1 border border-slate-700">
              <Image
                src="/stilogo.png"
                alt="STI Crest"
                width={28}
                height={28}
                className="object-contain"
              />
            </div>
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">
                STI College
              </p>
              <h2 className="text-xs font-semibold text-slate-900 dark:text-slate-100">
                Clearance Portal
              </h2>
            </div>
          </div>

          <div className="ml-auto">
            <ThemeToggle />
          </div>
        </div>

        {/* Center Auth Card */}
        <div className="mx-auto w-full max-w-sm py-12 my-auto">
          <div className="rounded-2xl border border-slate-200/90 bg-white p-6 sm:p-8 shadow-sm dark:border-slate-800 dark:bg-slate-900/90 transition-all">
            <div className="flex items-center justify-center mb-6">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-50 border border-slate-200/80 p-2 shadow-2xs dark:bg-slate-800 dark:border-slate-700">
                <Image
                  src="/stilogo.png"
                  alt="STI Crest"
                  width={48}
                  height={48}
                  className="object-contain"
                  priority
                />
              </div>
            </div>

            <div className="text-center mb-8">
              <h1 className="text-xl font-black tracking-tight text-slate-900 dark:text-slate-100">
                Portal Authentication
              </h1>
              <p className="mt-1.5 text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                Sign in with your official STI Office 365 academic or faculty account to proceed.
              </p>
            </div>

            {/* Microsoft Entra ID Action */}
            <AzureLoginButton />

            <div className="mt-6 rounded-xl bg-slate-50 border border-slate-200/70 p-3 text-[11px] text-slate-500 leading-relaxed dark:bg-slate-800/50 dark:border-slate-700/60 dark:text-slate-400">
              <div className="flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                <span>Access is restricted to authorized STI students, faculty members, and clearance signatories.</span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center text-[11px] text-slate-400 dark:text-slate-500">
          <p>Protected by STI Information Systems Security • © WebC, Inc. All rights reserved.</p>
        </div>
      </section>
    </main>
  );
}
```

- [ ] **Step 3: Remove legacy CSS module file `src/styles/sti-login.module.css`**

Run: `rm src/styles/sti-login.module.css`

- [ ] **Step 4: Verify typecheck passes**

Run: `npx tsc --noEmit`
Expected: 0 errors.

- [ ] **Step 5: Commit changes**

```bash
git add src/components/auth/azure-sign-in-button.tsx src/components/landing.tsx
git rm src/styles/sti-login.module.css
git commit -m "feat(auth): redesign login page to editorial split-screen with Microsoft Entra ID button"
```

---

### Task 7: System Verification & Impeccable Audit

**Files:**
- Audit entire codebase with `./.agents/skills/impeccable/scripts/impeccable detect`
- Build verification: `npm run build`

- [ ] **Step 1: Run Impeccable anti-pattern audit**

Run: `echo Y | ./.agents/skills/impeccable/scripts/impeccable detect`
Expected: 0 anti-patterns detected.

- [ ] **Step 2: Run TypeScript type checker**

Run: `npx tsc --noEmit`
Expected: 0 errors.

- [ ] **Step 3: Run production Next.js build**

Run: `npm run build`
Expected: Exit code 0, all static and dynamic pages compiled successfully.

- [ ] **Step 4: Final commit**

```bash
git commit --allow-empty -m "chore: verify universal dark mode and editorial login overhaul"
```
