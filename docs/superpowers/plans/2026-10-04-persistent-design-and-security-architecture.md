# Persistent Multi-Role Design System & Security Hardening Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Unify the application UI into a single Persistent App Shell with the Collegiate Modernist design language across Admin, Faculty, and Student roles, while establishing a 3-Tier Defense-in-Depth Security System (Edge Middleware, Server Component Layout Guards, and API Route RBAC).

**Architecture:**
- **Design System:** Design tokens configured in Tailwind v4 (`globals.css`), shared `<PersistentAppShell>` component used by Admin, Faculty, and Student layouts with role badges, collapsible sidebar, top utility bar, and the signature "Clearance Seal".
- **Security:** Replace inactive `src/proxy.ts` with standard Next.js `src/middleware.ts` verifying signed `session_token` JWT cookies; align `getSession()` in `src/lib/auth/get-session.ts` with the JWT payload; add server-side layout guards; add `requireAuth()` helper to API routes; and consolidate `/clearance` into `/student`.

**Tech Stack:** Next.js 15 (App Router), TypeScript, TailwindCSS v4, `jose` JWT, Supabase PostgreSQL, Lucide React, Radix UI.

---

### Task 1: Design Tokens & Collegiate Modernist Theme Configuration

**Files:**
- Modify: `src/app/globals.css:1-85`

- [ ] **Step 1: Update `src/app/globals.css` with Collegiate Modernist color tokens**

Add CSS custom properties and theme tokens:
- Primary Navy: `#0B192C`
- STI Gold: `#F59E0B`
- Alabaster Canvas: `#F8FAFC`
- Verified Emerald: `#10B981`
- Alert Crimson: `#EF4444`
- Slate Borders: `#E2E8F0`

```css
@theme inline {
  --color-institutional-navy: #0B192C;
  --color-sti-gold: #F59E0B;
  --color-sti-gold-dark: #D97706;
  --color-alabaster: #F8FAFC;
  --color-verified-emerald: #10B981;
  --color-alert-crimson: #EF4444;
  --color-info-indigo: #6366F1;
  /* existing radius and tokens ... */
}

:root {
  --background: oklch(0.985 0.005 240);
  --foreground: oklch(0.15 0.03 240);
  --card: oklch(1 0 0);
  --card-foreground: oklch(0.15 0.03 240);
  --primary: oklch(0.20 0.05 250);
  --primary-foreground: oklch(0.985 0 0);
  --accent: oklch(0.75 0.16 75);
  --accent-foreground: oklch(0.15 0.03 240);
  --border: oklch(0.92 0.01 240);
}
```

- [ ] **Step 2: Verify CSS builds without syntax errors**

Run: `npm run build` or `npx tsc --noEmit`
Expected: Passes without CSS parsing errors.

- [ ] **Step 3: Commit design token changes**

```bash
git add src/app/globals.css
git commit -m "style: Configure Collegiate Modernist design tokens in globals.css"
```

---

### Task 2: Core Session & Cryptographic Token Utilities

**Files:**
- Create: `src/lib/auth/session-token.ts`
- Modify: `src/app/api/session/route.ts:50-85`
- Modify: `src/lib/auth/get-session.ts:1-62`

- [ ] **Step 1: Create `src/lib/auth/session-token.ts`**

Define typed session claims and sign/verify functions using `jose`:

```typescript
import { jwtVerify, SignJWT } from "jose";

export type Role = "Admin" | "Staff" | "Department" | "Student";

export interface AppSession {
  user_id: string;
  user_email: string;
  user_name: string;
  role: Role;
  department?: string;
}

const SESSION_SECRET = new TextEncoder().encode(
  process.env.SESSION_SECRET || "webc-clearance-system-super-secure-session-secret-key-32b"
);

export async function createSessionToken(session: AppSession): Promise<string> {
  return new SignJWT({
    id: session.user_id,
    email: session.user_email,
    name: session.user_name,
    role: session.role,
    department: session.department || "",
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("24h")
    .sign(SESSION_SECRET);
}

export async function verifySessionToken(token: string): Promise<AppSession | null> {
  try {
    const { payload } = await jwtVerify(token, SESSION_SECRET);
    return {
      user_id: (payload.id as string) || (payload.sub as string),
      user_email: (payload.email as string) || "",
      user_name: (payload.name as string) || "",
      role: (payload.role as Role) || "Student",
      department: (payload.department as string) || "",
    };
  } catch {
    return null;
  }
}
```

- [ ] **Step 2: Update `src/app/api/session/route.ts` to use `createSessionToken`**

Replace manual `SignJWT` call in `src/app/api/session/route.ts` with `createSessionToken`:
```typescript
import { createSessionToken, Role } from "@/lib/auth/session-token";
// In POST:
const userRole: Role = (payload.roles?.[0] as Role) || "Student";
const session_token = await createSessionToken({
  user_id: data.user_id,
  user_email: email || "",
  user_name: name || "",
  role: userRole,
});
```

- [ ] **Step 3: Update `src/lib/auth/get-session.ts` to parse `session_token` cookie**

Refactor `getSession` to read and verify the `session_token` cookie, with fallback to Supabase if transitioning:

```typescript
import { cookies } from "next/headers";
import { verifySessionToken, AppSession } from "./session-token";

export async function getSession(): Promise<AppSession> {
  const cookieStore = await cookies();
  const token = cookieStore.get("session_token")?.value;

  if (token) {
    const session = await verifySessionToken(token);
    if (session) return session;
  }

  throw new Error("No active session");
}
```

- [ ] **Step 4: Verify TypeScript compilation**

Run: `npx tsc --noEmit`
Expected: PASS with 0 errors.

- [ ] **Step 5: Commit session utility updates**

```bash
git add src/lib/auth/session-token.ts src/app/api/session/route.ts src/lib/auth/get-session.ts
git commit -m "feat(auth): Unify session token minting and server verification"
```

---

### Task 3: Edge Middleware & Route Protection (`src/middleware.ts`)

**Files:**
- Create: `src/middleware.ts`
- Remove: `src/proxy.ts`
- Create: `src/app/(pages)/auth-error/page.tsx`

- [ ] **Step 1: Create `src/middleware.ts` with strict role-based routing**

```typescript
import { NextRequest, NextResponse } from "next/server";
import { verifySessionToken } from "@/lib/auth/session-token";

export async function middleware(request: NextRequest) {
  const { pathname, origin } = request.nextUrl;

  // Handle /clearance redirect to /student
  if (pathname.startsWith("/clearance")) {
    return NextResponse.redirect(new URL("/student", request.url), 301);
  }

  // Public and callback routes
  if (
    pathname === "/" ||
    pathname === "/auth-error" ||
    pathname.startsWith("/api/auth") ||
    pathname.startsWith("/api/session") ||
    pathname.startsWith("/_next") ||
    pathname.includes(".")
  ) {
    return NextResponse.next();
  }

  // Extract session token
  const token = request.cookies.get("session_token")?.value;
  if (!token) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  const session = await verifySessionToken(token);
  if (!session) {
    const response = NextResponse.redirect(new URL("/", request.url));
    response.cookies.delete("session_token");
    return response;
  }

  const { role } = session;

  // Role gate checks
  if (pathname.startsWith("/admin") && role !== "Admin") {
    return NextResponse.redirect(new URL("/auth-error?reason=admin_required", request.url));
  }

  if (pathname.startsWith("/department") && !["Staff", "Department", "Admin"].includes(role)) {
    return NextResponse.redirect(new URL("/auth-error?reason=faculty_required", request.url));
  }

  if (pathname.startsWith("/student") && !["Student", "Admin"].includes(role)) {
    return NextResponse.redirect(new URL("/auth-error?reason=student_required", request.url));
  }

  // Pass verified identity headers to server components
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-user-id", session.user_id);
  requestHeaders.set("x-user-role", session.role);
  requestHeaders.set("x-user-department", session.department || "");

  return NextResponse.next({ request: { headers: requestHeaders } });
}

export const config = {
  matcher: [
    "/admin/:path*",
    "/department/:path*",
    "/student/:path*",
    "/clearance/:path*",
    "/api/admin/:path*",
    "/api/department/:path*",
    "/api/student/:path*",
  ],
};
```

- [ ] **Step 2: Remove obsolete `src/proxy.ts`**

Run: `rm -f src/proxy.ts`

- [ ] **Step 3: Create `src/app/(pages)/auth-error/page.tsx`**

Build an institutional error screen with Collegiate Modernist styling, clear error explanation, and role-appropriate return buttons.

- [ ] **Step 4: Verify middleware compilation**

Run: `npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 5: Commit Edge Middleware and error page**

```bash
git add src/middleware.ts src/app/\(pages\)/auth-error/page.tsx
git rm -f src/proxy.ts
git commit -m "feat(security): Implement Edge Middleware with RBAC and create auth-error page"
```

---

### Task 4: Reusable API Route Authorization Guard (`requireAuth`)

**Files:**
- Create: `src/lib/auth/require-auth.ts`
- Modify: `src/app/api/admin/departments/route.ts`
- Modify: `src/app/api/department/clients/quick-sign/route.ts`

- [ ] **Step 1: Create `src/lib/auth/require-auth.ts`**

```typescript
import { NextRequest, NextResponse } from "next/server";
import { verifySessionToken, AppSession, Role } from "./session-token";

export async function requireAuth(
  req: NextRequest,
  allowedRoles?: Role[]
): Promise<AppSession> {
  const token = req.cookies.get("session_token")?.value;
  if (!token) {
    throw new NextResponse(JSON.stringify({ error: "Unauthorized: Missing session" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  const session = await verifySessionToken(token);
  if (!session) {
    throw new NextResponse(JSON.stringify({ error: "Unauthorized: Invalid or expired session" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  if (allowedRoles && allowedRoles.length > 0 && !allowedRoles.includes(session.role)) {
    throw new NextResponse(JSON.stringify({ error: "Forbidden: Insufficient role permissions" }), {
      status: 403,
      headers: { "Content-Type": "application/json" },
    });
  }

  return session;
}
```

- [ ] **Step 2: Secure `src/app/api/admin/departments/route.ts` with `requireAuth`**

Add `await requireAuth(req, ["Admin"]);` at the top of GET and POST handlers.

- [ ] **Step 3: Secure `src/app/api/department/clients/quick-sign/route.ts` with `requireAuth`**

Add `const session = await requireAuth(req, ["Staff", "Department", "Admin"]);` to prevent unauthorized cross-tenant clearance signing.

- [ ] **Step 4: Verify TypeScript compilation**

Run: `npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 5: Commit API route guards**

```bash
git add src/lib/auth/require-auth.ts src/app/api/admin/departments/route.ts src/app/api/department/clients/quick-sign/route.ts
git commit -m "feat(security): Implement requireAuth guard across admin and department API routes"
```

---

### Task 5: Persistent App Shell Components

**Files:**
- Create: `src/components/shell/persistent-app-shell.tsx`
- Create: `src/components/shell/role-sidebar.tsx`
- Create: `src/components/shell/top-utility-bar.tsx`

- [ ] **Step 1: Create `src/components/shell/role-sidebar.tsx`**

Build the collapsible sidebar with:
- STI branding and system title
- Prominent Role Badge tag (*"Admin Workspace"*, *"Faculty Hub"*, *"Student Clearance"*)
- Role-specific navigation items using Lucide icons
- Active link highlighting in Institutional Navy / Gold accent
- Collapse to icon-rail toggle

- [ ] **Step 2: Create `src/components/shell/top-utility-bar.tsx`**

Build the sticky header with:
- Mobile hamburger menu toggle
- Dynamic Breadcrumb path
- Real-time Notifications Popover
- User Profile Avatar & Azure MSAL Sign-out button

- [ ] **Step 3: Create `src/components/shell/persistent-app-shell.tsx`**

Compose sidebar and topbar around children with responsive layout (`overflow-hidden h-screen flex`).

- [ ] **Step 4: Verify Shell components compile cleanly**

Run: `npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 5: Commit Persistent App Shell components**

```bash
git add src/components/shell/
git commit -m "feat(ui): Create PersistentAppShell with collapsible sidebar and topbar"
```

---

### Task 6: Role Layout Integration & Server Guards

**Files:**
- Modify: `src/app/(pages)/admin/layout.tsx`
- Modify: `src/app/(pages)/department/layout.tsx`
- Create: `src/app/(pages)/student/layout.tsx`

- [ ] **Step 1: Update `src/app/(pages)/admin/layout.tsx`**

Integrate `PersistentAppShell`, verify `session.role === "Admin"`, and redirect to `/auth-error` if invalid.

- [ ] **Step 2: Update `src/app/(pages)/department/layout.tsx`**

Integrate `PersistentAppShell`, verify `["Staff", "Department", "Admin"].includes(session.role)`, and wire department context.

- [ ] **Step 3: Create `src/app/(pages)/student/layout.tsx`**

Create student layout verifying `["Student", "Admin"].includes(session.role)` and mounting `PersistentAppShell` with the Student navigation manifest.

- [ ] **Step 4: Verify all layouts compile**

Run: `npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 5: Commit layout updates**

```bash
git add src/app/\(pages\)/admin/layout.tsx src/app/\(pages\)/department/layout.tsx src/app/\(pages\)/student/layout.tsx
git commit -m "feat(layout): Integrate PersistentAppShell and server guards across Admin, Faculty, and Student"
```

---

### Task 7: Student Portal Unification & Clearance Seal Component

**Files:**
- Create: `src/components/student/clearance-seal.tsx`
- Modify: `src/app/(pages)/student/page.tsx`
- Deprecate: `src/app/(pages)/clearance/page.tsx` (Forward to `/student`)

- [ ] **Step 1: Create `src/components/student/clearance-seal.tsx`**

Build the signature widget:
- Radial / progress ring showing overall percentage cleared
- Sequential department approval pipeline indicating prerequisite locks, pending reviews, and verified stamps
- Gold and emerald status accents matching the Collegiate Modernist palette

- [ ] **Step 2: Refactor `src/app/(pages)/student/page.tsx`**

Merge the clearance dashboard, task submission dropbox, and department office hours into a unified tabbed view under `/student`.

- [ ] **Step 3: Replace `src/app/(pages)/clearance/page.tsx` with redirect**

Redirect any lingering `/clearance` calls directly to `/student`.

- [ ] **Step 4: Verify Student interface builds without errors**

Run: `npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 5: Commit Student Portal unification**

```bash
git add src/components/student/clearance-seal.tsx src/app/\(pages\)/student/page.tsx src/app/\(pages\)/clearance/page.tsx
git commit -m "feat(student): Unify student clearance portal with Clearance Seal signature component"
```

---

### Task 8: End-to-End Verification & Production Build

**Files:**
- Complete codebase

- [ ] **Step 1: Run TypeScript full type check**

Run: `npx tsc --noEmit`
Expected: Exit code 0, 0 type errors.

- [ ] **Step 2: Run Next.js production build**

Run: `npm run build`
Expected: All routes build successfully with static and dynamic paths correctly recognized.

- [ ] **Step 3: Test role security matrix**

Verify:
- Unauthenticated visitor browsing `/admin/dashboard` is redirected to `/`
- Student role is blocked from `/admin/*` and redirected to `/auth-error`
- Non-admin calling `/api/admin/departments` receives 403 Forbidden

- [ ] **Step 4: Commit all final changes**

```bash
git add .
git commit -m "chore: Complete verification for persistent design system and multi-tier security"
```
