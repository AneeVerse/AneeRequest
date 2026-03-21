# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev      # Start dev server at http://localhost:3000 (Turbopack)
npm run build    # Production build
npm run start    # Start production server
npm run lint     # ESLint
```

No test framework is configured.

## Architecture

**Next.js 16 App Router** project with **Supabase** (PostgreSQL + Auth) and **Google Drive** integration, deployed on **Vercel**.

### Stack

- React 19, TypeScript 5 (strict), Tailwind CSS 4
- Supabase SSR for auth (cookie-based sessions) + database
- Google Drive API (googleapis) for file storage
- SWR for client-side data fetching
- lucide-react for icons

### Directory Layout

- `src/app/` — Pages (App Router) and API routes
- `src/components/` — Client components; sub-folders `clients/` and `requests/` for feature-specific components
- `src/context/AuthContext.tsx` — Global auth state with impersonation support
- `src/lib/supabase.ts` — Two Supabase clients: `createClient()` (browser, SSR cookies) and `createServiceClient()` (server, service role key)
- `src/lib/googleDrive.ts` — Drive API wrapper with OAuth2 (preferred) or service account auth, 60s TTL cache
- `src/lib/utils.ts` — Slug generation (`slugify`) and resolution (`resolveRequestSlug`, `resolveTaskSlug`)
- `src/lib/data/` — Server-side data fetching functions (requests, clients, tasks, team, files)
- `src/proxy.ts` — Middleware for route protection (redirects unauthenticated users to /login)
- `migrations/` — Supabase SQL migrations (run manually)

### Routing & Slug Resolution

Dynamic routes (`/requests/[id]`, `/tasks/[id]`, `/clients/[slug]`) accept both UUIDs and slugs. API routes resolve slugs server-side via `resolveRequestSlug()`/`resolveTaskSlug()` which check UUID format first, then query the `slug` column. Client-side pages must resolve slugs to UUIDs before making Supabase queries since the browser client queries by `id` (UUID).

### Auth & Roles

Four roles: `super_admin`, `admin` (team_role), `team_member`, `client`. Auth context provides `useAuth()` with `profile`, `viewAsProfile` (impersonation), `isImpersonating`. Admins can impersonate users via sessionStorage. API routes filter data by role — clients see only their own requests, non-admin team members see only assigned requests.

### Supabase Patterns

- **Browser client** (`createClient`): Used in client components and middleware for session/auth state
- **Service client** (`createServiceClient`): Used in API routes and `lib/data/` for server-side CRUD; bypasses RLS
- Row-Level Security enforced at the database level

### Google Drive Integration

File storage uses a folder hierarchy: `Root > ClientName > RequestTitle > production|distributed`. Upload routing: request files go to Google Drive (staff → production, client → distributed folders); task chat attachments go to Supabase Storage. Auth prefers OAuth2 refresh token over service account.

### File Upload Strategy

`/api/upload` routes files by context:
- **Request attachments** → Google Drive (structured folders)
- **Task attachments** → Supabase Storage (`chat-attachments` bucket)

### Environment Variables

```
NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY
GOOGLE_OAUTH_CLIENT_ID, GOOGLE_OAUTH_CLIENT_SECRET, GOOGLE_OAUTH_REFRESH_TOKEN
GOOGLE_SERVICE_ACCOUNT_KEY (fallback), GOOGLE_DRIVE_ROOT_FOLDER_ID
CRON_SECRET
```

## Key Conventions

- Path alias: `@/*` maps to `./src/*`
- Dark theme by default; custom colors: cod-gray (`#09090B`), shark (`#27272A`), malibu (`#279da6`), iron (`#E4E4E7`)
- Image domains whitelisted in `next.config.ts`: Supabase storage and Google user content
- Vercel cron: `/api/cron/keep-alive` runs daily at midnight UTC
