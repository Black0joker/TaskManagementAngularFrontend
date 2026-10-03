# TaskManagement API — Angular Frontend Guide

> Generated from `src/TaskManagement.API/Controllers/*.cs` + Application DTOs/validators + Domain enums/rules.
> Purpose: give a frontend agent everything needed to build an Angular app against this API without re-reading the backend.

- **Solution:** `TaskManagement.slnx` (.NET 10, ASP.NET Core Web API, Clean Architecture + CQRS/MediatR)
- **Run API:** `dotnet run --project src/TaskManagement.API` (dev auto-migrates + seeds LocalDB; Scalar UI at `/scalar/v1`, OpenAPI at `/openapi/v1.json`)
- **Base URL (dev):** `https://localhost:<port>` — no explicit `UseUrls` in `Program.cs`; use the port Kestrel prints. All routes below are relative, e.g. `POST {base}/api/auth/login`.
- **IDs:** all entity/user IDs are **strings** (ASP.NET Identity keys). Treat as opaque `string`, never `number`.
- **Entity naming:** backend entity is `TaskItem`, never `Task` (avoids `System.Threading.Tasks.Task` collision). JSON resources are still called "tasks" in URLs.
- **JSON enums serialize as strings** (`JsonStringEnumConverter`). Always send/receive `"Todo"`, `"High"`, `"Owner"`, etc. — never numeric ordinals.
- **Dates:** ISO 8601 UTC strings (`2026-10-03T12:00:00Z`). `DueDate` comparisons are done against `DateTime.UtcNow.Date`.
- **Auth scheme:** `Authorization: Bearer <accessToken>` (JWT Bearer, `ClockSkew = 0`). Get tokens from `/api/auth/*`.
- **Content-Type:** `application/json`. Kestrel max body **1 MB** — don't send large payloads.
- **CORS is deny-by-default** unless `Cors:AllowedOrigins` is configured on the backend. If the Angular dev server (`http://localhost:4200`) gets CORS errors, set it in `appsettings.Development.json`, do not work around with a proxy in production code unless the team agrees.
- **Rate limiting (not in `Testing` env):** global `300 req/min/IP`, `auth` limiter `5 req/min/IP` on `AuthController` (`429 + Retry-After: 60` as `ProblemDetails`). Implement exponential backoff / friendly "try again" on 429, especially for login/register forms.
- **Scalar/OpenAPI Bearer helper:** Scalar UI is preconfigured with a Bearer security scheme — use it to smoke-test endpoints manually.

---

## 1. Global response shapes

### 1.1 Pagination — `PagedResult<T>`

Used by `GET /api/tasks` and `GET /api/tasks/{id}/comments`.

```ts
interface PagedResult<T> {
  items: T[];            // C#: Items
  page: number;          // 1-based, NormalizedPage (page < 1 => 1)
  pageSize: number;      // NormalizedPageSize: <1 => 20, >100 => 100
  totalCount: number;
  totalPages: number;    // ceil(totalCount / pageSize)
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}
```

Defaults: `page=1`, `pageSize=20`, max `100`. Backend clamps rather than 400s — mirror this in the UI pager (cap pageSize input at 100).

> Note: C# property names are PascalCase but default ASP.NET JSON policy emits **camelCase** (`items`, `totalCount`, …). All TypeScript below assumes camelCase over the wire. If you observe PascalCase, check `JsonSerializerOptions.PropertyNamingPolicy` — controllers were read, not serializer config, so verify once against Scalar.

### 1.2 Errors — RFC 9110 `ProblemDetails` (`application/problem+json`)

All failures (including auth 401/403 and 429) go through `ExceptionHandlingMiddleware`. Never expect raw exceptions.

```ts
interface ProblemDetails {
  type: string;    // e.g. "https://tools.ietf.org/html/rfc9110#section-15.5.5"
  title: string;   // e.g. "Not Found"
  status: number;  // HTTP status
  detail?: string;
  errors?: Record<string, string[]>; // only on 400 ValidationProblemDetails
}
```

| Backend exception | HTTP | Angular handling |
|---|---|---|
| `ValidationException` (FluentValidation) | `400` + `errors` map | Bind `errors` to form controls; show summary |
| `UnauthorizedException` / empty 401 | `401`, detail `"Authentication is required..."` | Redirect to `/login`, attempt silent refresh once |
| `ForbiddenAccessException` / empty 403 | `403`, detail `"You do not have permission..."` | Show "no access" view; hide action buttons via role checks |
| `NotFoundException` | `404` | Show not-found state |
| `ConflictException` | `409` | Show conflict (e.g. duplicate email, delete task with comments) |
| `DbUpdateConcurrencyException` | `409`, detail `"The resource was modified by another request. Reload it and try again."` | Reload + retry |
| `BusinessRuleException` (task workflow, due-date rules) | `422` | Show business-rule message; disable invalid transitions in UI |
| Unhandled | `500`, generic detail | Generic error toast + log |

Empty-body 404/405 from routing are also synthesized into `ProblemDetails` by the middleware.

### 1.3 Auth model (what to gate in the UI)

- Global Identity roles: `Admin`, `User` (source: `ApplicationRoles`; `RolePermissions.For(role)`).
  - `Admin` → all 11 permissions.
  - `User` → `Project.Read/Create/Update`, `Task.Read/Create/Update`, `Comment.Create/Update/Delete`. **No** `Project.Delete`, `Task.Delete`.
- Per-project roles (`ProjectMemberRole` enum, sent as strings): `Owner = 0`, `Admin = 1`, `Member = 2`, `Viewer = 3`.
- One auth policy per string in `ApplicationPermissions.All`:
  - `Project.Create`, `Project.Read`, `Project.Update`, `Project.Delete`
  - `Task.Create`, `Task.Read`, `Task.Update`, `Task.Delete`
  - `Comment.Create`, `Comment.Update`, `Comment.Delete`
- Every handler re-checks `IProjectAccessService` even when the controller has `[Authorize(Policy=...)]` — expect `403/404` even for routes the JWT role nominally allows. Don't rely solely on hiding buttons; always handle 403/404.

`GET /api/users/me` returns global `roles: string[]`. Project membership (`GET /api/projects/{projectId}/members`) gives the per-project `role`. A typical Angular `canActivate` check needs **both**.

---

## 2. TypeScript domain models (copy-paste starter)

```ts
// Enums — must stay string unions matching backend names exactly
export type TaskItemStatus = 'Todo' | 'InProgress' | 'InReview' | 'Done' | 'Cancelled';
export type TaskItemPriority = 'Low' | 'Medium' | 'High' | 'Critical';
export type ProjectMemberRole = 'Owner' | 'Admin' | 'Member' | 'Viewer';

export interface AuthTokenResponse {
  accessToken: string;
  refreshToken: string;
  accessTokenExpiresAtUtc: string; // ISO date
  tokenType: string;               // default "Bearer"
}
export interface RegisterResponse { id: string; email: string; firstName: string; lastName: string; }
export interface CurrentUserResponse {
  id: string; email: string; firstName: string; lastName: string; roles: string[];
}
export interface ProjectResponse {
  id: string; name: string; description: string | null;
  createdById: string; createdAt: string; updatedAt: string;
}
export interface ProjectTaskSummary {
  id: string; title: string; description: string | null;
  status: TaskItemStatus; priority: TaskItemPriority;
  dueDate: string | null; assignedToId: string | null; createdAt: string;
}
export interface ProjectLabelSummary { id: string; name: string; color: string; } // color: "#RRGGBB"
export interface ProjectMemberResponse {
  userId: string; email: string; firstName: string; lastName: string; role: ProjectMemberRole;
}
export interface TaskAssigneeDto { id: string; name: string; }
export interface TaskLabelDto { id: string; name: string; color: string; }
export interface TaskResponse {
  id: string; projectId: string; title: string; description: string | null;
  status: TaskItemStatus; priority: TaskItemPriority; dueDate: string | null;
  assignedTo: TaskAssigneeDto | null; createdById: string;
  createdAt: string; updatedAt: string;
}
export interface TaskDetailsResponse extends TaskResponse { labels: TaskLabelDto[]; }
export interface CommentResponse {
  id: string; taskId: string; authorId: string; authorName: string;
  content: string; createdAt: string; updatedAt: string;
}
```

---

## 3. Endpoints by controller

### 3.1 `AuthController` — `api/auth`, rate-limited (`auth`: 5 req/min/IP)

No `[Authorize]` on any auth route. All bodies are JSON.

| Method & route | Body | Success | Errors |
|---|---|---|---|
| `POST /api/auth/register` | `{ firstName, lastName, userName, email, password }` | `201 { id, email, firstName, lastName }` | `400` validation, `409` email exists |
| `POST /api/auth/login` | `{ email, password }` | `200 AuthTokenResponse` | `400`, `401` bad credentials |
| `POST /api/auth/refresh` | `{ refreshToken }` | `200 AuthTokenResponse` (rotated) | `400/401` invalid/expired/reused |
| `POST /api/auth/logout` | `{ refreshToken }` | `204` | — (idempotent-style; still send stored refresh token) |

```ts
// request shapes
interface RegisterCommand { firstName: string; lastName: string; userName: string; email: string; password: string; }
interface LoginCommand { email: string; password: string; }
interface RefreshCommand { refreshToken: string; }
interface LogoutCommand { refreshToken: string; }
```

Validation (mirror with Angular `Validators`):
- Register: `firstName` required, max 100; `lastName` required, max 100; `email` required, email format, max 256; `password` required, **min 8 + must contain uppercase, lowercase, digit, non-alphanumeric** (`[^a-zA-Z0-9]`). No backend rule on `userName`, but it is required by the record — require it in the form (ask backend if uniqueness is enforced; `409` is only documented for email).
- Login: `email` required + email format; `password` required (no length check).
- Refresh/Logout: single required `refreshToken` string (no validator file — treat empty as client-side error).

Angular auth flow:
1. `login` → persist `accessToken` + `refreshToken` (use `localStorage` only if XSS posture is accepted; otherwise in-memory + refresh on boot). Record `accessTokenExpiresAtUtc` for proactive refresh.
2. `HttpInterceptor`: attach `Authorization: Bearer <accessToken>` to all `/api/*` except auth routes.
3. On `401`: call `refresh` once with stored refresh token, retry original request; on refresh failure → clear storage → route to `/login`.
4. `logout`: send stored `refreshToken`, then clear storage regardless of result.
5. Auth `429` is likely under brute-force testing — surface `Retry-After: 60` as "too many attempts, try again in a minute".

### 3.2 `UsersController` — `api/users`, `[Authorize]`

| Method & route | Success | Notes |
|---|---|---|
| `GET /api/users/me` | `200 CurrentUserResponse` | No query/body. Primary "session + global roles" source. Call on app boot and after login. |

Use `roles` for global admin gates (e.g. show admin UI). Combine with project-member `role` for project gates.

### 3.3 `ProjectsController` — `api/projects`, `[Authorize]`

| Method & route | Auth policy | Body / params | Success | Errors |
|---|---|---|---|---|
| `GET /api/projects` | `Project.Read` | — | `200 ProjectResponse[]` | `403` |
| `GET /api/projects/{id}` | `Project.Read` | `id` path | `200 ProjectResponse` | `404` |
| `POST /api/projects` | `Project.Create` | `{ name, description? }` | `201 ProjectResponse` (`Location: GetProject`) | `400` |
| `PUT /api/projects/{id}` | `Project.Update` | path `id` + body `{ id, name, description? }`; **must match** or backend throws `ValidationException` → `400` | `200 ProjectResponse` | `400` (incl. id mismatch), `404` |
| `DELETE /api/projects/{id}` | `Project.Delete` | — | `204` | `404`, `403` (global `User` role lacks this) |
| `GET /api/projects/{id}/tasks` | `Project.Read` | — | `200 ProjectTaskSummary[]` (unpaged list) | `404` |
| `GET /api/projects/{id}/labels` | `Project.Read` | — | `200 ProjectLabelSummary[]` | `404` |
| `POST /api/projects/{id}/labels` | `Project.Update` | `{ name, color }` | `201 ProjectLabelSummary` (`Location: /api/projects/{id}/labels`) | `400`, `404` |

```ts
interface CreateProjectCommand { name: string; description?: string | null; }
interface UpdateProjectCommand { id: string; name: string; description?: string | null; }
interface CreateProjectLabelRequest { name: string; color: string; } // "#RRGGBB"
```

Validation:
- Project `name`: required, max 200. `description`: max 2000, nullable.
- Label `name`: required, max 50. `color`: required, must match `^#[0-9A-Fa-f]{6}$` — use an `<input type="color">` + uppercase-normalize, plus regex validator.
- UpdateProject: always send the route `id` also as body `id`. Mismatch = `400` with `errors: { Id: [...] }`.

Angular notes:
- Project list has **no pagination** (`IReadOnlyList`) — add client-side search/sort if it grows.
- `GET {id}/tasks` returns summaries (flat, includes `assignedToId` but not assignee name). Use `GET /api/tasks?projectId=` when you need paging/filtering, and `GET /api/tasks/{id}` for full details.
- Deleting a project needs `Project.Delete` (global Admin or privileged project role) — hide delete for plain members and handle `403`.

### 3.4 `ProjectMembersController` — `api/projects/{projectId}/members`, `[Authorize]`

| Method & route | Policy | Body | Success | Errors |
|---|---|---|---|---|
| `GET /api/projects/{projectId}/members` | `Project.Read` | — | `200 ProjectMemberResponse[]` | `404` |
| `POST /api/projects/{projectId}/members` | `Project.Update` | `{ userId, role }` (`role`: `"Owner"|"Admin"|"Member"|"Viewer"`) | `201 ProjectMemberResponse` (`Location: GetMembers`) | `400`, `404` |
| `PUT /api/projects/{projectId}/members/{userId}` | `Project.Update` | `{ role }` | `200 ProjectMemberResponse` | `400`, `404` |
| `DELETE /api/projects/{projectId}/members/{userId}` | `Project.Update` | — | `204` | `404` |

```ts
interface AddProjectMemberRequest { userId: string; role: ProjectMemberRole; }
interface UpdateProjectMemberRoleRequest { role: ProjectMemberRole; }
```

Validation: `projectId`, `userId` required; `role` must be a valid enum value. There is **no user-search endpoint** — adding a member requires a known `userId` string (coordinate with backend or reuse IDs from comments/members lists; consider requesting a user-lookup feature if the UI needs an invite-by-email flow).

### 3.5 `TasksController` — `api/tasks`, `[Authorize]` (largest surface)

#### List / get / create / full-update / delete

| Method & route | Policy | Success | Errors |
|---|---|---|---|
| `GET /api/tasks` (query, see below) | `Task.Read` | `200 PagedResult<TaskResponse>` | `400` bad `sortBy`/`sortDirection`/`search` |
| `GET /api/tasks/{id}` | `Task.Read` | `200 TaskDetailsResponse` (includes `labels[]`) | `404` |
| `POST /api/tasks` | `Task.Create` | `201 TaskResponse` | `400`, `404` (bad project) |
| `PUT /api/tasks/{id}` | `Task.Update` | `200 TaskResponse` | `400`, `404`, `409` concurrency, `422` business rule |
| `DELETE /api/tasks/{id}` | `Task.Delete` | `204` | `404`, `409` task has comments, `403` for plain `User` role |

```ts
interface CreateTaskCommand {
  projectId: string; title: string; description?: string | null;
  status: TaskItemStatus; priority: TaskItemPriority;
  assignedToId?: string | null; dueDate?: string | null; // ISO date
}
// PUT body (no projectId — task cannot move projects via update):
interface UpdateTaskRequest {
  title: string; description?: string | null;
  status: TaskItemStatus; priority: TaskItemPriority;
  assignedToId?: string | null; dueDate?: string | null;
}
```

Validation (create + full update):
- `projectId` (create only): required. `title`: required, max 200. `description`: max 2000. `status`/`priority`: must be valid enum strings. `dueDate`: `null` allowed, else **must be >= today (UTC)** or `400 "Due date cannot be in the past."` `assignedToId`: no validator — `null` = unassigned.

#### `GET /api/tasks` query parameters (all optional unless noted)

```
projectId?: string
overdue?: boolean            // default false
dueToday?: boolean           // default false
dueThisWeek?: boolean        // default false
noDueDate?: boolean          // default false
dueBefore?: ISO date
dueAfter?: ISO date
page?: number                // default 1
pageSize?: number            // default 20, clamp 100
status?: TaskItemStatus
priority?: TaskItemPriority
assignedToId?: string
createdById?: string
labelId?: string
dueFrom?: ISO date
dueTo?: ISO date
sortBy?: "title"|"status"|"priority"|"dueDate"|"createdAt"  // case-insensitive; anything else => 400
sortDirection?: "asc"|"desc" // case-insensitive; anything else => 400
search?: string              // max 200 chars => 400 if longer
```

Example: `GET /api/tasks?projectId=abc&status=InProgress&page=1&pageSize=20&sortBy=dueDate&sortDirection=asc&search=checkout`.

Only these three are validator-checked (`400`): `sortBy` whitelist, `sortDirection` in `asc|desc`, `search` max 200. Pagination is clamped, not rejected.

#### Fine-grained PATCH routes (prefer these for Kanban/board UIs)

All require `Task.Update`; all return `200 TaskResponse`; all can yield `400/404/409/422`.

| Method & route | Body | Notes |
|---|---|---|
| `PATCH /api/tasks/{id}/status` | `{ status: TaskItemStatus }` (required, nullable on the wire but `null` → `400`) | Status workflow rules apply (see §4) |
| `PATCH /api/tasks/{id}/priority` | `{ priority: TaskItemPriority }` (required, `null` → `400`) | — |
| `PATCH /api/tasks/{id}/assignee` | `{ userId: string \| null }` | `null`/empty = **unassign** (explicitly allowed). No validator on `userId`. |
| `PATCH /api/tasks/{id}/due-date` | `{ dueDate: string \| null }` | `null` = clear. Non-null must be >= today or `400`. |

```ts
interface UpdateTaskStatusRequest { status: TaskItemStatus; }
interface UpdateTaskPriorityRequest { priority: TaskItemPriority; }
interface UpdateTaskAssigneeRequest { userId: string | null; }
interface UpdateTaskDueDateRequest { dueDate: string | null; }
```

#### Labels on tasks

| Method & route | Policy | Success | Errors |
|---|---|---|---|
| `POST /api/tasks/{id}/labels/{labelId}` | `Task.Update` | `201` empty body (`Location: /api/tasks/{id}`) | `400`, `404` |
| `DELETE /api/tasks/{id}/labels/{labelId}` | `Task.Update` | `204` | `404` |

No request body — both IDs are path params.

#### Comments under tasks

| Method & route | Policy | Body / query | Success | Errors |
|---|---|---|---|---|
| `GET /api/tasks/{id}/comments?page=1&pageSize=20` | `Task.Read` | paged | `200 PagedResult<CommentResponse>` | `404`, `400` bad `taskId` |
| `POST /api/tasks/{id}/comments` | `Comment.Create` | `{ content }` | `201 CommentResponse` (`Location: ""` — don't rely on header; use body) | `400`, `404` |

```ts
interface CreateCommentRequest { content: string; } // required, max 5000
```

### 3.6 `LabelsController` — `api/labels`, `[Authorize]` (top-level, by label id)

Project-scoped creation/listing lives under `ProjectsController`; these two operate on a label id directly.

| Method & route | Policy | Body | Success | Errors |
|---|---|---|---|---|
| `PUT /api/labels/{id}` | `Project.Update` | `{ name, color }` | `200 ProjectLabelSummary` | `400`, `404` |
| `DELETE /api/labels/{id}` | `Project.Update` | — | `204` | `404` |

```ts
interface UpdateLabelRequest { name: string; color: string; } // same rules: name req/max 50, color req /^#[0-9A-Fa-f]{6}$/
```

### 3.7 `CommentsController` — `api/comments`, `[Authorize]` (by comment id)

Task-scoped list/create lives under `TasksController`; these two operate on a comment id directly.

| Method & route | Policy | Body | Success | Errors |
|---|---|---|---|---|
| `PUT /api/comments/{id}` | `Comment.Update` | `{ content }` | `200 CommentResponse` | `400` (empty/>5000), `403`, `404` |
| `DELETE /api/comments/{id}` | `Comment.Delete` | — | `204` | `403`, `404` |

```ts
interface UpdateCommentRequest { content: string; } // required, max 5000
```

Note: deleting a **task that has comments** returns `409` — the UI must delete (or ask backend to cascade) comments first, or explain why delete is blocked. This is handler-enforced, not obvious from the controller alone.

---

## 4. Task business rules (must be reflected in the UI)

Sourced from `Domain/Rules/TaskStatusTransitions.cs` + `AGENTS.md` handler rules. Backend returns `422 BusinessRuleException` (or `400/409`) when violated — but a good UI prevents them upfront.

- **Status chain:** `Todo(0) → InProgress(1) → InReview(2) → Done(3)`; `Cancelled` is off-chain/terminal.
  - **Forward** = any contributor can do: step up the chain (skipping allowed, e.g. `Todo → Done`), and active → `Cancelled` **except** from `Done`.
  - **Backward** = requires project `Owner`/`Admin`: any step down the chain (e.g. `InReview → Todo`, `Done → InProgress`), `Cancelled → *` (resurrect), and `Done → Cancelled`.
  - Same-status writes are no-ops (`IsSame`).
- **Unassigned tasks cannot enter `InProgress`** — force an assignee pick before allowing that transition (or surface the 422).
- **`Done` tasks are immutable** — status, priority, assignee, due-date, and labels cannot change once `Done`. Render `Done` cards read-only (except backward transition by Owner/Admin, and delete if permitted).
- **Due dates:** required for `Todo`/`InProgress`/`InReview`, **forbidden** for `Done`/`Cancelled`. Due-date edits also enforce "not in the past". Design the task form so `Done`/`Cancelled` clears/disables the due-date field, and active statuses require it.
- **Delete with comments → `409`.** Confirm dialog should warn when `commentCount > 0` (fetch comments or track count client-side).
- **Optimistic concurrency:** entities implementing `IVersioned` bump `Version` in `SaveChangesAsync` (mapped as concurrency token). Stale writes → `409`. For edit dialogs, reload before retry; consider `ETag`/`If-Match` only if the backend adds it — today the signal is just 409 + detail string.
- **Sorting is whitelisted** — only `title, status, priority, dueDate, createdAt` + `asc|desc`. Populate sort dropdowns from this list; never pass raw user input.

Suggested Kanban guard:

```ts
const CHAIN: Record<TaskItemStatus, number> = { Todo: 0, InProgress: 1, InReview: 2, Done: 3, Cancelled: -1 };
export function isBackwardMove(from: TaskItemStatus, to: TaskItemStatus): boolean {
  if (from === to) return false;
  if (from === 'Cancelled') return true;
  if (to === 'Cancelled') return from === 'Done';
  return (CHAIN[from] ?? -1) > (CHAIN[to] ?? -1);
}
// if (isBackwardMove(from, to) && !isOwnerOrAdmin(projectRole)) disable drop + tooltip "Requires Owner/Admin"
```

---

## 5. Suggested Angular architecture

- `src/app/core/interceptors/auth.interceptor.ts` — attach Bearer, silent refresh + single retry on 401, redirect on refresh failure.
- `src/app/core/interceptors/error.interceptor.ts` — normalize `ProblemDetails`/`ValidationProblemDetails` into `{ message, fieldErrors }`; toast on 500/429/403; special-case 409-concurrency (offer reload) and 422 (show `detail` verbatim).
- `src/app/core/services/{auth,users,projects,project-members,tasks,labels,comments}.service.ts` — one service per controller; typed `HttpClient` methods mirroring §3 tables; `tasks.service.ts` should expose `list(params)`, `getDetails`, `create`, `fullUpdate`, `patchStatus/Priority/Assignee/DueDate`, `assignLabel/removeLabel`, `listComments/createComment`.
- `src/app/core/guards/{auth.guard,project-role.guard}.ts` — `auth.guard` checks stored token + `GET /users/me`; `project-role.guard` resolves `GET /projects/{id}/members`, finds current user, checks `isBackwardMove`-style or delete permissions.
- `src/app/core/models/api.models.ts` — paste the interfaces from §2.
- Forms: reuse backend limits as validators (`maxLength`, `required`, `pattern('^#[0-9A-Fa-f]{6}$')`, custom `passwordStrength`, `dueDateNotPast`, `searchMaxLength(200)`).
- State: projects list (unpaged) can live in a signal/store; tasks list must keep `page/pageSize/totalCount/hasNextPage` from `PagedResult`; comments per task likewise.
- Dates: send `toISOString()`; display with `DatePipe` in UTC or local consistently — pick one and document it.

---

## 6. Smoke-test checklist for the agent

1. Register → login → `GET /users/me` (expect roles).
2. `POST /projects` → `GET /projects/{id}` → `PUT` with mismatched body `id` (expect `400`) → fix → `200`.
3. `POST /projects/{id}/labels` with bad color (expect `400`) → fix → `201` → `PUT /labels/{id}` → `DELETE`.
4. `POST /tasks` (active status requires due date ≥ today) → `GET /tasks/{id}` (labels array) → `PATCH status` forward → `PATCH assignee=null` → backward move as Member (expect `403/422`) → as Owner/Admin (expect `200`).
5. `POST /tasks/{id}/comments` → `PUT /comments/{id}` → `DELETE /tasks/{id}` with comments present (expect `409`) → delete comment → delete task (`204`).
6. `GET /tasks?sortBy=bogus` (expect `400`), `pageSize=1000` (expect clamp, not error), `search` > 200 chars (expect `400`).
7. Logout (`204`), then `GET /users/me` (expect `401 ProblemDetails`).

If any response diverges from this doc (property casing, extra fields, different status), re-check Scalar/OpenAPI first, then update this file — the controllers are thin and handlers own the real logic, so `400 vs 422` boundaries especially should be verified live.
