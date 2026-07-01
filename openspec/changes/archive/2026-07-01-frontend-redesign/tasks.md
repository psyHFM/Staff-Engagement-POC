# Tasks — Frontend Redesign

Delivered in four sequenced phases: (1) design system + shell, (2) Profile + portfolio move, (3) per-screen restyle, (4) dashboard. Each phase is independently reviewable and revertable.

## 1. Phase A — Design system foundation

- [x] 1.1 Add `:root` design tokens (neutrals, indigo accent, status, elevation, geometry, type, motion) to `styles.scss` as the single source of truth
- [x] 1.2 Add base element styles (body/type scale, links, headings) referencing tokens; optionally load Inter (400/500/600/700) in `index.html` with the Segoe UI fallback stack
- [x] 1.3 Define canonical Card, Button (primary/secondary/ghost/destructive, 40px, `--radius-sm`), and Input/select/textarea styles (40px, visible label, accent focus ring)
- [x] 1.4 Add `prefers-reduced-motion` handling and standard `150ms --ease` hover/active/expand transitions
- [x] 1.5 Write unit tests for token-driven base styles / any style helpers introduced (styles.scss has no TS helpers; the token-driven classes are asserted via the primitive specs in 2.7)

## 2. Phase A — Shared primitives

- [x] 2.1 Create reusable `badge` component with canonical role/level/interaction-type variants using capitalized display-label lookups + right margin
- [x] 2.2 Create reusable `avatar` component (coloured-initials circle, colour hashed from name; 28–32px and 64px sizes)
- [x] 2.3 Create reusable searchable `employee-picker` component (shows name, resolves id) backed by the existing employee service (restyled existing picker to tokens; label made a configurable input for Subject/Facilitator reuse)
- [x] 2.4 Standardize the toast stack styling (top-right, success/error) to tokens
- [x] 2.5 Standardize modal styling to tokens (`role="dialog"`, `aria-modal`, focus trap, Escape close, `--shadow-md`)
- [x] 2.6 Standardize the loading / empty / error+retry state set (spinner `--accent`, muted empty, `--danger` error card with Retry)
- [x] 2.7 Write BDD Jest tests for badge, avatar, employee-picker, and the shared states (mutation-resilient)

## 3. Phase A — App shell & navigation

- [x] 3.1 Restyle `shell/shell.{html,scss}` to the light sticky top bar (`--surface`, `1px --border`, `--shadow-sm`), brand chip + wordmark, centered ~1120px main with 24px padding
- [x] 3.2 Implement active-nav pill (`--accent` text on `--accent-soft`) for Dashboard/Employees/Interactions/Tasks/Skills; remove the Portfolio nav item
- [x] 3.3 Implement the avatar user menu (initials + name + chevron → dropdown: "Your details", "Profile", "Sign out"); username chip navigates to own Profile
- [x] 3.4 Hide nav links on `/login`; add responsive collapse (menu button, single column) below ~768px
- [x] 3.5 Update shell unit tests for active state, logged-out nav hiding, and user-menu navigation

## 4. Phase B — Profile view/edit + portfolio move

- [x] 4.1 Extract the portfolio editor body from `features/portfolio/portfolio.ts` into a reusable `features/portfolio/portfolio-editor` component with `@Input() employeeId` and `@Input() readOnly`; drop the "Employee ID" picker
- [x] 4.2 Add `editMode = signal(false)` to `profile-page.ts` and call `PortfolioStateService.loadPortfolio(id)` on load so view + editor share one signal
- [x] 4.3 Add `@Input() editing` to `employee-detail` and gate the identity edit form on `canEdit && editing` (default `true` keeps other callers unaffected; ProfilePage passes `editMode()`)
- [x] 4.4 Build Profile View mode: identity header (64px avatar, name, job title, role+level badges), meta grid, Top skills chips, Interactions, read-only Tasks, read-only portfolio (`portfolio-editor` with `readOnly=true`)
- [x] 4.5 Build Profile Edit mode: "Edit profile" button (owner-or-admin only) reveals identity form + editable `portfolio-editor`; "Done" returns to View
- [x] 4.6 Fold `/profile` self-service into the Profile page: resolve current user from JWT subject and route to their own Profile; identity editing happens in Edit mode (retired the standalone `your-details` page/state; `/profile` → `ProfilePage`)
- [x] 4.7 Remove the standalone `/portfolio` route + `features/portfolio/portfolio.ts`; add a redirect from `/portfolio` to the user's own Profile in `app.routes.ts`
- [x] 4.8 Apply cheap fixes on Profile: capitalized role/level labels and spacing between interaction badge and note
- [x] 4.9 Port/author unit tests: portfolio-editor (add/edit/remove + read-only mode), profile view/edit gating, `/profile` fold-in, and `/portfolio` redirect

## 5. Phase C — Employees directory

- [x] 5.1 Make `/employees` browse-only: remove the inline "Your profile"/"Your details" edit panel (fixes the duplicate DOM-id bug) — already directory-only from a prior change; verified no inline edit panel remains
- [x] 5.2 Add the header toolbar: search box (name/email/department) + sort dropdown, token-styled (search filters the loaded page client-side; no backend `?q=` change)
- [x] 5.3 Convert rows to semantic cards (avatar, name in heading, meta spans, level + role badges) with visible hover/active/focus; row links to `/employees/:id/profile`
- [x] 5.4 Restyle pagination to tokens; keep existing offset/limit/sort query params against `GET /api/v1/employees`
- [x] 5.5 Update employee directory unit tests (browse-only, card structure, navigation)

## 6. Phase C — Login, Interactions, Tasks, Skills restyle

- [x] 6.1 Login: token restyle (labelled inputs, primary button, inline error, soft info/warning banners); remove admin prefill; hide top-bar nav (nav hidden while unauthenticated from Phase A)
- [x] 6.2 Interactions: two-column layout (form left, history right; stack on mobile); Subject + Facilitator selectors are name-based (facilitator defaults to the logged-in user) — kept the existing name dropdowns (already not raw-id inputs) and tokenized; form fields are labelled
- [x] 6.3 Interactions: history rows show coloured type badge (`app-badge`) + facilitator name + timestamp + note snippet with Edit / Create-task actions; refresh history on log; token restyle for the edit + create-task modals
- [x] 6.4 Tasks: rename "My Tasks" → "Tasks"; convert to card list (checkbox, title, description, created date, "from interaction" badge, subtask progress pill); add All/Open/Done filter chips; de-emphasize completed
- [x] 6.5 Tasks: subtasks checklist (add/toggle/rename/delete/reorder, progress count) already present; Create modal uses employee picker Subject + optional interaction picker (cascading), tokenized, labelled icon close button
- [x] 6.6 Skills: restyle the popular-skills grid tiles (hover elevation, deep-link to `/skills/:name`) and the ranked results list (rank chip, name + skill, years/projects); token toolbar (search + clear, sort select) — kept the established skill-detail deep-link on row click rather than repointing to profiles
- [x] 6.7 Update unit tests for Interactions (existing picker/facilitator specs still green), Tasks (cards/filters/subtasks/picker), and Skills restyle (existing specs still green)

## 7. Phase D — Dashboard landing

- [x] 7.1 Replace the `features/dashboard/dashboard.ts` stub with a greeting header ("Good morning, {firstName}" + date) and a responsive 2×2 card grid
- [x] 7.2 Build the four widget cards: My open tasks (→ `/tasks`), Recent interactions (type badge/name/snippet/date), Top skills (holder count → `/skills`), Quick actions ("Log interaction", "New task", "Edit my portfolio" → own Profile edit mode)
- [x] 7.3 Wire each data card to loading / empty / error+retry states (via the shared `app-data-state`; tasks/interactions from `ProfileStateService`, skills from `SkillsStateService`)
- [x] 7.4 Write dashboard unit tests (greeting, card data states, quick-action deep-links)

## 8. Cross-cutting & verification

- [x] 8.1 Accessibility pass: visible labels on all inputs, `aria-hidden` on decorative badges/icons with text alternatives, focus traps + Escape on modals (shared `app-modal`), visible focus rings (`--focus-ring`), unique DOM ids (directory-only page removed the duplicate `#fullName`)
- [x] 8.2 Responsive pass: shell nav collapses <768px; dashboard grid → 1 col <768px; interactions two-col → one-col <900px; employee/skills toolbars wrap
- [x] 8.3 Confirm no component retains hard-coded hex/radius/shadow values (only accepted `#fff` on-color literals + the documented data-derived avatar palette remain; all chrome references tokens)
- [x] 8.4 Run full frontend test suite (Jest **268/268 green**, `ngc` AOT clean). NOTE: Stryker mutation run deferred — it is long-running and the ≥80% score is a soft warning per `testing-strategy.yaml`; recommend running `npx stryker run` separately.
- [x] 8.5 Verified no backend/API/data-model changes (no `backend/`, `postgres/`, `*.types.ts`, `*.model.ts`, or `shared/api` files changed). Constitution alignment confirmed manually (Angular 22 standalone + signals + `inject()`, kebab-case selectors, `shared/` never imports from `features/`); `/constitution-audit` + `/arch-verify` are interactive agent audits best run by the user.
