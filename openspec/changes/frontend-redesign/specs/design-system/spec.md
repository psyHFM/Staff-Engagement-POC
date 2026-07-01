## ADDED Requirements

### Requirement: Design tokens as single source of truth
The system SHALL define a token-driven visual foundation as `:root` CSS custom properties in `styles.scss`, covering neutrals, a single indigo accent, status colours, elevation, geometry, type, and motion. No component SHALL keep its own hard-coded hex, radius, spacing, or shadow value — every component SCSS SHALL reference a token.

#### Scenario: Tokens defined once
- **WHEN** the application stylesheet loads
- **THEN** `styles.scss` exposes `:root` custom properties for `--bg`, `--surface`, `--border`, `--text`, `--accent`, status colours, `--shadow-sm`/`--shadow-md`, `--radius`, `--space`, `--font`, and `--ease`

#### Scenario: Components reference tokens, not literals
- **WHEN** any feature component's SCSS is inspected
- **THEN** its colours, radii, spacing, and shadows resolve to `var(--…)` tokens
- **AND** no raw hex colour or literal radius/shadow value remains

#### Scenario: Type stack with graceful fallback
- **WHEN** the Inter web font fails to load
- **THEN** text falls back to the `'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif` stack via `--font` with no layout breakage

### Requirement: Canonical shared component patterns
The system SHALL define one canonical style for Card, Buttons (primary/secondary/ghost/destructive), Inputs/selects/textarea, Badges, Avatar, and List row, reused across every screen. Buttons SHALL be 40px tall with `--radius-sm`; inputs SHALL be 40px with a visible focus ring; list rows SHALL show hover fill, pointer cursor, and a visible focus outline.

#### Scenario: Buttons are consistent
- **WHEN** a primary button is rendered on any screen
- **THEN** it uses `--accent` background, white text, `--radius-sm`, and transitions to `--accent-hover` on hover in `150ms --ease`

#### Scenario: Every field has a visible label
- **WHEN** any form input, select, or textarea is rendered
- **THEN** it has an associated visible `<label>` (no placeholder-only fields)
- **AND** on focus it shows the accent focus ring and accent border

### Requirement: Canonical badge system
The system SHALL render soft pill badges (tinted background + darker same-hue foreground) from one canonical set for Role (Employee/Admin), Level (Junior/Intermediate/Senior), and Interaction type (Check-in/Mentoring/Catch-up/Performance/Other). Badge labels SHALL be produced via a display-label lookup and capitalized — never the raw wire value — and SHALL keep a right margin so badge and adjacent text never collide.

#### Scenario: Badge shows a human label
- **WHEN** an employee with wire role `admin` and level `senior` is displayed
- **THEN** the badges read "Admin" and "Senior" using the canonical colours
- **AND** the raw wire value is never shown

#### Scenario: Interaction type is colour-coded
- **WHEN** an interaction of each type is listed
- **THEN** its badge uses the canonical colour (Check-in indigo, Mentoring sky, Catch-up amber, Performance violet, Other grey) with spacing before the note text

### Requirement: Initials avatar
The system SHALL provide a reusable avatar component rendering a coloured-initials circle whose colour is deterministically hashed from the person's name, at ~28–32px in bars and lists and 64px on the profile header. No photo upload SHALL be supported.

#### Scenario: Avatar colour is stable per name
- **WHEN** the same person's avatar is rendered in two places
- **THEN** both show the same initials and the same hashed colour

### Requirement: Standard data-list states
The system SHALL provide one styled set of loading, empty, and error+retry states, applied to every data list and dashboard card. The loading spinner SHALL use `--accent`, the empty state SHALL be muted, and the error state SHALL be a `--danger`-tinted card with a Retry button that re-triggers the fetch.

#### Scenario: Error state offers retry
- **WHEN** a data list fetch fails
- **THEN** a `--danger`-tinted error card with a Retry button is shown
- **AND** clicking Retry re-issues the request

#### Scenario: Empty state is shown when there is no data
- **WHEN** a data list resolves with zero items
- **THEN** the muted empty state is rendered instead of an empty container

### Requirement: Standardized toast and modal
The system SHALL standardize the toast stack (top-right, for create/update/delete success and errors) and modal styling to the design tokens. Modals SHALL be centered cards with `--shadow-md`, `role="dialog"`, `aria-modal`, a focus trap, and Escape-to-close.

#### Scenario: Toast on mutation
- **WHEN** a create, update, or delete succeeds or fails
- **THEN** a token-styled toast appears in the top-right stack

#### Scenario: Modal is accessible
- **WHEN** a modal opens
- **THEN** focus is trapped inside it, Escape closes it, and it exposes `role="dialog"` and `aria-modal`

### Requirement: Reusable employee picker
The system SHALL provide a reusable searchable employee-picker component that displays employee names while resolving to an employee id, and SHALL replace every raw "Employee ID" free-text input across the app (Portfolio, Tasks, Interactions).

#### Scenario: Picker shows names, resolves ids
- **WHEN** a user searches and selects an employee in the picker
- **THEN** the visible value is the employee's name
- **AND** the value bound to the form is the employee id

#### Scenario: No raw id inputs remain
- **WHEN** the Interactions, Tasks, and portfolio surfaces are inspected
- **THEN** none present a free-text "Employee ID" input; each uses the employee picker

### Requirement: Motion and reduced-motion
The system SHALL apply `150ms --ease` transitions to hover, active, and expand interactions, and SHALL honour `prefers-reduced-motion` by disabling non-essential motion.

#### Scenario: Reduced motion respected
- **WHEN** the user has `prefers-reduced-motion: reduce` set
- **THEN** non-essential transitions and animations are disabled
