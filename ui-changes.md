# Staff Engagement — Front-End Redesign Spec

**Project:** Staff-Engagement-POC (Angular 22, standalone components, signals, SCSS, PrimeIcons)
**Goal:** A cleaner, sleeker, consistent SaaS front end across **every** route, plus the structural change of **moving the portfolio editor onto each person's Profile page** behind an explicit *Edit profile* mode.
**Status:** Spec only — no code changes here. Paths reference the real repo. A live look-and-feel prototype of the Profile screen exists at `Profile Redesign.dc.html`.

> Scope is **presentation + light restructuring**. No framework swap, no new runtime deps (one optional web font). Data models, services, and API calls are unchanged unless a screen note says otherwise.

---

## 1. What exists today (baseline)

Routes (`app.routes.ts`): `/login`, `/dashboard`, `/employees`, `/employees/:id/profile`, `/interactions`, `/tasks`, `/portfolio`, `/skills`, `/skills/:name`, `/profile` (Your details).

Current visual language: dark slate top bar (`#1f2937`), single blue accent (`#3b82f6`), grey page (`#f3f4f6`), Segoe UI, white cards with `#e5e7eb` borders at `0.75rem`, PrimeIcons. Functional but flat — inconsistent spacing, no elevation or badge system, no avatars, several screens hand-type raw employee **IDs**, and styling is duplicated per component with hard-coded hex values.

The redesign replaces that with a **token-driven system** applied uniformly, and fixes the recurring UX problems documented in `notes/frontend-ux-test-2026-06-25.md`.

---

## 2. Global design system

### 2.1 Tokens (add to `styles.scss` as `:root` custom properties — single source of truth)

```
:root {
  /* neutrals — warm-cool balanced, low saturation */
  --bg:#f7f8fa; --surface:#ffffff; --surface-2:#f1f3f6;
  --border:#e6e8ec; --text:#1a1f2b; --text-muted:#6b7280; --text-faint:#9ca3af;
  /* single accent — calm indigo */
  --accent:#4f46e5; --accent-hover:#4338ca; --accent-soft:#eef0fe;
  /* status */
  --danger:#dc2626; --danger-soft:#fef2f2; --success:#16a34a;
  --warn-bg:#fffbeb; --warn-fg:#92400e;
  /* elevation */
  --shadow-sm:0 1px 2px rgba(16,24,40,.04),0 1px 3px rgba(16,24,40,.06);
  --shadow-md:0 4px 12px rgba(16,24,40,.08);
  /* geometry / type / motion */
  --radius:12px; --radius-sm:8px; --space:8px;
  --font:'Inter','Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;
  --ease:150ms cubic-bezier(.2,.6,.3,1);
}
```

- **Type:** optionally load **Inter** (400/500/600/700) in `index.html`; otherwise keep the Segoe UI stack — everything else is unaffected. Scale: page title 22px/700, section label 12px/600 uppercase `.05em`, body 14px, meta 13px, caption 12px.
- **Spacing:** multiples of 8px; 24px page gutters and 24px vertical rhythm between page-header → content → cards.
- **Rule:** no component keeps its own hex/radius values — everything references a token.

### 2.2 Shared component patterns (define once, use everywhere)

- **Card** — `--surface`, `1px --border`, `--radius`, `--shadow-sm`, 20–24px padding.
- **Buttons** (40px tall, `--radius-sm`, 600):
    - *Primary* `--accent` bg / white → `--accent-hover`.
    - *Secondary* `--surface` / `1px --border` / `--text` → hover `--surface-2`.
    - *Ghost/link* accent text; *destructive* `--danger`.
- **Inputs / selects / textarea** — 40px, `--radius-sm`, `1px --border`, `--surface`; focus ring `0 0 0 3px rgba(79,70,229,.18)` + accent border. **Every field has a visible `<label>`** (kills the placeholder-only forms).
- **Badges** (soft pill: tinted bg + darker same-hue fg) — one canonical set:
    - Role: Employee = indigo-soft, Admin = amber-soft.
    - Level: Junior = grey, Intermediate = blue, Senior = green.
    - Interaction type: Check-in = indigo, Mentoring = sky, Catch-up = amber, Performance = violet, Other = grey. Always render with a right margin so badge + text never collide.
    - **Render labels via lookup, capitalized** ("Admin", "Senior") — never the raw wire value.
- **Avatar** — coloured-initials circle (colour hashed from name); 28–32px in bars/lists, 64px on profile header. No photo upload.
- **List row** — hover fills `--surface-2`, pointer cursor, visible focus outline; 150ms `--ease` transitions.
- **States** — every data list keeps loading / empty / error+retry, restyled to tokens (spinner in `--accent`, muted empty state, `--danger`-tinted error card with a Retry button).
- **Toast** — top-right stack for create/update/delete success + errors (already referenced in the brief; standardize the styling).
- **Modal** — centered card, `--shadow-md`, `role="dialog"` + `aria-modal` + focus trap + Escape close (Tasks modal already has the roles; apply the visual system).
- **Employee picker** — reusable searchable dropdown resolving to an employee (name shown, id wired). **Replaces every raw "Employee ID" text input** (Portfolio, Tasks, Interactions history selector).

**Deliverable:** `styles.scss` gains the tokens + base element styles; each component's SCSS is reduced to token references.

---

## 3. App shell & navigation (`shell/shell.html`, `shell.scss`)

- **Light top bar:** `--surface` bg, `1px --border` bottom, `--shadow-sm`, sticky. Brand = accent-soft icon chip + wordmark.
- **Nav:** Dashboard · Employees · Interactions · Tasks · Skills. Active item = `--accent` text on `--accent-soft` pill. **Remove the Portfolio nav item** (portfolio now lives in Profile — see §5.4).
- **User menu:** avatar chip (initials + name + chevron) → dropdown (`--radius-sm`, `--shadow-md`) with "Your details", "Profile", "Sign out". The username chip navigates to the user's **own Profile** (self-service, no id needed).
- **Logged-out:** hide the nav links on `/login` (they currently show and bounce to login).
- **Main:** max-width ~1120px, centered, 24px padding on every route.
- **Responsive:** below ~768px the nav collapses into a menu button; content goes single-column.

---

## 4. Reference prototype

The Profile screen (both **View** and **Edit** modes, with the inline portfolio editor and the new visual system) is built and interactive at **`Profile Redesign.dc.html`** — use it as the visual source of truth for tokens, spacing, badges, avatars, and form styling across the rest of the app.

---

## 5. Per-screen specs

### 5.1 Login (`/login`)
Centered card on `--bg`: brand mark, Username + Password fields (labelled, token inputs), primary "Sign in", inline error, and the session-expired / unauthorized banners restyled as soft info/warning pills. Remove the hard-coded admin prefill. Hide top-bar nav while here.

### 5.2 Dashboard (`/dashboard`) — **replace the Phase-0 stub**
Today it's placeholder text. Rebuild as a real landing page:
- **Greeting header** — "Good morning, {firstName}" + date.
- **Card grid (2×2 on desktop, stack on mobile):**
    - *My open tasks* — count + next few, each linking to `/tasks`.
    - *Recent interactions* — latest few about/by me (type badge, name, snippet, date).
    - *Top skills* — most common skills across the org (name + holder count) linking to `/skills`.
    - *Quick actions* — "Log interaction", "New task", "Edit my portfolio" (deep-links to my Profile in edit mode).
- Each data card: loading skeleton, empty state, error+retry.

### 5.3 Employees directory (`/employees`)
Becomes a **pure directory** (browse-only for non-admins):
- Header: title + **search box** (name/email/department) + **sort** dropdown; token styling.
- **Rows as cards:** avatar, full name, job title, department, level badge, role badge. Give each row a proper semantic structure (name in a heading, meta in spans) rather than one long button label. Row hover/active state is visible.
- Clicking a row opens that person's **Profile** (`/employees/:id/profile`) — no inline edit panel on this page anymore. Remove the old "Your profile" edit panel (moved to Profile / Your details); this also fixes the duplicate-DOM-ID bug.
- Pagination restyled; keep offset/limit.
- Admin-only: a delete affordance may live on the Profile edit form, not here (confirm in open questions).

### 5.4 Person profile (`/employees/:id/profile`) — **the core change**
Single place to view **and** edit a person; two modes (prototype: `Profile Redesign.dc.html`):
- **View mode (default):** identity header (avatar, name, job title, role + level badges), meta grid, Top skills chips, Interactions (type badge + note + date), Tasks (read), and **read-only Portfolio** (Skills / Education / Projects / Links).
- **Edit mode** (entered via an **Edit profile** button shown only when `canEdit()` = owner or admin): reveals the **identity edit form** *and* the **inline portfolio editor** (add/remove Skills, Education, Projects, Links). A **Done** button returns to View.
- Implementation notes:
    - `profile-page.ts`: add `editMode = signal(false)`; on load also `PortfolioStateService.loadPortfolio(id)` so view + editor share one signal.
    - `employee-detail`: add `@Input() editing`; gate the edit form on `canEdit && editing` (today it shows whenever `canEdit`).
    - Extract the portfolio editor body from `features/portfolio/portfolio.ts` into a reusable `portfolio-editor` component with `@Input() employeeId` + `@Input() readOnly` — **drop the "Employee ID" picker entirely**. Same `PortfolioStateService`, same API.
    - Non-owner/non-admin: never see Edit, editor never mounts, RBAC `isReadOnly()` remains as a backstop.
- **Remove** the standalone `/portfolio` route + component; redirect old links to the user's own Profile.
- Fold in cheap fixes: capitalized role/level labels; spacing between interaction badge and note.

### 5.5 Your details (`/profile`)
Self-service identity editor. Keep it focused on identity (`<app-employee-detail [editing]="true">`); portfolio editing happens on Profile. **Decision needed** (open question #1): keep this as a separate page, or fold it into the Profile page so there's one self-service destination.

### 5.6 Interactions (`/interactions`)
Two-column layout on desktop (form left, history right); stack on mobile.
- **Log interaction form:** Type (fixed vocabulary select), **Subject = employee picker** (all employees, searchable — replaces the 3-entry hard-coded stub), optional short "Subject/summary" text, **Facilitator = employee picker defaulting to the logged-in user**, Note textarea. All labelled, token styling.
- **History list:** each item = type badge (coloured per type) + **facilitator name** (never a raw id) + timestamp + note snippet, with **Edit** and **Create task** row actions. New entries appear immediately after logging (refresh history on success).
- **Edit interaction** and **Create-task-from-interaction** use the standard modal styling.

### 5.7 Tasks (`/tasks`)
- Header: title + primary "Create task". Rename "My Tasks" → "Tasks" (create form lets you pick a subject).
- **Task list as cards** (drop the raw table): checkbox toggle, title, description, created date, a small "from interaction" badge when spawned, and a subtask progress pill ("2/5"). Completed tasks de-emphasized; filter chips All / Open / Done with a divider.
- **Subtasks:** ordered checklist inside a task — add, toggle, rename, delete, drag-to-reorder, progress count.
- **Create modal** (already `role="dialog"`): Title, Description, **Subject = employee picker**, optional **Interaction picker** (cascading with Subject), token styling; keep the interaction-details panel when spawned. Replace the `×` close with a labelled icon button.

### 5.8 Skills register (`/skills`, `/skills/:name`)
The strongest screen already — keep the structure, apply the system:
- Search field (token input + clear) and Sort select in one toolbar row.
- **Popular skills grid** of tiles (~5/row, responsive): skill name, holder count, top holder + years/projects. Tiles are token cards with hover elevation; clicking deep-links to `/skills/:name`.
- **Ranked results list:** rank chip, person name + skill, years/projects metrics; whole row links to that person's Profile. Restyle the detail panel to match.

---

## 6. Cross-cutting

- **States everywhere:** loading skeleton/spinner, empty state, error + Retry — one styled set, on every list and dashboard card.
- **Accessibility:** visible labels on all inputs; badges/icons `aria-hidden` with text alternatives; modals trap focus + Escape; visible focus rings; unique DOM ids (the current duplicate `#fullName` etc. disappears once the Employees inline edit panel is removed).
- **Motion:** 150ms `--ease` on hover/active/expand; respect `prefers-reduced-motion`.
- **Responsive:** ≥1024 full layout; 768–1024 two-col → one-col where noted; <768 collapsed nav, single column, full-width cards.

---

## 7. Files touched (map)

| Area | Files | Change |
|---|---|---|
| Tokens/base | `styles.scss` | `:root` tokens + base element styles |
| Shell | `shell/shell.{html,scss}` | Light bar, active nav, avatar menu; **remove Portfolio nav**; username→own Profile |
| Login | `shell/login.{html,scss,ts}` | Token restyle; drop admin prefill; hide nav when logged out |
| Dashboard | `features/dashboard/dashboard.ts` | Replace stub with widget grid |
| Employees | `features/employee/**` | Directory-only; search; card rows; remove inline edit panel |
| Profile | `profile/**`, `employee-detail/**` | View/Edit modes; mount portfolio editor in edit |
| Portfolio | `features/portfolio/portfolio-editor/**` (new); delete `portfolio.ts`; `app.routes.ts` | Editor extracted with `employeeId`/`readOnly`; route removed |
| Your details | `your-details/**` | `[editing]="true"`; identity only (per §5.5) |
| Interactions | `features/interaction/**` | Employee picker; facilitator default; coloured type badges; token layout |
| Tasks | `features/task/**` | Card list; filters; subtasks; picker; modal restyle |
| Skills | `features/skills/**` | Token restyle of grid + results |
| Shared | new `avatar`, `employee-picker`, `badge`, toast/modal styling | Reusable primitives |

No backend, API, or data-model changes.

---

## 8. Open questions

1. **Your details vs Profile** — keep `/profile` as a separate identity page, or fold it into the Profile page (one self-service destination)?
2. **Type** — adopt Inter, or keep the Segoe UI system stack?
3. **Nav layout** — keep the top bar (assumed), or move to the left **sidebar** the original `LOVABLE_SPEC.md` called for?
4. **Scope/sequencing** — do you want this as one big pass, or phased: (a) design-system + shell, (b) Profile + portfolio move, (c) per-screen restyle, (d) dashboard build-out?
5. **Admin delete** — should admins get a delete-employee affordance, and where (Profile edit form)?
6. Removing `/portfolio` — **redirect** old links to the user's Profile, or 404?
