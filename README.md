# Focus CRM

A complete CRM built with **Next.js (App Router) + React + TypeScript + Tailwind CSS v4**.

## Run

```bash
npm install
npm run dev        # http://localhost:3000
```

The public product website is at `/`, sign-in is at `/login`, and the authenticated CRM dashboard is at `/dashboard`.

On first load the app imports every CSV in `Data/` (HubSpot sample import files).
Sign in with a user found in the data (password `demo123`), e.g. `mmitchell@hubspot.com`.

## Data

- `Data/*.csv` is the only data source. There is no generated demo data.
- `GET /api/import` ([src/app/api/import/route.ts](src/app/api/import/route.ts)) reads the files and
  [src/lib/import/hubspot.ts](src/lib/import/hubspot.ts) maps them. Columns are detected from each header, so one
  row can create and link several records (company + contact + deal + note…).
- Records are merged across files by company domain/name, contact email/name, and deal/ticket name.
  HubSpot stages and statuses are mapped to CRM stages; the original values are kept as extra properties.
- Settings → **Data sources** shows what every file contributed and anything that couldn't be linked.
- Settings → **Re-import CSV data** reloads from `Data/` (e.g. after adding or editing a CSV). Edits made in the
  app are saved in the browser until you re-import.

## Modules

| Area | What it does |
|------|--------------|
| Dashboard | Greeting with today's focus, 6 KPIs with trend vs last 30 days, revenue trend, pipeline, conversion, tasks, activities, leaderboard, top customers |
| Contacts | Search, filter, sort, pagination, column toggle, bulk status/owner/delete, CSV export, full profile with timeline, deals, tasks, notes, quick actions |
| Companies | Account list with pipeline/revenue roll-ups, detail page showing Company → Contacts → Deals → Activities → Tickets |
| Deals | List with Open/Won/Lost views, filters, bulk stage move, side panel with stage stepper |
| Pipeline | Kanban with drag and drop, live total/weighted pipeline, won value and win rate |
| Activities | Calls, emails, meetings, notes, follow-ups; upcoming vs history, today's schedule |
| Tasks | My/All tasks, Today/Upcoming/Overdue/Completed filters, one-click complete |
| Calendar | Month view of activities and task due dates |
| Tickets | Support queue with status workflow, detail page with notes and history |
| Reports | Revenue, win rate, conversion, deals by stage, sales by owner, activity performance, customer growth, lead sources, CSV export |
| Settings | Profile, workspace, theme, currency, CSV re-import, per-file import report |

Global: `Ctrl/⌘ + K` search, "+ New" quick-create, notifications, collapsible sidebar, mobile navigation, toasts, confirm dialogs, empty states.

## Architecture

```
src/
  app/(crm)/…        pages (inside the authenticated app shell)
  app/login          sign-in
  components/ui      design system: Button, Input, Select, Card, Badge, Tabs, Modal, Drawer, Menu, DataTable, Toaster…
  components/layout  Sidebar, Topbar, CommandSearch, AppShell
  components/crm     shared CRM pieces: Timeline, TaskRow, ActivityItem, DealDrawer, badges
  components/forms   FormHost – one validated form system for all 6 record types
  components/charts  Recharts wrappers (trend, bars, donut, sparkline, ring)
  lib/store.ts       Zustand store: CRUD, stage moves, ticket status, cascading unlinks, timeline events
  lib/metrics.ts     all KPIs/analytics derived from live data
  lib/import/        CSV parser + HubSpot importer (runs server-side via /api/import)
```

Imported data and your edits are kept in the browser (localStorage) through the store. All pages read from the store, so swapping it for a REST or database backend only means changing `lib/store.ts`.
