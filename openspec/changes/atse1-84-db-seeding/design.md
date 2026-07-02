# Database Seeding Design

## Overview

This design provides automatic database seeding for the Staff Engagement POC, populating the database with realistic sample data for employees, interactions, tasks, and skills on application startup.

## Architecture

### Component Structure

```
shared/infrastructure/
├── DataInitializer.java          # Main seeder component (ApplicationRunner)
└── seeddata/
    ├── EmployeeSeedData.java     # Static employee definitions
    ├── InteractionSeedData.java  # Interaction definitions
    ├── TaskSeedData.java         # Task and TaskItem definitions
    └── SkillSeedData.java        # Skill definitions
```

### Data Flow

1. Application starts → Spring context initialized
2. `DataInitializer` (implements `ApplicationRunner`) executes `run()` method
3. Check `app.seed.enabled` config flag
4. Check if database already seeded (via employee count)
5. If not seeded, execute transactional seed process:
   - Insert employees first (no dependencies)
   - Insert interactions (depends on employees)
   - Insert tasks (depends on employees, interactions)
   - Insert task items (depends on tasks)
   - Insert portfolio skills (depends on employees)
6. Log completion with counts

## Implementation Details

### DataInitializer Component

```java
@Component
@RequiredArgsConstructor
public class DataInitializer implements ApplicationRunner {
    private static final Logger log = LoggerFactory.getLogger(DataInitializer.class);
    
    private final EmployeeRepository employeeRepository;
    private final InteractionRepository interactionRepository;
    private final TaskRepository taskRepository;
    private final TaskItemRepository taskItemRepository;
    private final PortfolioSkillRepository portfolioSkillRepository;
    
    @Value("${app.seed.enabled:true}")
    private boolean seedEnabled;
    
    @Override
    @Transactional
    public void run(ApplicationArguments args) {
        if (!seedEnabled) {
            log.info("Database seeding is disabled");
            return;
        }
        
        if (employeeRepository.count() > 0) {
            log.info("Database already seeded ({} employees found)", employeeRepository.count());
            return;
        }
        
        log.info("Starting database seeding...");
        seedEmployees();
        seedInteractions();
        seedTasks();
        seedTaskItems();
        seedSkills();
        log.info("Database seeding completed successfully");
    }
}
```

### Seed Data: Employees

8 employees with varied profiles:

| ID | Name | Email | Role | Level | Department | Job Title |
|----|------|-------|------|-------|------------|-----------|
| 1 | Sarah Johnson | sarah.johnson@staff.eng | ADMIN | SENIOR | Engineering | Engineering Manager |
| 2 | Michael Chen | michael.chen@staff.eng | EMPLOYEE | SENIOR | Engineering | Senior Developer |
| 3 | Emily Davis | emily.davis@staff.eng | EMPLOYEE | MID | Engineering | Developer |
| 4 | James Wilson | james.wilson@staff.eng | EMPLOYEE | JUNIOR | Engineering | Junior Developer |
| 5 | Lisa Anderson | lisa.anderson@staff.eng | EMPLOYEE | SENIOR | Design | UX Designer |
| 6 | Robert Brown | robert.brown@staff.eng | EMPLOYEE | MID | Design | UI Designer |
| 7 | Maria Garcia | maria.garcia@staff.eng | EMPLOYEE | SENIOR | Product | Product Owner |
| 8 | David Martinez | david.martinez@staff.eng | EMPLOYEE | MID | Engineering | DevOps Engineer |

### Seed Data: Interactions

25+ interactions covering all types:

- **check-in**: 5 interactions (weekly team check-ins)
- **mentoring**: 4 interactions (1:1 mentoring sessions)
- **catch-up**: 6 interactions (informal catch-ups)
- **performance**: 3 interactions (performance reviews)
- **workshop**: 4 interactions (team workshops)
- **training**: 4 interactions (skills training)
- **other**: 2 interactions (ad-hoc meetings)

Each interaction includes:
- Realistic subject text
- Detailed notes
- Varied dates (spread over past 3 months)
- Different subject/facilitator combinations

### Seed Data: Tasks

20+ tasks with varied characteristics:

| Status | Count | Description |
|--------|-------|-------------|
| TODO | 6 | Pending work items |
| IN_PROGRESS | 8 | Currently being worked on |
| DONE | 6 | Completed items |

Task features:
- Varied titles and descriptions
- Different completion states
- Some with subtasks (TaskItems)
- Linked to interactions where applicable
- Realistic creation dates

### Seed Data: TaskItems (Subtasks)

30+ subtasks across various tasks:
- 2-5 subtasks per parent task
- Mix of completed and pending states
- Ordered by ordinal position

### Seed Data: Skills

40+ skills across categories:

**Technical Skills (20):**
Java, Spring Boot, Angular, TypeScript, JavaScript, PostgreSQL, Docker, Kubernetes, Git, CI/CD, REST APIs, Microservices, Maven, Gradle, JUnit, Mockito, HTML, CSS, SCSS, PrimeNG

**Soft Skills (10):**
Communication, Leadership, Problem Solving, Teamwork, Time Management, Critical Thinking, Adaptability, Creativity, Mentoring, Presentation

**Tools & Platforms (10):**
Jira, Confluence, GitHub, GitLab, Jenkins, Azure DevOps, AWS, Figma, Miro, Slack

Skills distributed across employees with:
- Varied years of experience (1-15 years)
- Multiple skills per employee (5-10 each)
- Realistic skill combinations per role

## Configuration

### application.yml

```yaml
app:
  seed:
    enabled: true  # Set to false for production
```

### Environment Variable Override

```yaml
# docker-compose.yml
services:
  backend:
    environment:
      APP_SEED_ENABLED: ${APP_SEED_ENABLED:-true}
```

## Error Handling

- All seeding wrapped in `@Transactional` - rolls back on any failure
- Existence checks prevent duplicate data
- Detailed logging for troubleshooting
- Clear error messages for constraint violations

## Testing Strategy

1. **Unit Tests**: Verify seed data generation logic
2. **Integration Tests**: Verify data persisted correctly (when enabled)
3. **Manual Verification**: Docker compose up → verify via UI/Playwright

## Acceptance Criteria Mapping

| Criterion | Implementation |
|-----------|----------------|
| 20+ interactions | 25+ interactions seeded |
| 15+ tasks | 20+ tasks with subtasks |
| 30+ skills | 40+ skills with associations |
| No duplicates | Existence check before insert |
| Configurable | `app.seed.enabled` toggle |
| Realistic data | Hand-crafted seed data classes |
