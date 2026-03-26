# Performance & Architecture Overhaul Plan

## Context

The app is noticeably slow — every page navigation triggers fresh database queries (zero caching), calls `supabase.auth.admin.listUsers()` which fetches ALL users, does full table scans just for counting, and has N+1 query patterns. On the frontend, tables/filters/sidebar are copy-pasted across 10+ files (~2,500 LOC of duplication), modals load eagerly, and SWR is installed but never used. The goal is to make the app feel instant using modern Next.js patterns while consolidating duplicate UI into shared components.

---

## Phase 1: Server-Side Performance (biggest speed win, no UI changes)

### 1A. Eliminate `supabase.auth.admin.listUsers()`
**Files**: `src/lib/data/clients.ts`, `src/lib/data/team.ts`

The only data used from `listUsers()` is `last_sign_in_at`. Both `team_members` and `clients` tables already have a `last_login` column.

- Remove `listUsers()` calls from `getClients()` (line 30) and `getTeamMembers()` (line 31)
- Use `client.last_login` / `member.last_login` from the DB instead
- Add a lightweight `POST /api/auth/update-login` endpoint called from `AuthContext` on sign-in that writes `last_login = now()` to the matching `team_members`/`clients` row
- Keep the `profiles` join for `avatar_url`/`phone`/`country_code`

**Impact**: Removes a 500ms–2s REST call from every page load.

### 1B. Replace full-table-scan counting with DB aggregation
**Files**: `src/lib/data/clients.ts`, `src/lib/data/team.ts`
**New**: `migrations/xxx_add_count_rpcs.sql`

Create two Postgres RPC functions:

1. `get_client_counts()` → returns `(client_id, request_count, task_count)` via GROUP BY on `requests`/`task_request_links` — replaces `getClientCounts()` which currently loads entire `requests` + `tasks` tables into JS.

2. `get_team_member_counts()` → returns `(profile_id, request_count, task_count)` via GROUP BY on `requests.assigned_to` / `tasks.assigned_to` — replaces `getTeamMemberRequestCounts()` + `getTeamMemberTaskCounts()` + `getTeamMemberTasks()` (3 full table scans → 1 query).

Then update:
- `getEnrichedClients()` → call `supabase.rpc('get_client_counts')`
- `getEnrichedTeamMembers()` → call `supabase.rpc('get_team_member_counts')`

**Impact**: 4+ full table scans → 1 lightweight SQL query per page. Saves 200–800ms.

### 1C. Fix N+1 queries in requests/tasks
**Files**: `src/lib/data/requests.ts` (lines 118–152), `src/lib/data/tasks.ts`

The main Supabase `select` already JOINs `clients` (which has `organization`). The secondary queries to re-fetch `clients.organization` and `profiles.avatar_url` by email arrays are redundant.

- Add `avatar_url` to the `client:client_id` join (store avatar_url on clients table, or join profiles)
- Remove the 2 secondary queries after the main fetch
- Similarly fix `getTasksData()` which has the same pattern

Also in `getAllRequestsData()` — it calls `getTeamMembers()` which triggers `listUsers()` again. After 1A, this is fixed, but also consider whether the full team member list is needed (it's only used for dropdown options — could be a lighter query).

### 1D. Add `loading.tsx` skeleton files
**New files**: `src/app/(dashboard)/loading.tsx` (and optionally per-section)

Create a skeleton component with `animate-pulse` placeholders matching the layout (header bar + table rows). Since the Sidebar will be in the layout (Phase 2), the skeleton only shows the content area.

**Impact**: Users see the page shell instantly instead of a blank screen.

---

## Phase 2: Unified Dashboard Layout (extract Sidebar from every page)

### 2A. Create route group layout
**New files**:
- `src/app/(dashboard)/layout.tsx` (client component)
- `src/context/DashboardContext.tsx`

The layout component:
- Renders `<Sidebar>` once with `isSidebarCollapsed` / `isMobileOpen` state
- Renders the impersonation border wrapper
- Renders `{children}` in the content area div
- Exposes `openMobileMenu()` via DashboardContext

### 2B. Move routes into the group

Move into `src/app/(dashboard)/`:
- `page.tsx`, `requests/`, `tasks/`, `clients/`, `team/`, `files/`, `account/`

Keep outside: `login/page.tsx`, `api/`

### 2C. Strip Sidebar from all Client components

From each of the 10 components, remove:
- `import Sidebar` + the `<Sidebar>` render
- `isSidebarCollapsed` / `isMobileOpen` state + resize useEffect
- The outer `<div className="flex h-screen">` wrapper
- The `isImpersonating` padding wrapper (moved to layout)

Each page now starts at `<Header>` and calls `useDashboardContext().openMobileMenu` when needed.

**Impact**: ~500 LOC removed. Sidebar persists across navigations (no re-mount flash). Single source of truth for layout.

---

## Phase 3: Unified DataTable Component (consolidate duplicate tables)

### 3A. Create DataTable types
**New**: `src/components/DataTable/types.ts`

```typescript
interface ColumnDef<T> {
  key: string;
  label: string;
  width?: string;
  sortKey?: string | ((item: T) => any);
  filterType?: 'search' | 'dropdown' | 'date' | 'none';
  filterOptions?: DropdownOption[];
  renderCell: (item: T, index: number) => ReactNode;
  renderMobileCard?: (item: T) => ReactNode;
}

interface DataTableProps<T> {
  data: T[];
  columns: ColumnDef<T>[];
  onRowClick?: (item: T) => void;
  getRowKey: (item: T) => string;
  defaultSort?: { key: string; direction: 'asc' | 'desc' };
  mobileCardRenderer?: (item: T, index: number) => ReactNode;
  emptyMessage?: string;
}
```

### 3B. Create DataTable component
**New**: `src/components/DataTable/DataTable.tsx`

Extract from `RequestsTable.tsx` the shared logic:
- Portal filter headers (`activeFilterHeader`, `filterCoords`, `headerRefs`, `toggleFilter`)
- Sort state (`sortConfig` / `setSortConfig`)
- Click-outside handler
- Desktop `<table>` shell iterating columns
- Mobile card shell
- Empty state row

### 3C. Create column config files
**New**:
- `src/components/DataTable/columns/requestColumns.tsx` — `getRequestColumns(teamMembers, onUpdate)`
- `src/components/DataTable/columns/taskColumns.tsx` — `getTaskColumns(teamMembers, onUpdate)`

These encapsulate column-specific JSX (status dropdown options, priority display, avatar cells).

### 3D. Replace existing tables

- `RequestsTable.tsx` → thin wrapper calling `<DataTable columns={getRequestColumns(...)} />`  (573→~40 LOC)
- `TasksTable.tsx` → same pattern (627→~40 LOC)
- `ClientsClient.tsx` / `TeamClient.tsx` inline tables → use `<DataTable>` with their own column defs (~300 LOC removed each)

**Impact**: ~1,500 LOC consolidated. One place to fix table bugs. Future sections just need column config.

---

## Phase 4: Client-Side Performance Polish

### 4A. Dynamic imports for modals
**Files**: `RequestsClient.tsx`, `TasksClient.tsx`, detail pages

```typescript
const ChatDrawer = dynamic(() => import('@/components/ChatDrawer'), { ssr: false });
const TaskDetailModal = dynamic(() => import('@/components/TaskDetailModal'), { ssr: false });
const CreateRequestModal = dynamic(() => import('@/components/CreateRequestModal'), { ssr: false });
```

**Impact**: ~50KB less JS in initial page bundle.

### 4B. Adopt SWR for client-side fetching
**New**: `src/lib/hooks/useRequests.ts`, `useTasks.ts`, `useClients.ts`, `useTeam.ts`

```typescript
export function useRequests(initialData: RequestItem[]) {
  const { data, mutate } = useSWR('/api/requests', fetcher, {
    fallbackData: initialData,
    revalidateOnFocus: false,
    dedupingInterval: 5000,
  });
  return { requests: data, mutate };
}
```

Replace `useState` + `fetch` + `router.refresh()` in Client components with SWR hooks. After mutations, call `mutate()` for instant revalidation without full server re-render.

### 4C. React.memo on table rows

In DataTable, wrap row rendering with `React.memo`:
```typescript
const TableRow = React.memo(({ item, columns, onRowClick }) => (
  <tr>{columns.map(col => <td key={col.key}>{col.renderCell(item)}</td>)}</tr>
), (prev, next) => prev.item === next.item);
```

### 4D. Consider removing `force-dynamic`

For admin-only pages (team, clients) that show the same data to all admins, switch to:
```typescript
export const revalidate = 30; // ISR: rebuild every 30 seconds
```

Keep `force-dynamic` only for role-filtered pages (requests — different per user).

---

## Execution Order

```
Phase 1 (Server perf) → Phase 2 (Layout) → Phase 3 (DataTable) → Phase 4 (Client perf)
```

Phase 1 is pure backend — no UI changes, biggest speed win, lowest risk. Phase 2 is structural (must be stable before Phase 3). Phase 3 is the big refactor. Phase 4 is polish.

## Verification

After each phase:
1. `npm run build` — verify no build errors
2. `npm run dev` — test every page: Dashboard, Requests, Tasks, Clients, Team, Files, Account
3. Test role-based access: admin sees all, team_member sees assigned, client sees own
4. Test mobile layout (responsive sidebar, card views)
5. Check Network tab: verify eliminated queries don't appear, page load times improved
6. Test CRUD operations: create/edit/delete requests, tasks, clients, team members
7. Test navigation: sidebar persists, no re-mount flash between pages
