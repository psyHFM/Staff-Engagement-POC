## Why

The front end works but looks flat and inconsistent: styling is duplicated per component with hard-coded hex values, several screens make users hand-type raw employee **IDs**, forms are placeholder-only, and there is no shared badge/avatar/elevation system. The dashboard is still a Phase-0 stub. This change introduces a single token-driven design system applied uniformly across every route, fixes the recurring UX problems logged in `notes/frontend-ux-test-2026-06-25.md`, and makes the structural move of hosting the portfolio editor on each person's **Profile** page behind an explicit *Edit profile* mode. Scope is presentation + light restructuring — no framework swap, no backend/API/data-model changes.

## What Changes

- **Design system** — add `:root` design tokens (neutrals, single indigo accent, status colours, elevation, geometry, type, motion) to `styles.scss` as the single source of truth; adopt Inter with the Segoe UI stack as fallback. Define canonical shared patterns once: Card, Buttons, Inputs/labels, Badges (role/level/interaction-type), Avatar (initials), List row, loading/empty/error+retry states, Toast, Modal, and a reusable **employee picker** that replaces every raw "Employee ID" text input.
- **App shell & nav** — light sticky top bar, active-nav pill, avatar user menu (username → own Profile). **Remove the Portfolio nav item.** Hide nav on `/login`. Responsive collapse below ~768px.
- **Profile page (core change)** — `/employees/:id/profile` becomes the single place to view **and** edit a person: View mode (identity, top skills, interactions, tasks, read-only portfolio) and Edit mode (identity form + inline portfolio editor), gated on owner-or-admin. **Fold self-service `/profile` (Your details) into the Profile page** so there is one self-service destination.
- **Portfolio restructure** — extract the portfolio editor into a reusable `portfolio-editor` component (`@Input() employeeId`, `@Input() readOnly`), mounted in Profile edit mode; **drop the raw "Employee ID" picker**. **BREAKING**: remove the standalone `/portfolio` route + component and redirect old links to the user's own Profile.
- **Dashboard** — replace the stub with a real landing page: greeting header + widget grid (My open tasks, Recent interactions, Top skills, Quick actions), each with loading/empty/error states.
- **Employees directory** — becomes browse-only for non-admins: search + sort toolbar, semantic card rows (avatar, name, job title, department, level/role badges), row → Profile. Remove the inline edit panel (also fixes the duplicate DOM-id bug).
- **Per-screen restyle** — apply the system to Login, Interactions (employee-picker subject, facilitator defaults to logged-in user, coloured type badges), Tasks (card list, filters, subtasks, picker + modal restyle), and Skills (token grid + ranked results).
- **Cross-cutting** — consistent loading/empty/error+retry set on every list and card; accessibility (visible labels, focus traps, unique ids, focus rings); `150ms --ease` motion respecting `prefers-reduced-motion`; responsive breakpoints.

No admin delete-employee affordance is included (kept out of scope).

## Capabilities

### New Capabilities
- `design-system`: token-driven visual foundation (`:root` tokens + base element styles) and the canonical shared component patterns — card, buttons, inputs/labels, badges, avatar, list row, data-list states, toast, modal, and the reusable employee picker.
- `app-shell-redesign`: restyled light top bar, active-nav pills, avatar user menu, logged-out nav hiding, responsive collapse, and removal of the Portfolio nav entry.
- `profile-view-edit`: the Profile page as the single view/edit destination for a person — View/Edit modes, owner-or-admin gating, hosting the identity form and inline portfolio editor, and absorbing the self-service Your-details flow.
- `dashboard-landing`: real dashboard landing page with greeting header and the widget grid (open tasks, recent interactions, top skills, quick actions).

### Modified Capabilities
- `portfolio-ui`: portfolio editing moves into a reusable `portfolio-editor` mounted on the Profile page; the standalone `/portfolio` route/component is removed and old links redirect to the user's Profile (**BREAKING**).
- `employee-directory`: directory becomes browse-only with search/sort, semantic card rows and badges; the inline self-edit panel is removed and rows navigate to the Profile page.
- `your-details-route`: self-service Your-details is folded into the Profile page; the standalone `/profile` identity page is retired as a separate destination (**BREAKING**).

## Impact

- **Frontend (presentation + light restructuring only):**
  - `styles.scss` — new `:root` tokens + base element styles; `index.html` — optional Inter web font.
  - `shell/shell.{html,scss}`, `shell/login.{html,scss,ts}`.
  - `features/dashboard/**` (rebuild), `features/employee/**` (directory-only), `profile/**` + `features/employee/employee-detail/**` (view/edit modes), `your-details/**` (fold-in).
  - `features/portfolio/portfolio-editor/**` (new) — delete `features/portfolio/portfolio.ts`; `app.routes.ts` (remove `/portfolio`, redirect; fold `/profile`).
  - `features/interaction/**`, `features/task/**`, `features/skills/**` (token restyle + picker wiring).
  - New shared primitives: `avatar`, `employee-picker`, `badge`, plus standardized toast/modal styling.
- **No backend, API, or data-model changes.** Existing services, signals, and REST calls are reused unchanged.
- **Routing (BREAKING for deep links):** `/portfolio` removed (redirect to own Profile); `/profile` folded into the Profile page.
- **Constitution alignment:** Angular 22 standalone + signals + unidirectional state (`frontend-state.yaml`); kebab-case component conventions; unit tests only (Jest/Stryker) — no integration tests.
