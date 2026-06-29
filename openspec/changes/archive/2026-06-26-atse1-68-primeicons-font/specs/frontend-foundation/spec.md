## ADDED Requirements

### Requirement: Resilient PrimeIcons rendering
The system SHALL load the PrimeIcons font through a verifiable, build-managed
mechanism, and icon rendering SHALL degrade gracefully so that the layout is never
broken when the font or an individual glyph is unavailable.

The `primeicons` package SHALL be declared as a dependency in `frontend/package.json`,
and its stylesheet (`node_modules/primeicons/primeicons.css`) SHALL be included in the
`angular.json` build `styles` array so the font is bundled and served by the build.

A layout-preserving fallback SHALL be defined in `frontend/src/styles.scss` for the
base `.pi` icon class so that an icon slot reserves its space and remains visually
inert (rather than collapsing the layout or rendering tofu/garbled fallback text) when
the PrimeIcons font fails to load.

#### Scenario: PrimeIcons dependency and stylesheet are wired
- **WHEN** the frontend build configuration is inspected
- **THEN** `primeicons` is present in `frontend/package.json` dependencies
- **AND** `node_modules/primeicons/primeicons.css` is listed in the `angular.json` build `styles` array

#### Scenario: Brand icon and spinner render when the font loads
- **WHEN** the app is rendered with the PrimeIcons font available
- **THEN** the shell brand icon (`pi-th-large`) and the loading spinner (`pi-spinner`) display their glyphs

#### Scenario: Layout is preserved when the font fails to load
- **WHEN** the PrimeIcons font fails to load or a glyph is missing
- **THEN** each `.pi` icon slot reserves its layout space and renders nothing visible
- **AND** surrounding content (header brand, spinners, buttons) keeps its position and is not broken
