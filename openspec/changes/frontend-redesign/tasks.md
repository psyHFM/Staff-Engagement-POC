# Tasks — Frontend Redesign

Delivered in four sequenced phases: (1) design system + shell, (2) Profile + portfolio move, (3) per-screen restyle, (4) dashboard. Each phase is independently reviewable and revertable.

## 1. Phase A — Design system foundation

- [ ] 1.1 Add `:root` design tokens (neutrals, indigo accent, status, elevation, geometry, type, motion) to `styles.scss` as the single source of truth
- [ ] 1.2 Add base element styles (body/type scale, links, headings) referencing tokens; optionally load Inter (400/500/600/700) in `index.html` with the Segoe UI fallback stack
- [ ] 1.3 Define canonical Card, Button (primary/secondary/ghost/destructive, 40px, `--radius-sm`), and Input/select/textarea styles (40px, visible label, accent focus ring)
- [ ] 1.4 Add `prefers-reduced-motion` handling and standard `150ms --ease` hover/active/expand transitions
- [ ] 1.5 Write unit tests for token-driven base styles / any style helpers introduced

## 2. Phase A — Shared primitives

- [ ] 2.1 Create reusable `badge` component with canonical role/level/interaction-type variants using capitalized display-label lookups + right margin
- [ ] 2.2 Create reusable `avatar` component (coloured-initials circle, colour hashed from name; 28–32px and 64px sizes)
- [ ] 2.3 Create reusable searchable `employee-picker` component (shows name, resolves id) backed by the existing employee service
- [ ] 2.4 Standardize the toast stack styling (top-right, success/error) to tokens
- [ ] 2.5 Standardize modal styling to tokens (`role="dialog"`, `aria-modal`, focus trap, Escape close, `--shadow-md`)
- [ ] 2.6 Standardize the loading / empty / error+retry state set (spinner `--accent`, muted empty, `--danger` error card with Retry)
- [ ] 2.7 Write BDD Jest tests for badge, avatar, employee-picker, and the shared states (mutation-resilient)

## 3. Phase A — App shell & navigation

- [ ] 3.1 Restyle `shell/shell.{html,scss}` to the light sticky top bar (`--surface`, `1px --border`, `--shadow-sm`), brand chip + wordmark, centered ~1120px main with 24px padding
- [ ] 3.2 Implement active-nav pill (`--accent` text on `--accent-soft`) for Dashboard/Employees/Interactions/Tasks/Skills; remove the Portfolio nav item
- [ ] 3.3 Implement the avatar user menu (initials + name + chevron → dropdown: "Your details", "Profile", "Sign out"); username chip navigates to own Profile
- [ ] 3.4 Hide nav links on `/login`; add responsive collapse (menu button, single column) below ~768px
- [ ] 3.5 Update shell unit tests for active state, logged-out nav hiding, and user-menu navigation

## 4. Phase B — Profile view/edit + portfolio move

- [ ] 4.1 Extract the portfolio editor body from `features/portfolio/portfolio.ts` into a reusable `features/portfolio/portfolio-editor` component with `@Input() employeeId` and `@Input() readOnly`; drop the "Employee ID" picker
- [ ] 4.2 Add `editMode = signal(false)` to `profile-page.ts` and call `PortfolioStateService.loadPortfolio(id)` on load so view + editor share one signal
- [ ] 4.3 Add `@Input() editing` to `employee-detail` and gate the identity edit form on `canEdit && editing`
- [ ] 4.4 Build Profile View mode: identity header (64px avatar, name, job title, role+level badges), meta grid, Top skills chips, Interactions, read-only Tasks, read-only portfolio (`portfolio-editor` with `readOnly=true`)
- [ ] 4.5 Build Profile Edit mode: "Edit profile" button (owner-or-admin only) reveals identity form + editable `portfolio-editor`; "Done" returns to View
- [ ] 4.6 Fold `/profile` self-service into the Profile page: resolve current user from JWT subject and route to their own Profile; identity editing happens in Edit mode
- [ ] 4.7 Remove the standalone `/portfolio` route + `features/portfolio/portfolio.ts`; add a redirect from `/portfolio` to the user's own Profile in `app.routes.ts`
- [ ] 4.8 Apply cheap fixes on Profile: capitalized role/level labels and spacing between interaction badge and note
- [ ] 4.9 Port/author unit tests: portfolio-editor (add/edit/remove + read-only mode), profile view/edit gating, `/profile` fold-in, and `/portfolio` redirect

## 5. Phase C — Employees directory

- [ ] 5.1 Make `/employees` browse-only: remove the inline "Your profile"/"Your details" edit panel (fixes the duplicate DOM-id bug)
- [ ] 5.2 Add the header toolbar: search box (name/email/department) + sort dropdown, token-styled
- [ ] 5.3 Convert rows to semantic cards (avatar, name in heading, meta spans, level + role badges) with visible hover/active/focus; row links to `/employees/:id/profile`
- [ ] 5.4 Restyle pagination to tokens; keep existing offset/limit/sort query params against `GET /api/v1/employees`
- [ ] 5.5 Update employee directory unit tests (browse-only, card structure, navigation)

## 6. Phase C — Login, Interactions, Tasks, Skills restyle

- [ ] 6.1 Login: token restyle (labelled inputs, primary button, inline error, soft info/warning banners); remove admin prefill; hide top-bar nav
- [ ] 6.2 Interactions: two-column layout (form left, history right; stack on mobile); Subject + Facilitator use the employee picker with Facilitator defaulting to the logged-in user
- [ ] 6.3 Interactions: history rows show coloured type badge + facilitator name (never raw id) + timestamp + note snippet with Edit / Create-task actions; refresh history on log; modal restyle for Edit and Create-task-from-interaction
- [ ] 6.4 Tasks: rename "My Tasks" → "Tasks"; convert to card list (checkbox, title, description, created date, "from interaction" badge, subtask progress pill); add All/Open/Done filter chips; de-emphasize completed
- [ ] 6.5 Tasks: subtasks checklist (add/toggle/rename/delete/drag-reorder, progress count); Create modal uses employee picker Subject + optional interaction picker (cascading), token styling, labelled close button
- [ ] 6.6 Skills: restyle the popular-skills grid tiles (hover elevation, deep-link to `/skills/:name`) and the ranked results list (rank chip, name + skill, years/projects, row links to Profile); token toolbar (search + clear, sort select)
- [ ] 6.7 Update unit tests for Interactions (picker + facilitator default), Tasks (cards/filters/subtasks/picker), and Skills restyle

## 7. Phase D — Dashboard landing

- [ ] 7.1 Replace the `features/dashboard/dashboard.ts` stub with a greeting header ("Good morning, {firstName}" + date) and a responsive 2×2 card grid
- [ ] 7.2 Build the four widget cards: My open tasks (→ `/tasks`), Recent interactions (type badge/name/snippet/date), Top skills (holder count → `/skills`), Quick actions ("Log interaction", "New task", "Edit my portfolio" → own Profile edit mode)
- [ ] 7.3 Wire each data card to loading / empty / error+retry states
- [ ] 7.4 Write dashboard unit tests (greeting, card data states, quick-action deep-links)

## 8. Cross-cutting & verification

- [ ] 8.1 Accessibility pass: visible labels on all inputs, `aria-hidden` on decorative badges/icons with text alternatives, focus traps + Escape on modals, visible focus rings, unique DOM ids
- [ ] 8.2 Responsive pass: ≥1024 full layout; 768–1024 two-col→one-col where noted; <768 collapsed nav / single column / full-width cards
- [ ] 8.3 Confirm no component retains hard-coded hex/radius/shadow values (all reference tokens)
- [ ] 8.4 Run full frontend test suite + Stryker; meet the ≥80% mutation/coverage soft threshold
- [ ] 8.5 Verify no backend/API/data-model changes were introduced; run `/constitution-audit` and `/arch-verify`
