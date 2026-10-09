# TaskManagement — Angular Frontend

A modern single-page application for project and task management: Kanban boards, filterable task lists, project members and roles, labels, and comments — backed by the TaskManagement .NET API.

## Features

- **Auth** — Register, login, silent JWT refresh with single retry, logout, route guards.
- **Projects** — Searchable/sortable list, detail overview with status stats, create/edit/delete.
- **Tasks** — Drag-and-drop Kanban board with workflow guardrails (backward moves need Owner/Admin), filterable/sortable paged list, rich detail view with properties panel and timeline comments.
- **Collaboration** — Project members and per-project roles, color-coded labels, task comments.
- **UX** — Light + dark mode (persisted, system-aware), sidebar layout, Lucide icons, styled `ng-select` dropdowns, custom CDK date picker (single + range, presets, week numbers, keyboard navigation), skeleton loaders, toasts.

## Tech Stack

| Area | Choice |
|---|---|
| Framework | Angular 22 (standalone components, signals) |
| State | `@ngrx/signals` SignalStores |
| Styling | Tailwind CSS v4 + CSS-variable design tokens |
| Components | Angular CDK (drag-drop, dialog, overlay), `ng-select`, `lucide-angular` |
| Tests | Vitest (`ng test`) |

## Prerequisites

- Node.js (see `.nvmrc` if present) and npm.
- The **TaskManagement backend API** running (HTTPS). The app expects it at the URL configured in `src/environments/environment*.ts`:
  - Scalar UI: `{apiBaseUrl}/scalar/v1`
  - OpenAPI: `{apiBaseUrl}/openapi/v1.json`
- Backend CORS must allow the dev server origin (`http://localhost:4200`) via `Cors:AllowedOrigins` in `appsettings.Development.json`.

See `FRONTEND_API_GUIDE.md` for the full endpoint, validation, and business-rule reference the app is built against.

## Getting Started

```bash
npm install
npm start        # ng serve -> http://localhost:4200/
```

Point the app at your local API port in `src/environments/environment.ts` (`apiBaseUrl`).

## Scripts

| Command | Description |
|---|---|
| `npm start` | Dev server with HMR (`http://localhost:4200/`) |
| `npm run build` | Production build into `dist/` |
| `npm test` | Unit tests (Vitest) |
| `npm run watch` | Development build in watch mode |

## Project Structure

```
src/
  app/
    core/            # API services, interceptors, guards, SignalStores, models, utils
      services/      # auth, users, projects, members, tasks, labels, comments, theme, toast…
      interceptors/  # Bearer attach + silent refresh, ProblemDetails normalization
      guards/        # authGuard, guestGuard, projectRoleGuard
      stores/        # AuthStore, ProjectsStore, TasksStore, ProjectRoleStore
      models/        # Domain types, request shapes, ProblemDetails
      utils/         # kanban-guards, validators, date + query-param helpers
    features/        # auth, projects, tasks (board/list/detail/form), members, labels
    shared/ui/       # toasts, pager, confirm-dialog, empty-state, skeleton, icon, avatar, date-picker
    shell/           # sidebar layout, 403/404 pages
    app.routes.ts    # lazy-loaded routes
  environments/      # apiBaseUrl per environment
```

## API Conventions (must-read for contributors)

- **IDs are opaque strings** — never `number`.
- **Enums are strings** (`"Todo"`, `"High"`, `"Owner"`, …), never ordinals.
- **Dates are ISO-8601 UTC**; due dates serialize at end-of-local-day so the backend's `UtcNow.Date` comparison never sees a shifted day (see `fromDateInputValue`).
- **Errors are RFC-9110 `ProblemDetails`** — use `normalizeError()` / `primaryMessage()`; field errors bind to forms, 401 triggers one silent refresh, 429 surfaces `Retry-After`.
- **Task workflow** — forward moves are free; backward moves, resurrecting `Cancelled`, and `Done → Cancelled` require Owner/Admin (`isBackwardMove` in `kanban-guards.ts`); `Done` tasks are otherwise immutable; unassigned tasks can't enter `InProgress`.
- Backend rate limits: 300 req/min global, 5 req/min on auth routes.

## Testing

```bash
npm test
```

Covers Kanban transition rules, backend-mirroring validators, query-param serialization/clamping, and date-math (incl. the due-date timezone regression test).

## Deployment Notes

- Set `apiBaseUrl` in `environment.production.ts` to the deployed API origin.
- The app is a static SPA — serve `dist/` over HTTPS behind any static host; no server-side rendering or secrets are embedded (tokens live in `localStorage` by team decision).
