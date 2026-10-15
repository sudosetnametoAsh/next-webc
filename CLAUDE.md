# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Student Clearance System built with Next.js 15 (App Router), TypeScript, Supabase, and Azure MSAL authentication. The system manages student and staff clearance workflows across multiple departments with role-based access control (Admin, Staff/Department, Student).

## Tech Stack

- **Framework**: Next.js 15 with App Router and Turbopack
- **Language**: TypeScript
- **Database**: Supabase (PostgreSQL with RLS policies)
- **ORM**: Drizzle ORM
- **Authentication**: Azure MSAL (Microsoft Authentication Library) + custom session tokens
- **State Management**: TanStack Query v5
- **UI**: Radix UI + TailwindCSS
- **PDF Generation**: @react-pdf/renderer

## Commands

```bash
# Development
npm run dev              # Start dev server with Turbopack

# Build & Production
npm run build            # Production build with Turbopack
npm start                # Start production server

# Code Quality
npm run lint             # Run ESLint

# Database
npm run db:generate      # Generate Drizzle migrations
npm run db:migrate       # Run migrations
npm run db:push          # Push schema to database
npm run db:pull          # Pull schema from database
npm run db:studio        # Open Drizzle Studio
```

## Architecture

### Directory Structure

```
src/
├── app/
│   ├── (pages)/                    # Auth-protected routes
│   │   ├── admin/                  # Admin dashboard & management
│   │   ├── department/             # Department/staff interface
│   │   └── student/                # Student portal
│   └── api/                        # API routes (follows same role structure)
├── components/                     # React components (organized by role)
├── hooks/                          # TanStack Query hooks (organized by role)
├── lib/
│   ├── api/                        # API client utilities
│   ├── auth/                       # Authentication logic
│   ├── db/                         # Supabase clients & schema
│   ├── reports/                    # Report generation logic
│   └── services/                   # External services (SMS, etc.)
├── types/                          # TypeScript type definitions
└── context/                        # React contexts
```

### Authentication Flow

Three-layer auth system:
1. **Session token** (cookie): Primary auth method via `session_token` cookie
2. **Proxy headers**: Fallback via `x-user-id`, `x-user-role`, `x-user-department` headers
3. **Supabase auth**: Final fallback via `supabase.auth.getUser()`

Role hierarchy: `Admin` > `Staff`/`Department` > `Student`

### Key Files & Patterns

**Supabase Clients** (always create fresh, never cache in globals):
- Server: `src/lib/db/supabase-server.ts` - Use `await createClient()` in Server Components and API routes
- Browser: `src/lib/db/supabase-client.ts` - Use `createClient()` in Client Components

**Authentication Guards**:
- `src/lib/auth/require-auth.ts` - Use `requireAuth(req, allowedRoles)` or `withAuth(handler, allowedRoles)` wrapper for API routes
- Admin routes MUST use `requireAuth(req, ['Admin'])` or `withAuth(handler, ['Admin'])`

**Database Schema**:
- `src/lib/db/schema.ts` - Single source of truth for all tables and RLS policies
- Key tables: `users`, `students`, `staffs`, `clearance_records`, `clearance_tasks`, `clearance_templates`, `clearance_departments`

**TanStack Query Pattern**:
- Query keys format: `['role', 'resource', ...params]` (e.g., `['admin', 'courses']`, `['department', 'clients', sectionId]`)
- Hooks organized by role: `src/hooks/admin/`, `src/hooks/department/`, `src/hooks/student/`
- Example: `src/hooks/admin/courses.ts` shows the full pattern (fetch, create, update, delete)

**API Routes**:
- Return format: `{ data: T }` on success, `{ error: string }` on error
- Always use appropriate status codes (200, 400, 401, 403, 500)
- Match response types to definitions in `src/types/`

**Reports System**:
- Types: `src/lib/reports/types.ts` - Defines report data structures
- Computation: `src/lib/reports/compute.ts` - Client-side aggregation logic
- Data fetching: `src/lib/reports/data.ts` - API data fetching
- PDF theming: `src/lib/reports/pdf-theme.ts` - PDF styling

### Database Migrations

- Location: `supabase/migrations/`
- **Never modify existing migrations** - Always create new ones
- Use Drizzle Kit commands: `npm run db:generate` then `npm run db:migrate`
- Migrations include RLS (Row Level Security) policies defined in schema

### State Management

- **TanStack Query v5** for server state
- Query invalidation on mutations to keep data fresh
- Stale time typically set to 5 minutes: `staleTime: 1000 * 60 * 5`

### Styling

- TailwindCSS for styling
- Radix UI for accessible component primitives
- Theme provider at `src/lib/providers/theme-provider.tsx`

## Development Guidelines

### Adding New Features

1. **New API endpoint**:
   - Add route handler in `src/app/api/{role}/{resource}/route.ts`
   - Use auth guards: `requireAuth(req, [allowedRoles])`
   - Match response format: `{ data: T }` or `{ error: string }`
   - Define types in `src/types/{role}.ts`

2. **New data hook**:
   - Create in `src/hooks/{role}/{resource}.ts`
   - Follow pattern: `useFetch*`, `useCreate*`, `useUpdate*`, `useDelete*`
   - Use proper query keys: `['role', 'resource', ...params]`
   - Invalidate related queries on mutations

3. **New database table**:
   - Add to `src/lib/db/schema.ts` with RLS policies
   - Run `npm run db:generate` to create migration
   - Review generated SQL in `supabase/migrations/`
   - Run `npm run db:migrate` to apply

### Security

- **Never commit** `.env` files or expose credentials
- Always use `requireAuth` for protected API routes
- RLS policies in schema.ts must match application-level guards
- Validate user input before database operations

### Testing Changes

- Typecheck: TypeScript compiler will catch type errors during build
- Test API routes: Verify auth guards, response format, error handling
- Test UI: Run dev server and manually verify role-based access
- Check database: Use `npm run db:studio` to inspect data