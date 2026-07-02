package com.staffengagement.employee.infrastructure;

import com.staffengagement.employee.domain.Employee;
import com.staffengagement.employee.domain.EmployeeLevel;
import com.staffengagement.employee.repository.EmployeeRepository;
import com.staffengagement.interaction.domain.Interaction;
import com.staffengagement.interaction.repository.InteractionRepository;
import com.staffengagement.portfolio.domain.Portfolio;
import com.staffengagement.portfolio.repository.PortfolioRepository;
import com.staffengagement.portfolio.domain.PortfolioSkill;
import com.staffengagement.portfolio.repository.PortfolioSkillRepository;
import com.staffengagement.shared.kernel.EmployeeRole;
import com.staffengagement.shared.kernel.InteractionType;
import com.staffengagement.task.domain.Task;
import com.staffengagement.task.domain.TaskItem;
import com.staffengagement.task.repository.TaskItemRepository;
import com.staffengagement.task.repository.TaskRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.List;

/**
 * Database seeder for the Staff Engagement POC.
 *
 * <p>Automatically populates the database with realistic sample data on application
 * startup to enable immediate UAT, E2E testing, and stakeholder demonstrations.
 * Seeding is idempotent (skipped if data already exists) and transactional
 * (all-or-nothing integrity).</p>
 *
 * <p>Controlled via {@code app.seed.enabled} configuration (default: true).</p>
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class DataInitializer implements ApplicationRunner {

    private static final String SEED_PREFIX = "[DB Seed]";

    private final EmployeeRepository employeeRepository;
    private final InteractionRepository interactionRepository;
    private final TaskRepository taskRepository;
    private final TaskItemRepository taskItemRepository;
    private final PortfolioRepository portfolioRepository;
    private final PortfolioSkillRepository portfolioSkillRepository;

    @Value("${app.seed.enabled:true}")
    protected boolean seedEnabled;

    @Override
    public void run(ApplicationArguments args) {
        if (!seedEnabled) {
            log.info("{} Database seeding is disabled (app.seed.enabled=false)", SEED_PREFIX);
            return;
        }

        if (employeeRepository.count() > 0) {
            log.info("{} Database already seeded ({} employees found). Skipping.", SEED_PREFIX, employeeRepository.count());
            return;
        }

        log.info("{} Starting database seeding...", SEED_PREFIX);
        try {
            seedAll();
            log.info("{} Database seeding completed successfully. Seeded: {} employees, {} portfolios, {} interactions, {} tasks, {} taskItems, {} skills",
                    SEED_PREFIX,
                    employeeRepository.count(),
                    portfolioRepository.count(),
                    interactionRepository.count(),
                    taskRepository.count(),
                    taskItemRepository.count(),
                    portfolioSkillRepository.count());
        } catch (Exception e) {
            log.error("{} Database seeding failed: {}", SEED_PREFIX, e.getMessage(), e);
            throw e;
        }
    }

    @Transactional
    protected void seedAll() {
        List<Employee> employees = seedEmployees();
        List<Portfolio> portfolios = seedPortfolios(employees);
        List<Interaction> interactions = seedInteractions(employees);
        List<Task> tasks = seedTasks(employees, interactions);
        seedTaskItems(tasks);
        seedSkills(portfolios);
    }

    /**
     * Seeds 8 employees with varied profiles across roles, levels, and departments.
     */
    @Transactional
    protected List<Employee> seedEmployees() {
        log.info("{} Seeding employees...", SEED_PREFIX);
        Instant now = Instant.now();
        List<Employee> employees = new ArrayList<>();

        employees.add(createEmployee("Sarah Johnson", "sarah.johnson@staff.eng", EmployeeRole.ADMIN, EmployeeLevel.SENIOR, "Engineering", "Engineering Manager", now));
        employees.add(createEmployee("Michael Chen", "michael.chen@staff.eng", EmployeeRole.EMPLOYEE, EmployeeLevel.SENIOR, "Engineering", "Senior Developer", now));
        employees.add(createEmployee("Emily Davis", "emily.davis@staff.eng", EmployeeRole.EMPLOYEE, EmployeeLevel.INTERMEDIATE, "Engineering", "Developer", now));
        employees.add(createEmployee("James Wilson", "james.wilson@staff.eng", EmployeeRole.EMPLOYEE, EmployeeLevel.JUNIOR, "Engineering", "Junior Developer", now));
        employees.add(createEmployee("Lisa Anderson", "lisa.anderson@staff.eng", EmployeeRole.EMPLOYEE, EmployeeLevel.SENIOR, "Design", "UX Designer", now));
        employees.add(createEmployee("Robert Brown", "robert.brown@staff.eng", EmployeeRole.EMPLOYEE, EmployeeLevel.INTERMEDIATE, "Design", "UI Designer", now));
        employees.add(createEmployee("Maria Garcia", "maria.garcia@staff.eng", EmployeeRole.EMPLOYEE, EmployeeLevel.SENIOR, "Product", "Product Owner", now));
        employees.add(createEmployee("David Martinez", "david.martinez@staff.eng", EmployeeRole.EMPLOYEE, EmployeeLevel.INTERMEDIATE, "Engineering", "DevOps Engineer", now));

        employees = employeeRepository.saveAll(employees);
        log.info("{} Seeded {} employees", SEED_PREFIX, employees.size());
        return employees;
    }

    private Employee createEmployee(String fullName, String email, EmployeeRole role, EmployeeLevel level,
                                    String department, String jobTitle, Instant timestamp) {
        Employee employee = new Employee();
        employee.setFullName(fullName);
        employee.setEmail(email);
        employee.setRole(role);
        employee.setLevel(level);
        employee.setDepartment(department);
        employee.setJobTitle(jobTitle);
        employee.setCreatedAt(timestamp);
        employee.setUpdatedAt(timestamp);
        return employee;
    }

    /**
     * Seeds 25+ interactions covering all InteractionTypes.
     */
    @Transactional
    protected List<Interaction> seedInteractions(List<Employee> employees) {
        log.info("{} Seeding interactions...", SEED_PREFIX);
        List<Interaction> interactions = new ArrayList<>();
        Instant now = Instant.now();

        // Check-ins (5)
        interactions.add(createInteraction(InteractionType.CHECK_IN, employees.get(0), employees.get(1), "Weekly Team Check-in", "Discussed sprint progress and blockers. Team morale is high.", minusDays(now, 2)));
        interactions.add(createInteraction(InteractionType.CHECK_IN, employees.get(0), employees.get(2), "Weekly Team Check-in", "Reviewed current tasks and upcoming deadlines.", minusDays(now, 2)));
        interactions.add(createInteraction(InteractionType.CHECK_IN, employees.get(0), employees.get(3), "Weekly Team Check-in", "Onboarding progress review. Assigned first ticket.", minusDays(now, 5)));
        interactions.add(createInteraction(InteractionType.CHECK_IN, employees.get(0), employees.get(4), "Weekly Team Check-in", "UX research findings discussion.", minusDays(now, 7)));
        interactions.add(createInteraction(InteractionType.CHECK_IN, employees.get(0), employees.get(5), "Weekly Team Check-in", "Design system updates review.", minusDays(now, 7)));

        // Mentoring (4)
        interactions.add(createInteraction(InteractionType.MENTORING, employees.get(1), employees.get(3), "Code Review Mentoring", "Pair programming session on REST API best practices.", minusDays(now, 3)));
        interactions.add(createInteraction(InteractionType.MENTORING, employees.get(1), employees.get(2), "Architecture Mentoring", "Discussed microservices patterns and when to apply them.", minusDays(now, 10)));
        interactions.add(createInteraction(InteractionType.MENTORING, employees.get(4), employees.get(5), "Design Mentoring", "Portfolio review and feedback on latest mockups.", minusDays(now, 4)));
        interactions.add(createInteraction(InteractionType.MENTORING, employees.get(6), employees.get(2), "Product Mentoring", "User story mapping and backlog refinement techniques.", minusDays(now, 12)));

        // Catch-ups (6)
        interactions.add(createInteraction(InteractionType.CATCH_UP, employees.get(2), employees.get(3), "Quick Sync", "Helped debug a tricky Hibernate issue.", minusDays(now, 1)));
        interactions.add(createInteraction(InteractionType.CATCH_UP, employees.get(1), employees.get(7), "DevOps Sync", "CI/CD pipeline optimization discussion.", minusDays(now, 6)));
        interactions.add(createInteraction(InteractionType.CATCH_UP, employees.get(4), employees.get(1), "UX-Dev Handoff", "Reviewed implementation of new component library.", minusDays(now, 8)));
        interactions.add(createInteraction(InteractionType.CATCH_UP, employees.get(6), employees.get(0), "Product-Engineering Sync", "Roadmap alignment for next quarter.", minusDays(now, 9)));
        interactions.add(createInteraction(InteractionType.CATCH_UP, employees.get(3), employees.get(2), "Peer Learning", "Knowledge sharing on Angular signals.", minusDays(now, 11)));
        interactions.add(createInteraction(InteractionType.CATCH_UP, employees.get(5), employees.get(4), "Design Collaboration", "Brainstorming session for new feature.", minusDays(now, 14)));

        // Performance reviews (3)
        interactions.add(createInteraction(InteractionType.PERFORMANCE, employees.get(0), employees.get(1), "Q2 Performance Review", "Excellent technical leadership. Discussed promotion path.", minusDays(now, 15)));
        interactions.add(createInteraction(InteractionType.PERFORMANCE, employees.get(0), employees.get(2), "Q2 Performance Review", "Strong performance. Goals set for skill development.", minusDays(now, 16)));
        interactions.add(createInteraction(InteractionType.PERFORMANCE, employees.get(0), employees.get(4), "Q2 Performance Review", "Outstanding UX contributions. Leading design system initiative.", minusDays(now, 17)));

        // Additional catch-ups (group sessions) (4)
        interactions.add(createInteraction(InteractionType.CATCH_UP, employees.get(0), employees, "Sprint Planning Session", "Team sprint planning and capacity allocation.", minusDays(now, 0)));
        interactions.add(createInteraction(InteractionType.CATCH_UP, employees.get(4), employees, "Design Thinking Session", "User journey mapping for new feature set.", minusDays(now, 20)));
        interactions.add(createInteraction(InteractionType.CATCH_UP, employees.get(6), employees, "Product Roadmap Session", "Q3 roadmap prioritization session.", minusDays(now, 25)));
        interactions.add(createInteraction(InteractionType.CATCH_UP, employees.get(1), employees, "Architecture Session", "Technical debt assessment and refactoring plan.", minusDays(now, 30)));

        // Additional mentoring (group sessions) (4)
        interactions.add(createInteraction(InteractionType.MENTORING, employees.get(7), employees, "Docker & Kubernetes Session", "Container orchestration fundamentals.", minusDays(now, 18)));
        interactions.add(createInteraction(InteractionType.MENTORING, employees.get(1), employees, "Spring Boot Session", "Advanced Spring Boot patterns and anti-patterns.", minusDays(now, 22)));
        interactions.add(createInteraction(InteractionType.MENTORING, employees.get(4), employees, "UX Research Session", "User interviewing and usability testing techniques.", minusDays(now, 28)));
        interactions.add(createInteraction(InteractionType.MENTORING, employees.get(6), employees, "Agile Product Session", "Backlog management and stakeholder communication.", minusDays(now, 35)));

        // Other (2)
        interactions.add(createInteraction(InteractionType.OTHER, employees.get(0), employees.get(1), "Escalation Discussion", "Production incident post-mortem and action items.", minusDays(now, 3)));
        interactions.add(createInteraction(InteractionType.OTHER, employees.get(6), employees.get(0), "Stakeholder Meeting", "Executive demo preparation.", minusDays(now, 1)));

        interactions = interactionRepository.saveAll(interactions);
        log.info("{} Seeded {} interactions", SEED_PREFIX, interactions.size());
        return interactions;
    }

    private Interaction createInteraction(InteractionType type, Employee subject, Employee facilitator,
                                          String subjectText, String note, Instant createdAt) {
        Interaction interaction = new Interaction();
        interaction.setType(type);
        interaction.setSubjectId(subject.getId());
        interaction.setFacilitatorId(facilitator.getId());
        interaction.setSubjectText(subjectText);
        interaction.setNote(note);
        interaction.setCreatedAt(createdAt);
        interaction.setUpdatedAt(createdAt);
        return interaction;
    }

    private Interaction createInteraction(InteractionType type, Employee subject, List<Employee> attendees,
                                          String subjectText, String note, Instant createdAt) {
        // For group interactions, use the first attendee as facilitator
        return createInteraction(type, subject, attendees.get(0), subjectText, note, createdAt);
    }

    /**
     * Creates a Portfolio for each employee (1:1 relationship).
     */
    @Transactional
    protected List<Portfolio> seedPortfolios(List<Employee> employees) {
        log.info("{} Seeding portfolios...", SEED_PREFIX);
        Instant now = Instant.now();
        List<Portfolio> portfolios = new ArrayList<>();

        for (Employee employee : employees) {
            Portfolio portfolio = new Portfolio();
            portfolio.setEmployeeId(employee.getId());
            portfolio.setCreatedAt(now);
            portfolio.setUpdatedAt(now);
            portfolios.add(portfolio);
        }

        portfolios = portfolioRepository.saveAll(portfolios);
        log.info("{} Seeded {} portfolios", SEED_PREFIX, portfolios.size());
        return portfolios;
    }

    /**
     * Seeds 20+ tasks with varied completion states and characteristics.
     */
    @Transactional
    protected List<Task> seedTasks(List<Employee> employees, List<Interaction> interactions) {
        log.info("{} Seeding tasks...", SEED_PREFIX);
        List<Task> tasks = new ArrayList<>();
        Instant now = Instant.now();

        // Completed tasks (6)
        tasks.add(createTask(employees.get(1), interactions.get(0), "Implement REST API endpoints", "Create CRUD endpoints for employee management", true, minusDays(now, 5)));
        tasks.add(createTask(employees.get(2), interactions.get(1), "Fix navigation bug", "Resolve issue with skills navigation not working", true, minusDays(now, 4)));
        tasks.add(createTask(employees.get(3), interactions.get(2), "Complete onboarding documentation", "Document setup process for new developers", true, minusDays(now, 3)));
        tasks.add(createTask(employees.get(4), interactions.get(3), "Design system component library", "Create reusable UI component library", true, minusDays(now, 10)));
        tasks.add(createTask(employees.get(5), interactions.get(4), "Update portfolio UI", "Implement new portfolio editor interface", true, minusDays(now, 8)));
        tasks.add(createTask(employees.get(7), interactions.get(5), "Set up CI/CD pipeline", "Configure automated build and deployment", true, minusDays(now, 15)));

        // In Progress tasks (8)
        tasks.add(createTask(employees.get(1), interactions.get(6), "Implement task subtasks feature", "Add checklist functionality to tasks", false, minusDays(now, 2)));
        tasks.add(createTask(employees.get(2), interactions.get(7), "Refactor interaction service", "Improve code structure and add validation", false, minusDays(now, 1)));
        tasks.add(createTask(employees.get(3), null, "Learn Angular signals", "Complete Angular signals tutorial and apply to components", false, minusDays(now, 1)));
        tasks.add(createTask(employees.get(4), interactions.get(8), "User research for dashboard", "Conduct user interviews for dashboard improvements", false, minusDays(now, 3)));
        tasks.add(createTask(employees.get(5), interactions.get(9), "Create wireframes for mobile", "Design mobile-responsive layouts", false, minusDays(now, 2)));
        tasks.add(createTask(employees.get(6), interactions.get(10), "Define Q3 roadmap", "Prioritize features for next quarter", false, minusDays(now, 0)));
        tasks.add(createTask(employees.get(7), interactions.get(11), "Migrate to PostgreSQL 17", "Upgrade database version and test compatibility", false, minusDays(now, 4)));
        tasks.add(createTask(employees.get(0), interactions.get(12), "Code review backlog", "Review pending pull requests", false, minusDays(now, 0)));

        // TODO tasks (6)
        tasks.add(createTask(employees.get(1), null, "Implement caching layer", "Add Redis caching for frequently accessed data", false, minusDays(now, 0)));
        tasks.add(createTask(employees.get(2), null, "Add unit tests for interaction module", "Increase test coverage to 90%", false, minusDays(now, 0)));
        tasks.add(createTask(employees.get(3), null, "Investigate performance issue", "Profile application and identify bottlenecks", false, minusDays(now, 0)));
        tasks.add(createTask(employees.get(4), null, "Accessibility audit", "Review and fix WCAG compliance issues", false, minusDays(now, 0)));
        tasks.add(createTask(employees.get(5), null, "Update PrimeIcons", "Upgrade to latest PrimeIcons version", false, minusDays(now, 0)));
        tasks.add(createTask(employees.get(6), null, "Stakeholder demo preparation", "Prepare demo for executive review", false, minusDays(now, 0)));

        tasks = taskRepository.saveAll(tasks);
        log.info("{} Seeded {} tasks", SEED_PREFIX, tasks.size());
        return tasks;
    }

    private Task createTask(Employee subject, Interaction sourceInteraction, String title,
                            String description, boolean completed, Instant createdAt) {
        Task task = Task.builder()
                .subjectId(subject.getId())
                .sourceInteractionId(sourceInteraction != null ? sourceInteraction.getId() : null)
                .title(title)
                .description(description)
                .completed(completed)
                .createdAt(createdAt)
                .completedAt(completed ? createdAt.plusSeconds(3600) : null)
                .build();
        return task;
    }

    /**
     * Seeds 30+ task items (subtasks) across various tasks.
     */
    @Transactional
    protected void seedTaskItems(List<Task> tasks) {
        log.info("{} Seeding task items...", SEED_PREFIX);
        List<TaskItem> taskItems = new ArrayList<>();
        Instant now = Instant.now();

        // Subtasks for task 0 (Implement REST API endpoints)
        taskItems.add(createTaskItem(tasks.get(0), 0, "Create EmployeeController", true, now));
        taskItems.add(createTaskItem(tasks.get(0), 1, "Create EmployeeService", true, now));
        taskItems.add(createTaskItem(tasks.get(0), 2, "Create EmployeeRepository", true, now));
        taskItems.add(createTaskItem(tasks.get(0), 3, "Add unit tests", true, now));

        // Subtasks for task 6 (Implement task subtasks feature)
        taskItems.add(createTaskItem(tasks.get(6), 0, "Design database schema for TaskItem", true, now));
        taskItems.add(createTaskItem(tasks.get(6), 1, "Create TaskItem entity", true, now));
        taskItems.add(createTaskItem(tasks.get(6), 2, "Implement TaskItemRepository", true, now));
        taskItems.add(createTaskItem(tasks.get(6), 3, "Add TaskItem to Task DTO", false, now));
        taskItems.add(createTaskItem(tasks.get(6), 4, "Create UI for subtask management", false, now));

        // Subtasks for task 7 (Refactor interaction service)
        taskItems.add(createTaskItem(tasks.get(7), 0, "Extract validation logic", true, now));
        taskItems.add(createTaskItem(tasks.get(7), 1, "Add error handling", false, now));
        taskItems.add(createTaskItem(tasks.get(7), 2, "Improve logging", false, now));

        // Subtasks for task 8 (Learn Angular signals)
        taskItems.add(createTaskItem(tasks.get(8), 0, "Complete Angular.dev tutorial", false, now));
        taskItems.add(createTaskItem(tasks.get(8), 1, "Refactor one component to use signals", false, now));
        taskItems.add(createTaskItem(tasks.get(8), 2, "Document learnings for team", false, now));

        // Subtasks for task 9 (User research for dashboard)
        taskItems.add(createTaskItem(tasks.get(9), 0, "Prepare interview questions", true, now));
        taskItems.add(createTaskItem(tasks.get(9), 1, "Schedule 5 user interviews", false, now));
        taskItems.add(createTaskItem(tasks.get(9), 2, "Conduct interviews", false, now));
        taskItems.add(createTaskItem(tasks.get(9), 3, "Synthesize findings", false, now));

        // Subtasks for task 10 (Create wireframes for mobile)
        taskItems.add(createTaskItem(tasks.get(10), 0, "Audit current layouts", true, now));
        taskItems.add(createTaskItem(tasks.get(10), 1, "Design mobile breakpoints", false, now));
        taskItems.add(createTaskItem(tasks.get(10), 2, "Create responsive components", false, now));

        // Subtasks for task 11 (Define Q3 roadmap)
        taskItems.add(createTaskItem(tasks.get(11), 0, "Gather stakeholder input", false, now));
        taskItems.add(createTaskItem(tasks.get(11), 1, "Prioritize feature requests", false, now));
        taskItems.add(createTaskItem(tasks.get(11), 2, "Create roadmap presentation", false, now));

        // Subtasks for task 12 (Migrate to PostgreSQL 17)
        taskItems.add(createTaskItem(tasks.get(12), 0, "Test in development environment", true, now));
        taskItems.add(createTaskItem(tasks.get(12), 1, "Update docker-compose.yml", false, now));
        taskItems.add(createTaskItem(tasks.get(12), 2, "Run migration scripts", false, now));
        taskItems.add(createTaskItem(tasks.get(12), 3, "Verify application compatibility", false, now));

        taskItemRepository.saveAll(taskItems);
        log.info("{} Seeded {} task items", SEED_PREFIX, taskItems.size());
    }

    private TaskItem createTaskItem(Task task, int ordinal, String title, boolean completed, Instant createdAt) {
        TaskItem item = new TaskItem();
        Long rawId = task.getId() != null ? task.getId().value() : null;
        item.setTaskId(rawId);
        item.setOrdinal(ordinal);
        item.setTitle(title);
        item.setCompleted(completed);
        item.setCreatedAt(createdAt);
        return item;
    }

    /**
     * Seeds 40+ skills across employees with varied experience levels.
     */
    @Transactional
    protected void seedSkills(List<Portfolio> portfolios) {
        log.info("{} Seeding skills...", SEED_PREFIX);
        List<PortfolioSkill> skills = new ArrayList<>();
        Instant now = Instant.now();

        // Portfolio 0: Sarah Johnson (ADMIN, Engineering Manager) - Leadership & Technical
        skills.add(createSkill(portfolios.get(0), "Leadership", 10, 5, now));
        skills.add(createSkill(portfolios.get(0), "Team Management", 8, 4, now));
        skills.add(createSkill(portfolios.get(0), "Agile/Scrum", 7, 4, now));
        skills.add(createSkill(portfolios.get(0), "Java", 12, 5, now));
        skills.add(createSkill(portfolios.get(0), "Spring Boot", 8, 4, now));
        skills.add(createSkill(portfolios.get(0), "Communication", 10, 5, now));

        // Portfolio 1: Michael Chen (Senior Developer) - Backend focused
        skills.add(createSkill(portfolios.get(1), "Java", 10, 5, now));
        skills.add(createSkill(portfolios.get(1), "Spring Boot", 8, 5, now));
        skills.add(createSkill(portfolios.get(1), "PostgreSQL", 7, 4, now));
        skills.add(createSkill(portfolios.get(1), "Microservices", 6, 3, now));
        skills.add(createSkill(portfolios.get(1), "Docker", 5, 3, now));
        skills.add(createSkill(portfolios.get(1), "Kubernetes", 4, 2, now));
        skills.add(createSkill(portfolios.get(1), "Git", 8, 5, now));
        skills.add(createSkill(portfolios.get(1), "CI/CD", 6, 3, now));
        skills.add(createSkill(portfolios.get(1), "Mentoring", 5, 4, now));

        // Portfolio 2: Emily Davis (Developer) - Full stack
        skills.add(createSkill(portfolios.get(2), "Java", 5, 4, now));
        skills.add(createSkill(portfolios.get(2), "Spring Boot", 4, 3, now));
        skills.add(createSkill(portfolios.get(2), "Angular", 4, 3, now));
        skills.add(createSkill(portfolios.get(2), "TypeScript", 4, 3, now));
        skills.add(createSkill(portfolios.get(2), "JavaScript", 5, 4, now));
        skills.add(createSkill(portfolios.get(2), "HTML/CSS", 5, 4, now));
        skills.add(createSkill(portfolios.get(2), "Git", 4, 4, now));
        skills.add(createSkill(portfolios.get(2), "Problem Solving", 5, 4, now));

        // Portfolio 3: James Wilson (Junior Developer) - Learning
        skills.add(createSkill(portfolios.get(3), "Java", 2, 2, now));
        skills.add(createSkill(portfolios.get(3), "Spring Boot", 1, 1, now));
        skills.add(createSkill(portfolios.get(3), "Angular", 2, 2, now));
        skills.add(createSkill(portfolios.get(3), "TypeScript", 2, 2, now));
        skills.add(createSkill(portfolios.get(3), "Git", 2, 2, now));
        skills.add(createSkill(portfolios.get(3), "HTML/CSS", 3, 2, now));
        skills.add(createSkill(portfolios.get(3), "Learning Agility", 4, 3, now));

        // Portfolio 4: Lisa Anderson (UX Designer) - Design focused
        skills.add(createSkill(portfolios.get(4), "UX Design", 8, 5, now));
        skills.add(createSkill(portfolios.get(4), "User Research", 7, 4, now));
        skills.add(createSkill(portfolios.get(4), "Figma", 6, 4, now));
        skills.add(createSkill(portfolios.get(4), "Wireframing", 7, 4, now));
        skills.add(createSkill(portfolios.get(4), "Prototyping", 6, 4, now));
        skills.add(createSkill(portfolios.get(4), "Usability Testing", 5, 3, now));
        skills.add(createSkill(portfolios.get(4), "Design Systems", 6, 4, now));
        skills.add(createSkill(portfolios.get(4), "Communication", 7, 4, now));

        // Portfolio 5: Robert Brown (UI Designer) - Visual design
        skills.add(createSkill(portfolios.get(5), "UI Design", 6, 4, now));
        skills.add(createSkill(portfolios.get(5), "Figma", 5, 4, now));
        skills.add(createSkill(portfolios.get(5), "HTML/CSS", 5, 3, now));
        skills.add(createSkill(portfolios.get(5), "SCSS", 4, 3, now));
        skills.add(createSkill(portfolios.get(5), "PrimeNG", 3, 2, now));
        skills.add(createSkill(portfolios.get(5), "JavaScript", 3, 2, now));
        skills.add(createSkill(portfolios.get(5), "Visual Design", 6, 4, now));
        skills.add(createSkill(portfolios.get(5), "Creativity", 5, 4, now));

        // Portfolio 6: Maria Garcia (Product Owner) - Product focused
        skills.add(createSkill(portfolios.get(6), "Product Management", 8, 5, now));
        skills.add(createSkill(portfolios.get(6), "Agile/Scrum", 7, 5, now));
        skills.add(createSkill(portfolios.get(6), "Stakeholder Management", 7, 4, now));
        skills.add(createSkill(portfolios.get(6), "Roadmap Planning", 6, 4, now));
        skills.add(createSkill(portfolios.get(6), "User Story Mapping", 6, 4, now));
        skills.add(createSkill(portfolios.get(6), "Jira", 7, 5, now));
        skills.add(createSkill(portfolios.get(6), "Communication", 8, 5, now));
        skills.add(createSkill(portfolios.get(6), "Leadership", 6, 4, now));

        // Portfolio 7: David Martinez (DevOps Engineer) - Infrastructure
        skills.add(createSkill(portfolios.get(7), "Docker", 7, 5, now));
        skills.add(createSkill(portfolios.get(7), "Kubernetes", 6, 4, now));
        skills.add(createSkill(portfolios.get(7), "CI/CD", 7, 5, now));
        skills.add(createSkill(portfolios.get(7), "Jenkins", 6, 4, now));
        skills.add(createSkill(portfolios.get(7), "Azure DevOps", 5, 3, now));
        skills.add(createSkill(portfolios.get(7), "AWS", 5, 3, now));
        skills.add(createSkill(portfolios.get(7), "PostgreSQL", 5, 3, now));
        skills.add(createSkill(portfolios.get(7), "Linux", 7, 4, now));
        skills.add(createSkill(portfolios.get(7), "Scripting", 6, 4, now));

        portfolioSkillRepository.saveAll(skills);
        log.info("{} Seeded {} skills", SEED_PREFIX, skills.size());
    }

    private PortfolioSkill createSkill(Portfolio portfolio, String skillName, int yearsExp, int projectCount, Instant now) {
        PortfolioSkill ps = new PortfolioSkill();
        ps.setPortfolioId(portfolio.getId());
        ps.setSkill(skillName);
        ps.setYears(yearsExp);
        ps.setProjectCount(projectCount);
        return ps;
    }

    private Instant minusDays(Instant instant, long days) {
        return instant.minus(days, ChronoUnit.DAYS);
    }
}
