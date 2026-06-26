# Frontend UX Intuitiveness Walkthrough — 2026-06-25

> Working notes from a Playwright walkthrough of every route/tab/button and a CRUD pass per domain.
> Issues are tagged by severity and seeded as Jira tickets at the bottom.

**Stack**: Angular 22 frontend on http://localhost:4200, Spring Boot backend on :8080, Postgres in docker.
**Login**: `admin@staff.eng` / `staffeng` (prefilled in the login form).
**Routes walked**:
- `/login`
- `/dashboard`
- `/employees` (own profile + directory)
- `/employees/:id/profile`
- `/interactions`
- `/tasks`
- `/portfolio`
- `/skills`

**Domain entities** (Employee, Interaction, Task, Portfolio, Skill) — CRUD matrices below.

**Legend**: 🔴 blocker · 🟠 major · 🟡 minor · 🟢 nice-to-have

---

## Per-page findings

### 🔴 Auth — login (`/login`)

1. **🟠 Major — Nav links visible while logged-out**: The header (Dashboard, Employees, …) is rendered on the login page; clicking them bounces back to `/login`. Either hide them while logged out or `aria-disabled` them so the affordance doesn't lie.
2. **🟡 Minor — Logout redirects to `/login` with no `redirectUrl` query param**: After `Sign out`, the user lands on a blank login. Auth guard normally appends `?redirectUrl=…`; logout should pass the original URL so a re-login jumps back.
3. **🟡 Minor — Hard-coded admin prefill leaks a privileged account**: `Login.ts` hard-codes `username = 'admin@staff.eng'`. Fine for the POC demo but a leakage in any non-demo deploy.

### 🔴 Auth — session persistence

4. **🟠 Major — No JWT persistence**: `AuthState` keeps the token in a `signal()` only. Any full page navigation (refresh, opening a deep link) wipes the session and bounces the user to `/login`. Either persist to `sessionStorage` or rebuild the session from `refresh-token` on app bootstrap.

### 🟠 Dashboard (`/dashboard`)

5. **🔴 Blocker — Empty placeholder, no actionable content**: Dashboard is still the Phase 0 stub ("Feature modules arrive in Phases 1–5") even though all six features exist. There's nothing for an admin or HR user to do on landing. Replace with at least: my open tasks, recent interactions, employees with overdue check-ins, top skills.

### 🟠 Employees (`/employees`)

6. **🟠 Major — Two forms share duplicate DOM IDs** (`#fullName`, `#jobTitle`, `#department`, `#level`, `#role`): The "Your profile" panel and the selected-row "Edit profile" panel both render `<input id="fullName">` etc. Breaks autofill, screen-reader label association, and Playwright strict-mode targeting.
7. **🟠 Major — Clicked directory row has no visible "active" state**: A `<button class="employee-list__select">` looks identical before and after click; only the panel below changes. Need a clear `--active`/`aria-expanded` style so users can tell which row is open.
8. **🟠 Major — Detail opens inline below the list, not in a side drawer/modal**: For 5 rows it's fine; for 50 it pushes the directory far off-screen. Consider a side panel or modal.
9. **🟠 Major — Long button accessible-name**: Row buttons concatenate name + email + role + job title + department + level as a single accessible label ("Bob Developer bob@staff.eng employee Senior Frontend Engineer Platform senior"). Break out the visible text into semantic spans and use `aria-label` for the button, or use a non-button element for the row.
10. **🟡 Minor — No search/filter on directory**: With 5 seeded rows it's fine; with 1000 it isn't. Either add a name/email/department filter, or hide pagination until needed.
11. **🟡 Minor — Sort selector is the only filter; no combined search-then-sort affordance**.
12. **🟠 Major — Admin can edit any row but the form has no `Delete` button**: The API presumably supports it (or should); the UI has no delete affordance at all. Even an admin cannot remove an employee from the directory.
13. **🟡 Minor — `← Dashboard` back-link lives in the page header on every feature; easy to confuse with `← Back to directory` inside the Employees page**. Differentiate by context.

### 🟠 Employee Profile (`/employees/:id/profile`)

14. **🟠 Major — Role label is lowercase ("admin")**: Headers everywhere render the JWT/wire form. Render with `EMPLOYEE_ROLES` lookup so it reads "Admin" / "Employee".
15. **🟡 Minor — Interaction rows run type + note together**: `check-incatch up` — no whitespace between badge and note. Style the badge with `margin-right`.
16. **🟡 Minor — Profile shows no "view as user / switch employee" affordance for admins**.

### 🟠 Interactions (`/interactions`)

17. **🔴 Blocker — `Facilitator: 1`** (`interaction-list.html:27`): Renders the raw numeric id. **This is the exact "ID vs name" anti-pattern the user flagged.** Show the facilitator's full name; if unknown, "Unknown" rather than a number.
18. **🔴 Blocker — Subject dropdown shows fake employees**: `InteractionStateService.availableSubjects` is a **hardcoded stub** (`Admin User`, `Employee User`, `Alice Smith` mapped to ids 1, 2, 3) — but the seeded DB has ids 1, 47, 48, 49, 50. Picking "Employee User" → 404 ("Subject employee not found: 2"). Replace the stub with `GET /api/v1/employees` so the dropdown shows real people.
19. **🟠 Major — No interaction timestamp in history list**: Each row shows type + facilitator + note but no `createdAt`. Users can't tell "last week" vs "yesterday" at a glance.
20. **🟠 Major — Subject selector duplicated**: There's a top-of-page "Employee" `<select>` *and* a "Subject" `<select>` inside the Log interaction form. Pick one (drop the top one, since it's already inside the form).
21. **🟡 Minor — Top-of-page selector labelled "Employee"** (not "Subject"). Ambiguous — Employee *of what*? Rename to "Subject" or "Employee (for history)".
22. **🟡 Minor — Interaction type badge has no color/style differentiation** between `check-in`, `mentoring`, `catch-up`, etc. All five render in the same chip style.
23. **🟡 Minor — `defaultFacilitator()` returns `{value: 2}` for non-admin** but no employee with id 2 exists; will 404 as soon as the form is used.

### 🔴 Tasks (`/tasks`)

24. **🔴 Blocker — Tasks API returns 500 for admin** (`GET /api/v1/me/tasks`, `POST /api/v1/tasks`): Both endpoints respond `500 Internal Server Error — Access Denied` even with the admin JWT. Suspect either a Spring Security misconfig or the controller is `@PreAuthorize("hasRole('USER')")` while the JWT carries `roles: [ADMIN]`. See backend logs.
25. **🔴 Blocker — `task` table has no `title` column** (only `description`): The Angular form has Title + Description; the backend stores only description. The Title input is dead. Schema and FE model must agree.
26. **🔴 Blocker — "Subject (Employee ID)" text input asks for an ID** (`task-create-form.html:32`): The user must hand-type `EMP-123` / `1`. Replace with an employee dropdown backed by `GET /api/v1/employees`. **This is the second "ID vs name" anti-pattern.**
27. **🟠 Major — Page title "My Tasks" implies personal ownership**, but the create form asks you to specify a Subject. Contradicts the page's own framing. Either rename to "Tasks" or default the Subject to the current user.
28. **🟠 Major — Modal lacks `role="dialog"` / `aria-modal="true"` / focus trap**: When the Create Task modal opens it is not announced to screen readers. Add ARIA roles and Escape-key dismissal.
29. **🟡 Minor — Close button is a Unicode `×`** — works but unclear in some fonts.
30. **🟡 Minor — Task card shows `Created: Jun 25` but no due-date or assignee** — UX could be richer, but at minimum a "for:" / "assigned to:" field should match the Subject selector.
31. **🟡 Minor — Completed tasks have no visual divider between active and completed lists**.

### 🔴 Portfolio (`/portfolio`)

32. **🔴 Blocker — Free-text "Employee ID" input, defaulting to id 1** (`portfolio.ts:23,135`): Users must hand-type the employee id. **This is the third "ID vs name" anti-pattern** and arguably the worst because the default of `1` silently loads the admin's portfolio. Replace with an employee dropdown backed by `GET /api/v1/employees`.
33. **🟠 Major — No employee name/header shown**: Once you "Load" id 47 you see the skills list but no "Alice Manager" header. Add the employee name + email.
34. **🟠 Major — Form fields rely on placeholder text only**: `placeholder="Skill (e.g. Angular)"` is the *only* label. Add a visible `<label>` (or `aria-label`).
35. **🟡 Minor — Numbers ("Years", "Projects") accept negative numbers or text** (`<input type="number">` *does* constrain in browsers but no min=0 in markup; messages no help).
36. **🟡 Minor — "Add" buttons (Add skill / Add education / …) have no loading state** while the API round-trips.
37. **🟡 Minor — `remove` button on each entry is a plain red text link**; easy to mis-click. Add a confirmation step.

### 🟢 Skills (`/skills`)

38. **🟢 This is the page that nails it.** Search-by-skill, clear summary, ranked list, "X year(s) / Y project(s)" metrics, working Clear button. The only nit: the rank badge "1" / "2" / "3" is decorative — consider showing the actual strength score (years × projects).
39. **🟡 Minor — Empty result message says `No one found with skill "<query>"`** — works for English pluralisation but no localization hook.

---

## Cross-cutting / framework findings

40. **🟠 Major — `AuthState` signal-only persistence** (see #4 above) affects every page.
41. **🟠 Major — No skeleton loaders / spinners during SPA navigation**: A click on "Employees" while the directory is loading shows nothing for ~200ms. Already have a spinner on the Employees page but not globally.
42. **🟠 Major — No global error toast / 401 interceptor**: If a session expires the user sees the raw `ApiError: Access Denied` console error and a stuck page. Should redirect to `/login?redirectUrl=…` with a "Your session expired" message.
43. **🟠 Major — `InteractionType` values are wired-form kebab-case** (`check-in`, `mentoring`) and rendered as-is. After capitalisation fix this is OK, but `Other` should probably be `Other (please specify)` or removed.
44. **🟡 Minor — PrimeIcons icons are referenced via `<i class="pi pi-…">`** with no `<span aria-hidden>` semantics. Mostly fine (we set `aria-hidden="true"` in several places), but inconsistent.

---

## CRUD matrix — what works and what doesn't

| Entity    | Create (UI) | Read (UI) | Update (UI) | Delete (UI) | Backend reachable |
|-----------|-------------|-----------|-------------|-------------|-------------------|
| Employee  | ✅ (own)     | ✅        | ✅ (own + admin) | ❌ none | ✅ |
| Interaction | ⚠️ dropdown broken (#18) | ✅ | n/a | n/a | ✅ |
| Task      | ❌ 500 / schema drift (#24,#25) | ❌ 500 | ⚠️ checkbox untested | ❌ none | ❌ 500 |
| Portfolio | ❌ needs ID (#32) | ✅ | ⚠️ add/remove work via API | ⚠️ remove works | ✅ |
| Skill (search) | n/a | ✅ | n/a | n/a | ✅ |

---

## Jira ticket seeds (one issue per ticket)

Suggested component / label / priority:

| # | Type | Priority | Title | File |
|---|------|----------|-------|------|
| 1 | Bug | High | Employee: editing detail panel open inline below list with no visible "active row" indicator | `employee-list.html`, `employee-list.scss` |
| 2 | Bug | High | Employee page renders duplicate `#fullName` / `#jobTitle` / `#department` / `#level` / `#role` IDs (Your-profile + selected-row forms) | `employee-detail.html`, `employee.html` |
| 3 | Story | High | Replace hardcoded Interaction subject dropdown with `GET /api/v1/employees` | `interaction-state.service.ts` |
| 4 | Bug | High | Interaction history renders `Facilitator: 1` (raw id) — show facilitator full name | `interaction-list.html:27` |
| 5 | Story | High | Tasks: replace "Subject (Employee ID)" text input with an employee picker | `task-create-form.html`, `task-state.service.ts` |
| 6 | Bug | Critical | Tasks API returns 500 "Access Denied" for admin (`/api/v1/me/tasks`, `/api/v1/tasks`) — backend investigation | backend controller |
| 7 | Bug | Critical | `task` DB table missing `title` column (FE form has Title field) — schema drift | backend changelog |
| 8 | Story | High | Portfolio: replace "Employee ID" free-text with employee dropdown + show loaded employee name + email | `portfolio.ts`, `portfolio.html` |
| 9 | Story | High | Dashboard: replace Phase 0 stub with actionable widgets (my open tasks, recent interactions, overdue check-ins, top skills) | `dashboard.ts` |
| 10 | Story | Medium | Persist JWT to sessionStorage so refresh / deep-link doesn't kick to `/login` | `auth-state.ts` |
| 11 | Bug | Medium | Interactions page duplicates the subject selector (top-of-page + inside Log form) — pick one | `interaction-page.html`, `log-interaction.html` |
| 12 | Bug | Medium | Interaction history shows no `createdAt` timestamp per row | `interaction-list.html` |
| 13 | Bug | Medium | Role badge rendered lowercase (`admin`) — capitalize in FE (use EMPLOYEE_ROLES lookup) | `profile-page.html`, `employee-list.html`, `employee-detail.html` |
| 14 | Bug | Medium | Profile interaction rows render type + note as single text blob (`check-incatch up`) | `profile-page.html` |
| 15 | Story | Medium | Global 401/session-expired interceptor → redirect to `/login?redirectUrl=…` with message | `bearer-auth.interceptor.ts`, `auth-state.ts` |
| 16 | Bug | Medium | Employees: admins have no Delete affordance | `employee-detail.html` |
| 17 | Accessibility | Medium | Task create modal has no `role="dialog"`, `aria-modal`, focus trap, or Escape-key close | `task-create-form.ts` |
| 18 | Bug | Medium | Header nav links visible on `/login` while logged-out — clicking them redirects to login | `shell.html` |
| 19 | Story | Low | Portfolio: visible `<label>` on add-form fields (currently placeholder-only) | `portfolio.ts` template |
| 20 | Story | Low | Portfolio: confirm-before-remove on each entry | `portfolio.ts` |
| 21 | Bug | Low | Logout redirects to `/login` without `redirectUrl` query param | `shell.ts` |
| 22 | Bug | Low | Login form hard-codes `admin@staff.eng` prefilled (leaks admin email) | `login.ts` |
| 23 | Story | Low | Employees: search/filter on directory | `employee-list.html`, `employee-state.service.ts` |
| 24 | Story | Low | Employee directory row button has overly long accessible-name (concatenates all fields) | `employee-list.html` |

---

## Test approach used

- Brought up the stack with `docker compose -p staff-poc up -d --build` (postgres-healthy, backend & frontend up).
- Probed `http://localhost:4200/` → 200, `http://localhost:8080/...` → 401 unauthenticated (expected).
- Logged in as `admin@staff.eng` via the prefilled login form.
- Used Playwright MCP to navigate each route via in-page nav links (avoid full-page navigation so the in-memory JWT survives).
- For each page: take a11y snapshot, exercise every button / form / select, observe console errors, repeat key API calls via `curl` with the JWT to isolate FE vs BE.
- Inspected the rendered DOM with `browser_evaluate` to confirm IDs, classes, and absence of active styling.

## Notes / gotchas

- **DO NOT use `browser_navigate()` to a new URL once logged in**: it does a full page reload, wipes the in-memory JWT, and redirects to `/login`. Click the in-page `<a routerLink>` links instead.
- The Phase-2 task migration (`seed-005-tasks-v7`) failed in an earlier run because the `task` table migration was missing — see `failure_logs.txt`. The schema is now in place but the API controller is broken.

---

## User-supplied UX notes (added 2026-06-25 PM)

These came in as a free-form review after the first pass. Each item is expanded into structured tickets below.

### General

- **G1.** Refresh logs me out. Persisting the JWT (Ticket #10) is the same root cause; treat as a top user complaint.

### Employees / Profile

- **E1.** The "Your profile" section should be **renamed to "Your details"** and **moved off the `/employees` page**.
- **E2.** A click on `.shell__user` (the username chip in the header) should navigate to the user's own **Profile page** (the existing `/employees/:id/profile` route, but reachable by self-service without knowing the id).
- **E3.** As a consequence, **`/employees` becomes a pure directory**. Non-admins cannot edit any record from there — they go to their own Profile (via E2) to edit their own; admins can still open a directory row and edit.
- **E4.** Show that the directory is read-only for non-admins (visual cue + remove the "Edit profile" affordance entirely).

### Interactions

- **I1.** The **Employee dropdown on Interactions must list *all* employees** (scrollable, paginated if many). Today it's a 3-entry hardcoded stub (`Admin User`, `Employee User`, `Alice Smith`) tied to ids 1/2/3 that don't match the real seeded DB.
- **I2.** **Subject** field should be a short text input (free-text note). It currently duplicates the dropdown.
- **I3.** **Facilitator** should default to the **logged-in user** automatically (resolver already exists, but it returns id 2 for `employee@staff.eng` which 404s — fix the resolver, and pre-select it on form mount).
- **I4.** **New interaction appears in history immediately** after Log interaction is pressed — no manual refresh. Today the form submits and the success toast appears but the history list isn't always refreshed; ensure `loadHistory()` is called on success.
- **I5.** **Each interaction item in history should be editable** (edit type, note, timestamp? probably not the timestamp; allow type and note). Provide inline edit or a side drawer.
- **I6.** **Create a Task from an Interaction without leaving the page.** Add a "Create task" affordance on each history row that opens a small inline task form prefilled with `subjectId` (from the interaction's subject) and `sourceInteractionId` (the interaction id).

### Tasks

- **T1.** Tasks need **Employee dropdown** (name shown, id wired internally — names vs IDs requirement from the original brief).
- **T2.** Tasks need **Interaction dropdown** (interaction subject-name + note shown, id wired internally).
- **T3.** **Cascading filters**: if you pick Employee A first, the Interaction dropdown should only show interactions whose subject = A. Conversely, picking Interaction B first should pin the Employee dropdown to B's subject.
- **T4.** **Subtasks** — convert each task into a checklist / sub-items (similar to a shopping-list inside the task). Use a separate `task_item` (or `subtask`) table with `completed` flag.
- **T5.** **CRITICAL bug** — tasks don't show up after creation; even after reload/refresh nothing appears. Likely root cause is `POST /api/v1/tasks` returning 500 (Ticket #6) and `task` table missing `title` column (Ticket #7). Cover this end-to-end: fix API, fix schema, then verify the UI reloads the task list on success.

### Portfolio

- **P1.** **Non-admins can only edit their own portfolio.** They should still be able to **view** other people's portfolios (read-only).
- **P2.** **Admins can edit any portfolio** (probably — confirm with PO; today it's open to all which violates least-privilege).
- **P3.** **Bug — can't add multiple of anything** (skills, education, projects, links). Reproduce: type one Angular skill, hit Add skill → succeeds. Type another, hit Add skill → silently fails or appends then clears. Likely the form clears the input on submit but the "Add" button only fires if the model is reset before the second submit; or the `state.addSkill` mutates state directly instead of going through the reducer.
- **P4.** UX should be: **`Add another (Skill)`** to keep the form open and append, **`Save`** to commit the current one and close. Today there's only one "Add skill" button per section.

### Skills

- **S1.** Show a **browseable list/grid of all skills** (5-per-row card layout suggested). Each card = the same skill-summary tile that appears when you search ("Admin User, Angular, 6 yrs, 4 projects" — but only the head + count of people).
- **S2.** **Sort options**: Alphabetical (A–Z / Z–A) and **Most popular** (ranked by number of employees who list it).
- **S3.** **Keep the existing search** alongside the grid.
- **S4.** **Click a tile** → opens the same detail view as a search result (skill + ranked employee list).
- **S5.** Bug — the skills page "isn't working right now". Need to confirm current state; candidate issues from earlier walkthrough: the hardcoded `[ngValue]="null"` for Level "—" option, the search may not debounce and could hammer the API.

---

## Updated ticket backlog (with new items 25–45)

(Existing tickets 1–24 are unchanged and remain in the table above this section.)

| # | Type | Priority | Title | Source |
|---|------|----------|-------|--------|
| 25 | Story | High | Rename "Your profile" → "Your details" and remove from `/employees`; route to `/profile` instead | E1 |
| 26 | Story | High | Make `.shell__user` clickable → navigates to logged-in user's Profile page | E2 |
| 27 | Story | High | `/employees` becomes a pure directory (no per-row edit form for non-admins) | E3, E4 |
| 28 | Story | High | Interactions: replace hardcoded 3-entry subject dropdown with paginated/scrollable list from `GET /api/v1/employees` | I1, supersedes #3 |
| 29 | Story | High | Interactions: replace top-of-page subject dropdown with a short Subject text input | I2, related to #11 |
| 30 | Bug | High | `defaultFacilitator()` returns id 2 for non-admin; non-admin cannot log interactions because id 2 doesn't exist | I3, related to #18 |
| 31 | Bug | High | Interactions: history list not refreshed after a successful create | I4 |
| 32 | Story | Medium | Interactions: make each history row editable (edit type + note inline) | I5 |
| 33 | Story | High | Interactions: add "Create task from this interaction" inline action (no tab switch) | I6 |
| 34 | Story | High | Tasks: replace ID text input with Employee dropdown (names shown, id wired internally) | T1, supersedes #5 |
| 35 | Story | High | Tasks: add Interaction dropdown (subject name + note shown, id wired) | T2 |
| 36 | Story | Medium | Tasks: cascading filters — Employee ↔ Interaction | T3 |
| 37 | Story | Medium | Tasks: support subtasks / checklist items | T4 |
| 38 | Bug | Critical | Tasks don't appear after creation; even reload doesn't show them (likely API 500 + schema drift) | T5, related to #6, #7 |
| 39 | Bug | High | Portfolio: can't add more than one entry per section | P3 |
| 40 | Story | Medium | Portfolio: split "Add another" (keep form open) vs "Save" (commit + close) buttons | P4 |
| 41 | Story | Medium | Portfolio: enforce "edit own only" RBAC; non-admins see other portfolios read-only | P1, P2 |
| 42 | Story | High | Skills: add browseable grid of all skills (card tile, 5-per-row) | S1 |
| 43 | Story | Medium | Skills: add sort controls (Alphabetical A–Z/Z–A, Most popular by employee count) | S2 |
| 44 | Story | Low | Skills: tile click opens the same detail view as a search result | S4 |
| 45 | Bug | Medium | Skills: investigate "not working" state from user report | S5 |
