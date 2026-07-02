## Why

The POC currently starts with an empty database, requiring manual data entry for every demo or test session. This slows down UAT, makes Playwright E2E tests fragile (nothing to verify against), and hinders stakeholder demonstrations. A database seeding mechanism provides realistic sample data automatically on startup, enabling immediate value demonstration and robust testing.

## What Changes

- New `DataInitializer` component (`@Component` implementing `ApplicationRunner`) in `shared/infrastructure`
- Seed data generators for Employees, Interactions, Tasks, TaskItems, and Skills
- Configuration toggle `app.seed.enabled` (default `true` for dev, `false` for production)
- Duplicate prevention via existence checks before insert
- Transactional seeding ensuring all-or-nothing data integrity

## Capabilities

### New Capabilities

- **data-seeding**: Automatic population of database with realistic sample data on application startup
  - 5-8 employees with varied roles, departments, and levels
  - 25+ interactions across all InteractionTypes linked to employees
  - 20+ tasks with varied statuses, priorities, and subtasks
  - 40+ skills with employee associations and proficiency levels
- **seed-configuration**: Environment-controlled toggle to enable/disable seeding
  - `app.seed.enabled=true` (default for development)
  - `app.seed.enabled=false` (for production profiles)

### Modified Capabilities

- **database-migrations**: Adds seed data verification to ensure schema supports generated data

## Impact

- **Code**: Adds `shared/infrastructure/DataInitializer.java` and supporting seed data classes
- **APIs**: No changes to REST contracts; seeded data becomes visible via existing endpoints
- **Dependencies**: No new dependencies required (uses existing Spring Boot, JPA, Lombok)
- **Systems**: Postgres database populated automatically on first run
- **Contracts**: No changes to frozen contracts; seed data respects existing DTO structures
- **Testing**: 
  - Seed data enables meaningful E2E tests with pre-populated data
  - Seed can be disabled for isolated unit tests
- **Out of scope**: Frontend changes (existing UI displays seeded data automatically)

## Design Principles

- **Deterministic**: Same seed data generated on every run (no random Faker library)
- **Idempotent**: Re-running application doesn't duplicate data
- **Realistic**: Data reflects actual usage patterns (meaningful names, dates, relationships)
- **Maintainable**: Seed data easy to extend as new features are added
