# Tasks: Database Seeding (ATSE1-84)

## Implementation Tasks

### Task 1: Create DataInitializer Component

**ID:** ATSE1-84-T1  
**Description:** Create the main `DataInitializer` component that orchestrates database seeding

**Implementation:**
- Create `shared/infrastructure/DataInitializer.java`
- Implement `ApplicationRunner` interface
- Add `@Component` annotation
- Inject required repositories
- Add `@Value` injection for `app.seed.enabled` config
- Implement existence check (skip if employees exist)
- Implement transactional `run()` method
- Add comprehensive logging

**Files:**
- `backend/src/main/java/com/staffengagement/shared/infrastructure/DataInitializer.java`

---

### Task 2: Create Employee Seed Data

**ID:** ATSE1-84-T2  
**Description:** Create static seed data for 8 employees

**Implementation:**
- Create `shared/infrastructure/seeddata/EmployeeSeedData.java`
- Define 8 employee records with varied profiles
- Include ADMIN and EMPLOYEE roles
- Include JUNIOR, MID, SENIOR levels
- Include Engineering, Design, Product departments
- Use realistic names and email format

**Files:**
- `backend/src/main/java/com/staffengagement/shared/infrastructure/seeddata/EmployeeSeedData.java`

---

### Task 3: Create Interaction Seed Data

**ID:** ATSE1-84-T3  
**Description:** Create static seed data for 25+ interactions

**Implementation:**
- Create `shared/infrastructure/seeddata/InteractionSeedData.java`
- Cover all InteractionTypes (check-in, mentoring, catch-up, performance, workshop, training, other)
- Link to employee IDs
- Include realistic subject text and notes
- Vary timestamps over past 3 months

**Files:**
- `backend/src/main/java/com/staffengagement/shared/infrastructure/seeddata/InteractionSeedData.java`

---

### Task 4: Create Task and TaskItem Seed Data

**ID:** ATSE1-84-T4  
**Description:** Create static seed data for 20+ tasks and 30+ subtasks

**Implementation:**
- Create `shared/infrastructure/seeddata/TaskSeedData.java`
- Define tasks with varied completion states
- Define TaskItems with ordinal ordering
- Link tasks to employees and interactions
- Include realistic titles and descriptions

**Files:**
- `backend/src/main/java/com/staffengagement/shared/infrastructure/seeddata/TaskSeedData.java`

---

### Task 5: Create Skill Seed Data

**ID:** ATSE1-84-T5  
**Description:** Create static seed data for 40+ skills

**Implementation:**
- Create `shared/infrastructure/seeddata/SkillSeedData.java`
- Define skills across categories (Technical, Soft Skills, Tools)
- Link skills to employees via PortfolioSkill
- Include yearsOfExperience and projectCount
- Distribute realistically across employees

**Files:**
- `backend/src/main/java/com/staffengagement/shared/infrastructure/seeddata/SkillSeedData.java`

---

### Task 6: Add Configuration and Update application.yml

**ID:** ATSE1-84-T6  
**Description:** Add seed configuration to application.yml

**Implementation:**
- Add `app.seed.enabled` to `application.yml`
- Default to `true` for development
- Document environment variable override

**Files:**
- `backend/src/main/resources/application.yml`

---

### Task 7: Write Unit Tests

**ID:** ATSE1-84-T7  
**Description:** Write BDD-style unit tests for seeding logic

**Implementation:**
- Create `DataInitializerTest.java`
- Test seeding enabled/disabled scenarios
- Test idempotency (skip if already seeded)
- Test transactional rollback on failure
- Use AssertJ for assertions

**Files:**
- `backend/src/test/java/com/staffengagement/shared/infrastructure/DataInitializerTest.java`

---

### Task 8: Verify with Docker and Playwright

**ID:** ATSE1-84-T8  
**Description:** Verify seeded data via UI

**Implementation:**
- Run `docker compose up -d --build`
- Verify employees visible in Employee Directory
- Verify interactions visible in Interaction History
- Verify tasks visible in Task List
- Verify skills visible in Skills view
- Update Playwright tests if needed to assert seeded data

**Acceptance:**
- Playwright smoke tests pass
- All seeded entities visible in UI

---

## Definition of Done

- [ ] All 8 tasks completed
- [ ] Code follows project conventions (camelCase, kebab-case URLs)
- [ ] Unit tests pass with ≥80% coverage
- [ ] Docker compose starts successfully with seeded data
- [ ] No duplicate data on restart
- [ ] Configuration toggle works as expected
- [ ] Playwright tests verify seeded data presence
