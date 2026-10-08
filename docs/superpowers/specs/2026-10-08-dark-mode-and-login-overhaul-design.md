# System Design: Universal Dark Mode & Editorial Login Redesign

## 1. Executive Summary
This specification defines the architecture, tokens, component enhancements, and responsive visual direction for:
1. **Universal Dark Mode** across all three institutional portals (Student Clearance Portal, Faculty/Department Workspace, and Admin Workspace).
2. **Editorial Split-Screen Redesign** for the main login page, replacing legacy CSS module blobs with a high-craft institutional authentication experience using official Microsoft Entra ID credentials.

---

## 2. Design Foundations & Color Tokens

### 2.1 Theme Infrastructure
- **Provider**: `next-themes` (`ThemeProvider` configured with `attribute="class"`, `defaultTheme="system"`, `enableSystem`).
- **Hydration Guard**: Root `<html>` element marked with `suppressHydrationWarning`.
- **Global Theme Selector**: `@custom-variant dark (&:is(.dark *))` in Tailwind CSS v4.

### 2.2 Deep Institutional Navy & Slate Palette (`globals.css`)
| Token | Light Mode | Dark Mode (`.dark`) | Semantic Role |
| :--- | :--- | :--- | :--- |
| `--background` | `#F8FAFC` (Alabaster) | `#080E1A` (Midnight Slate) | Canvas backdrop |
| `--foreground` | `#0B192C` (Deep Ink) | `#F8FAFC` (Alabaster) | Primary typography |
| `--card` | `#FFFFFF` (Pure White) | `#0F172A` (Elevated Deep Navy) | Elevated surface container |
| `--card-foreground` | `#0B192C` (Deep Ink) | `#F8FAFC` (Alabaster) | Surface typography |
| `--border` | `#E2E8F0` (Slate-200) | `#1E293B` (Slate-800) | Structural 1px separation |
| `--muted` | `#F1F5F9` (Slate-100) | `#162032` (Subtle Dark Slate) | Secondary fills |
| `--muted-foreground` | `#64748B` (Slate-500) | `#94A3B8` (Slate-400) | Secondary metadata / captions |
| `--accent` | `#F59E0B` (STI Gold) | `#F59E0B` (STI Gold) | Brand highlight & focus |
| `--accent-foreground` | `#0B192C` | `#080E1A` | Contrast text on gold |

### 2.3 Semantic Indicators in Dark Mode
- **Cleared / Signed**: `dark:bg-emerald-950/40 dark:border-emerald-800/60 dark:text-emerald-300`
- **Pending / Prerequisite**: `dark:bg-amber-950/40 dark:border-amber-800/60 dark:text-amber-300`
- **Action Required / Rejected**: `dark:bg-rose-950/40 dark:border-rose-800/60 dark:text-rose-300`
- **Prerequisite Locked**: `dark:bg-slate-900/60 dark:border-slate-800 dark:text-slate-400`

---

## 3. Component Architecture & Dark Mode Adaptations

### 3.1 Theme Toggle Component (`src/components/shell/theme-toggle.tsx`)
- **Features**:
  - Accessible icon button with animated transitions between `Sun`, `Moon`, and `Monitor` icons.
  - Dropdown menu (Light, Dark, System) with active state indicators.
  - Smooth transitions avoiding layout shift.
- **Locations**:
  1. Primary: `TopUtilityBar` (`src/components/shell/top-utility-bar.tsx`) beside notifications and user profile.
  2. Auxiliary: Top-right corner of the Login page (`src/components/landing.tsx`).

### 3.2 Student Portal Dark Enhancements
- **Clearance Seal & Certificate (`clearance-seal.tsx`)**:
  - Dark certificate container: `dark:bg-slate-900/90 dark:border-slate-800`.
  - Gold seal ring with subtle ambient illumination.
  - High-contrast milestone pipeline: locked, active, and completed tiers.
- **Requirement Cards (`clearance-item.tsx` & `tasks-page.tsx`)**:
  - Container: `dark:bg-slate-900/70 dark:border-slate-800`.
  - Submission view/upload buttons: `#0B192C` in light, `#1E293B hover:bg-[#2A3B52]` in dark.
  - Rejection / Reviewer comments: `dark:bg-rose-950/40 dark:border-rose-900/60 dark:text-rose-200`.
- **Department Operating Hours (`office-hours.tsx`)**:
  - Container: `dark:bg-slate-900/90 dark:border-slate-800`.
  - Active "Open Now" cards: `dark:bg-emerald-950/30 dark:border-emerald-800/60`.
  - Time text: Tabular numerals with `dark:text-slate-200`.

### 3.3 Faculty / Department Portal Dark Enhancements
- **Command Strip & Queue (`dashboard-client.tsx`, `priority-sign-queue.tsx`)**:
  - Command Ribbon: Deep slate surfaces with illuminated progress bar tracks (`dark:bg-slate-800`).
  - Priority Quick-Sign Card: `dark:bg-slate-900/90 dark:border-amber-900/50`.
  - Activity Feed: `dark:bg-slate-900/60 dark:divide-slate-800`.
- **Client Task Inspector Drawer (`task-view.tsx`)**:
  - Drawer canvas: `dark:bg-slate-900 dark:border-slate-800`.
  - In-person direct approval controls: `dark:bg-emerald-600 dark:hover:bg-emerald-700`.

### 3.4 Administrative Portal Dark Enhancements
- **Executive KPI Strip (`admin-stats.tsx`)**:
  - 4-card metric strip with `dark:bg-slate-900/80 dark:border-slate-800`.
- **Analytics Matrix (`src/app/(pages)/admin/dashboard/page.tsx`)**:
  - Course completion cards and department bottleneck indicators with dark backgrounds and accessible bar colors.
- **Student Clearance Registry (`src/app/(pages)/admin/students/page.tsx`)**:
  - Registry Table: `dark:bg-slate-900/90 dark:border-slate-800`.
  - Sticky Header: `dark:bg-slate-800/60 dark:text-slate-400`.
  - Search Input: `dark:bg-slate-800 dark:border-slate-700 dark:text-slate-100 focus:dark:border-amber-500`.
  - Mobile Card Stack: Responsive dark card items with clear pending department tags.

---

## 4. Redesigned Editorial Split-Screen Login Page

### 4.1 Architecture & Cleanup
- Deprecate and remove dependencies on `src/styles/sti-login.module.css`.
- Transform `src/components/landing.tsx` and `src/components/auth/azure-sign-in-button.tsx` into responsive Tailwind components.

### 4.2 Left Showcase Column (Desktop `lg:w-7/12`)
- **Backdrop**: Deep institutional navy (`#071322`) with subtle SVG architectural grid pattern and restrained radial gold glow.
- **Top Brand**: Official STI crest logo + *"STI College • Clearance Verification Gateway"*.
- **Hero Statement**:
  - Headline: *"Centralized Clearance & Credential Protocol"*
  - Subtitle: *"Official institutional verification platform ensuring prerequisite fulfillment, cross-department clearance sign-off, and automated credential endorsement."*
- **Feature Pillars (3 Micro-Cards)**:
  1. *Sequential Prerequisite Engine*: Automated prerequisite validation (Cashier &rarr; Academic Offices &rarr; Registrar).
  2. *Live Verification Seal*: Real-time audit trail and verified clearance seal.
  3. *Enterprise Microsoft Entra ID*: Secure single sign-on authentication restricted to official campus domains.
- **Footer Ticker**: *"Academic Year 2025–2026 • Clearance Cycle Active"*.

### 4.3 Right Authentication Column (`lg:w-5/12`, Full-width Mobile)
- **Canvas**: Adaptive `bg-slate-50 dark:bg-[#080E1A]`.
- **Top Utility**: Top-right corner includes `<ThemeToggle />` for instant visitor preview.
- **Authentication Card**:
  - Elevated card with subtle border (`border-slate-200/90 dark:border-slate-800`).
  - STI emblem with gold accent ring.
  - Header: *"Sign in to Portal"* + *"Access your clearance status using your official institution account."*
  - **Microsoft Entra ID Sign-In Button**:
    - Official 4-color Microsoft logo mark (SVG).
    - Label: **"Continue with Microsoft Entra ID"**.
    - Tactile interactive feedback: hover shadow, active scale `0.99`, focus-visible ring.
  - Security Notice: *"Access restricted to authorized STI students, faculty, and administrative staff."*
  - Institutional Footer: *"Protected by STI Information Systems Security • © WebC"*.

### 4.4 Mobile & Tablet Responsiveness
- Viewports `< 1024px`:
  - Showcase collapses into a compact top identity bar with logo and title.
  - Authentication card centers with comfortable touch padding and minimum 48px button height.
  - No horizontal scrolling, high-contrast text on all screens.

---

## 5. Verification & Quality Gates
1. **Zero Anti-Patterns**: Run `./.agents/skills/impeccable/scripts/impeccable detect` to verify 0 contrast or styling violations.
2. **Type Safety**: `npx tsc --noEmit` must pass with 0 errors.
3. **Build Validation**: `npm run build` must succeed with all routes compiled cleanly.
4. **Theme Persistence**: Switching theme between Light, Dark, and System persists across reloads via `localStorage` and updates document root without flash.
