# Data Seeding Specification

## Purpose

Automatically populate the database with realistic sample data on application startup to enable immediate UAT, E2E testing, and stakeholder demonstrations.

## Scope

### In Scope

- Automatic seeding on application startup
- Employees (8 records with varied profiles)
- Interactions (25+ records across all types)
- Tasks (20+ records with varied statuses)
- TaskItems (30+ subtasks)
- Portfolio Skills (40+ skills with employee associations)
- Configuration toggle for enabling/disabling
- Idempotent seeding (no duplicates on restart)

### Out of Scope

- Frontend changes (existing UI displays seeded data)
- Migration of existing data
- Seed data modification APIs
- Partial reseeding

## Functional Requirements

### FR-1: Automatic Seeding

**Given** the application starts  
**And** `app.seed.enabled` is `true`  
**And** the database is empty  
**When** the Spring context is initialized  
**Then** seed data is inserted transactionally  
**And** a log message confirms completion

### FR-2: Idempotency

**Given** the application has already seeded data  
**When** the application restarts  
**Then** no duplicate data is inserted  
**And** a log message indicates existing seed data

### FR-3: Configuration Toggle

**Given** `app.seed.enabled` is set to `false`  
**When** the application starts  
**Then** no seed data is inserted  
**And** a log message indicates seeding is disabled

### FR-4: Employee Seeding

**Given** an empty database  
**When** seeding executes  
**Then** exactly 8 employees are inserted with:
- Unique email addresses
- Varied roles (1 ADMIN, 7 EMPLOYEE)
- Varied levels (JUNIOR, MID, SENIOR)
- Varied departments (Engineering, Design, Product)
- Realistic job titles

### FR-5: Interaction Seeding

**Given** employees exist in the database  
**When** seeding executes  
**Then** 25+ interactions are inserted with:
- All InteractionTypes represented
- Valid subjectId and facilitatorId references
- Realistic subject text
- Detailed notes
- Varied createdAt timestamps (past 3 months)

### FR-6: Task Seeding

**Given** employees exist in the database  
**When** seeding executes  
**Then** 20+ tasks are inserted with:
- Varied completion states (completed=true/false)
- Realistic titles and descriptions
- Varied createdAt timestamps
- Some linked to sourceInteractionId

### FR-7: TaskItem Seeding

**Given** tasks exist in the database  
**When** seeding executes  
**Then** 30+ TaskItems are inserted with:
- Valid taskId references
- Ordered ordinal values per task
- Varied completion states
- Meaningful titles

### FR-8: Skill Seeding

**Given** employees exist in the database  
**When** seeding executes  
**Then** 40+ portfolio skills are inserted with:
- Varied skill names across categories
- Realistic yearsOfExperience (1-15)
- Multiple skills per employee (5-10 each)
- Varied projectCount (1-5)

## Non-Functional Requirements

### NFR-1: Transactional Integrity

All seeding executes within a single transaction. If any insert fails, all changes roll back.

### NFR-2: Performance

Seeding completes within 5 seconds for the specified data volume.

### NFR-3: Maintainability

Seed data is defined in static, easy-to-modify classes. Adding/extending data requires minimal code changes.

### NFR-4: Logging

Comprehensive logging at INFO level:
- Seeding disabled (when applicable)
- Already seeded (when applicable)
- Starting seeding
- Completion with counts per entity type

### NFR-5: Code Quality

- Follows project conventions (camelCase, kebab-case for config)
- No hardcoded magic numbers (use constants)
- Clear method names describing seed operations

## Data Model

### Employee Seed Structure

```
Employee {
    fullName: String (unique per employee)
    email: String (unique, format: firstname.lastname@staff.eng)
    role: EmployeeRole (EMPLOYEE or ADMIN)
    level: EmployeeLevel (JUNIOR, MID, SENIOR)
    department: String (Engineering, Design, Product)
    jobTitle: String
    createdAt: Instant (seed timestamp)
    updatedAt: Instant (seed timestamp)
}
```

### Interaction Seed Structure

```
Interaction {
    type: InteractionType (check-in, mentoring, catch-up, performance, workshop, training, other)
    subjectId: Long (reference to Employee.id)
    facilitatorId: Long (reference to Employee.id)
    subjectText: String (50-100 chars)
    note: String (100-500 chars)
    createdAt: Instant (varied, past 3 months)
    updatedAt: Instant (equals createdAt)
}
```

### Task Seed Structure

```
Task {
    subjectId: Long (reference to Employee.id)
    sourceInteractionId: Long (nullable, reference to Interaction.id)
    title: String (20-100 chars)
    description: String (50-500 chars)
    completed: boolean
    createdAt: Instant (varied, past 3 months)
    completedAt: Instant (nullable, set if completed=true)
}
```

### TaskItem Seed Structure

```
TaskItem {
    taskId: Long (reference to Task.id)
    ordinal: int (0-based, sequential per task)
    title: String (20-150 chars)
    completed: boolean
    createdAt: Instant (seed timestamp)
}
```

### PortfolioSkill Seed Structure

```
PortfolioSkill {
    employeeId: Long (reference to Employee.id)
    skill: String (skill name)
    yearsOfExperience: int (1-15)
    projectCount: int (1-5)
    lastUsed: Instant (varied)
}
```

## Configuration

### application.yml

```yaml
app:
  seed:
    enabled: true
```

### Environment Variable

```bash
APP_SEED_ENABLED=false  # Disable seeding
```

## Error Handling

| Scenario | Behavior |
|----------|----------|
| Database not empty | Skip seeding, log info |
| Seeding disabled | Skip seeding, log info |
| Constraint violation | Rollback transaction, log error |
| Null reference | Rollback transaction, log error |

## Acceptance Criteria

- [ ] Running `docker compose up` results in seeded database
- [ ] Exactly 8 employees visible via `GET /api/v1/employees`
- [ ] 25+ interactions visible in interaction history
- [ ] 20+ tasks visible in task list
- [ ] 30+ subtasks visible across tasks
- [ ] 40+ skills visible in skills view
- [ ] Re-running `docker compose up` doesn't duplicate data
- [ ] Setting `APP_SEED_ENABLED=false` prevents seeding
- [ ] All seeded data has realistic, meaningful content
- [ ] Seeding completes without errors in logs
