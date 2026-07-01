## Context

The Angular 22 front end (standalone components, signals, SCSS, PrimeIcons) is functional but visually flat and inconsistent. Styling is duplicated per component with hard-coded hex values, several screens make users type raw employee **IDs**, forms are placeholder-only, and there is no shared badge/avatar/elevation system. The dashboard is still a Phase-0 stub. `ui-changes.md` is the authoritative brief for this work, and `Profile Redesign.dc.html` is the interactive visual source of truth for the Profile screen (View + Edit modes, inline portfolio editor, tokens, badges, avatars, form styling).

Constraints (from the constitution): Angular 22 standalone + Signals only, `toSignal()` RxJS→Signal bridging, `computed()` derived views, unidirectional flow (components call service methods, never `.set()` global signals), kebab-case naming, and **unit tests only** (Jest + Stryker; no integration tests). No backend, API, or data-model changes are permitted by this change; existing services and REST calls are reused unchanged. `routes.ts` is append-only by convention — but this change deliberately edits it to remove `/portfolio` and re-point `/profile`, which is an approved exception documented here.

## Goals / Non-Goals

**Goals:**
- Introduce a single token-driven design system in `styles.scss` (`:root` custom properties) and reduce each component's SCSS to token references.
- Define canonical shared primitives once — card, buttons, inputs/labels, badges, avatar, list row, data-list states, toast, modal, and a reusable **employee picker** — and reuse them everywhere.
- Move portfolio editing onto the Profile page behind an explicit Edit mode via a reusable `portfolio-editor` component; remove the standalone `/portfolio` route.
- Fold self-service Your-details into the Profile page so there is one self-service destination.
- Replace the dashboard stub with a real widget grid; restyle Login, Employees, Interactions, Tasks, and Skills to the system.
- Keep loading/empty/error+retry states and accessibility (labels, focus traps, unique ids, focus rings) consistent across every list.

**Non-Goals:**
- No framework swap, no new runtime dependencies (Inter web font is the only optional addition).
- No backend/API/data-model changes.
- No admin delete-employee affordance.
- No left-sidebar navigation — the top bar per `ui-changes.md` is retained (the older LOVABLE_SPEC.md no longer exists).

## Decisions

**Phased delivery within one change.** Tasks are grouped into four sequenced phases — (a) design system + shell, (b) Profile + portfolio move, (c) per-screen restyle, (d) dashboard build-out — so each lands as a reviewable increment. *Alternative considered:* one big pass (harder to review) or four separate OpenSpec changes (more coordination overhead). Phasing inside one change keeps the contract single while staying incremental.

**Tokens as the single source of truth.** All colours, radii, spacing, shadows, type, and motion live as `:root` custom properties in `styles.scss`; component SCSS references `var(--…)` only. *Why:* eliminates duplicated hex values and makes future theming trivial. *Alternative:* an SCSS `$variables` map — rejected because CSS custom properties are runtime-inspectable, work with `prefers-reduced-motion`, and need no recompilation.

**Employee picker replaces raw id inputs.** One reusable searchable component (name shown, id wired) is used by Portfolio, Tasks, and Interactions. *Why:* removes the recurring "type an Employee ID" UX defect in one place. It reads employees via the existing employee API/service — no new endpoint.

**Portfolio editor extracted to a reusable component.** The body of `features/portfolio/portfolio.ts` becomes `portfolio-editor` with `@Input() employeeId` and `@Input() readOnly`, backed by the same `PortfolioStateService`. The Profile page mounts it read-only in View mode and editable in Edit mode. *Why:* one editor serves both the profile view and edit, avoids duplicate portfolio surfaces, and drops the id picker. The standalone `/portfolio` route/component is deleted and old links redirect to the user's own Profile.

**Profile is the single self-service destination.** `profile-page.ts` gains `editMode = signal(false)` and loads the portfolio on init so view and editor share one signal. `employee-detail` gains `@Input() editing` and gates the edit form on `canEdit && editing` (today it shows whenever `canEdit`). `/profile` resolves the current user from the JWT subject and routes to their own Profile page. *Alternative considered:* keep `/profile` as a separate identity page — rejected per product decision to have one self-service destination.

**Shell stays a top bar.** Light sticky bar, active-nav pill, avatar user menu; Portfolio nav removed; nav hidden on `/login`; responsive collapse < 768px. *Why:* matches `ui-changes.md` and the existing shell; a sidebar rework is out of scope.

## Risks / Trade-offs

- **Editing append-only `routes.ts`** (removing `/portfolio`, re-pointing `/profile`) → deviates from the append-only convention; documented as an approved exception, with a redirect so old deep links don't 404.
- **Extracting `portfolio-editor` could regress add/remove-row behaviour** → preserve the same `PortfolioStateService` methods and port existing unit tests to the new component; add read-only-mode tests.
- **Duplicate DOM-id bug** currently caused by the Employees inline edit panel → removing that panel (directory-only) eliminates the duplicate `#fullName` ids; verify no other screen reintroduces them.
- **Broad restyle risk** (many components touched) → tokens are additive first; components migrate to tokens screen-by-screen per phase so a regression is isolated to one screen.
- **Stryker mutation thresholds** on new components (employee-picker, portfolio-editor, dashboard cards) → author BDD Given-When-Then Jest tests designed to survive mutation, per `testing-strategy.yaml`.
- **Optional Inter font fails to load** → `--font` falls back to the Segoe UI stack; no layout dependence on Inter metrics.

## Migration Plan

1. Ship Phase (a): add tokens + base element styles to `styles.scss`, restyle the shell, and land the shared primitives (avatar, badge, employee-picker, toast/modal styling). Nothing removed yet.
2. Ship Phase (b): extract `portfolio-editor`, wire Profile View/Edit modes, fold `/profile`, then remove the `/portfolio` route/component and add the redirect.
3. Ship Phase (c): migrate Employees, Login, Interactions, Tasks, Skills to tokens + pickers.
4. Ship Phase (d): rebuild the dashboard widget grid.
- **Rollback:** each phase is independently revertable; the token layer is additive, so reverting a screen's SCSS restores prior styling without touching data flow.

## Open Questions

- **Inter vs Segoe UI** (ui-changes.md §8.2): default is to adopt Inter with the Segoe UI fallback stack; confirm if Inter should be dropped to avoid the extra font load.
- **`/portfolio` removal** (ui-changes.md §8.6): resolved to **redirect** old links to the user's Profile (not 404).
