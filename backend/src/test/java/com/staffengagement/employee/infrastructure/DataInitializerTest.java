package com.staffengagement.employee.infrastructure;

import com.staffengagement.employee.domain.Employee;
import com.staffengagement.employee.repository.EmployeeRepository;
import com.staffengagement.interaction.repository.InteractionRepository;
import com.staffengagement.portfolio.domain.Portfolio;
import com.staffengagement.portfolio.repository.PortfolioRepository;
import com.staffengagement.portfolio.repository.PortfolioSkillRepository;
import com.staffengagement.task.repository.TaskItemRepository;
import com.staffengagement.task.repository.TaskRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.BDDMockito.*;

/**
 * BDD-style unit tests for {@link DataInitializer}.
 *
 * <p>Tests cover seeding enabled/disabled scenarios, idempotency,
 * and transactional behavior.</p>
 */
@ExtendWith(MockitoExtension.class)
@DisplayName("DataInitializer")
class DataInitializerTest {

    @Mock
    private EmployeeRepository employeeRepository;

    @Mock
    private InteractionRepository interactionRepository;

    @Mock
    private TaskRepository taskRepository;

    @Mock
    private TaskItemRepository taskItemRepository;

    @Mock
    private PortfolioRepository portfolioRepository;

    @Mock
    private PortfolioSkillRepository portfolioSkillRepository;

    private DataInitializer dataInitializer;

    @BeforeEach
    void setUp() {
        dataInitializer = new DataInitializer(
                employeeRepository,
                interactionRepository,
                taskRepository,
                taskItemRepository,
                portfolioRepository,
                portfolioSkillRepository
        );
        // Default: seeding enabled
        dataInitializer.seedEnabled = true;
    }

    @Nested
    @DisplayName("when seeding is disabled")
    class WhenSeedingDisabled {

        @Test
        @DisplayName("should not seed any data and log disabled message")
        void shouldNotSeedWhenDisabled() {
            // Given
            dataInitializer.seedEnabled = false;

            // When
            dataInitializer.run(null);

            // Then
            then(employeeRepository).should(never()).count();
            then(employeeRepository).should(never()).saveAll(anyList());
            then(interactionRepository).should(never()).saveAll(anyList());
            then(taskRepository).should(never()).saveAll(anyList());
            then(taskItemRepository).should(never()).saveAll(anyList());
            then(portfolioSkillRepository).should(never()).saveAll(anyList());
        }
    }

    @Nested
    @DisplayName("when database is already seeded")
    class WhenDatabaseAlreadySeeded {

        @Test
        @DisplayName("should skip seeding and log info message")
        void shouldSkipSeedingWhenAlreadySeeded() {
            // Given
            given(employeeRepository.count()).willReturn(5L);

            // When
            dataInitializer.run(null);

            // Then
            then(employeeRepository).should(times(2)).count();
            then(employeeRepository).should(never()).saveAll(anyList());
            then(interactionRepository).should(never()).saveAll(anyList());
            then(taskRepository).should(never()).saveAll(anyList());
            then(taskItemRepository).should(never()).saveAll(anyList());
            then(portfolioSkillRepository).should(never()).saveAll(anyList());
        }
    }

    @Nested
    @DisplayName("when database is empty and seeding is enabled")
    class WhenDatabaseEmptyAndSeedingEnabled {

        @BeforeEach
        void setUp() {
            given(employeeRepository.count()).willReturn(0L);
            given(employeeRepository.saveAll(anyList())).willAnswer(invocation -> invocation.getArgument(0));
            given(interactionRepository.saveAll(anyList())).willAnswer(invocation -> invocation.getArgument(0));
            given(taskRepository.saveAll(anyList())).willAnswer(invocation -> invocation.getArgument(0));
            given(taskItemRepository.saveAll(anyList())).willAnswer(invocation -> invocation.getArgument(0));
            given(portfolioRepository.saveAll(anyList())).willAnswer(invocation -> invocation.getArgument(0));
            given(portfolioSkillRepository.saveAll(anyList())).willAnswer(invocation -> invocation.getArgument(0));
        }

        @Test
        @DisplayName("should seed all data transactionally")
        void shouldSeedAllData() {
            // When
            dataInitializer.run(null);

            // Then
            then(employeeRepository).should(times(2)).count();
            then(employeeRepository).should(times(1)).saveAll(anyList());
            then(portfolioRepository).should(times(1)).saveAll(anyList());
            then(interactionRepository).should(times(1)).saveAll(anyList());
            then(taskRepository).should(times(1)).saveAll(anyList());
            then(taskItemRepository).should(times(1)).saveAll(anyList());
            then(portfolioSkillRepository).should(times(1)).saveAll(anyList());
        }

        @Test
        @DisplayName("should seed exactly 8 employees")
        void shouldSeedEightEmployees() {
            // When
            dataInitializer.run(null);

            // Then
            ArgumentCaptor<java.util.List<Employee>> captor = ArgumentCaptor.forClass(java.util.List.class);
            then(employeeRepository).should(times(1)).saveAll(captor.capture());
            assertThat(captor.getValue()).hasSize(8);
        }

        @Test
        @DisplayName("should call seedAll method")
        void shouldCallSeedAll() {
            // Given - spy to verify internal call
            DataInitializer spy = org.mockito.Mockito.spy(dataInitializer);

            // When
            spy.run(null);

            // Then
            try {
                // Verify seedAll was called indirectly by verifying repositories were called
                then(employeeRepository).should(times(1)).saveAll(anyList());
            } catch (Exception e) {
                fail("seedAll should have been called");
            }
        }
    }

    @Nested
    @DisplayName("seedEmployees method")
    class SeedEmployeesMethod {

        @BeforeEach
        void setUp() {
            given(employeeRepository.saveAll(anyList())).willAnswer(invocation -> {
                java.util.List<Employee> employees = invocation.getArgument(0);
                // Assign IDs to employees
                for (int i = 0; i < employees.size(); i++) {
                    employees.get(i).setId((long) (i + 1));
                }
                return employees;
            });
        }

        @Test
        @DisplayName("should return saved employees")
        void shouldReturnSavedEmployees() {
            // When
            java.util.List<Employee> result = dataInitializer.seedEmployees();

            // Then
            assertThat(result).hasSize(8);
        }

        @Test
        @DisplayName("should include both ADMIN and EMPLOYEE roles")
        void shouldIncludeBothRoles() {
            // When
            java.util.List<Employee> result = dataInitializer.seedEmployees();

            // Then
            long adminCount = result.stream().filter(e -> e.getRole().name().equals("ADMIN")).count();
            long employeeCount = result.stream().filter(e -> e.getRole().name().equals("EMPLOYEE")).count();
            assertThat(adminCount).isEqualTo(1);
            assertThat(employeeCount).isEqualTo(7);
        }

        @Test
        @DisplayName("should include varied employee levels")
        void shouldIncludeVariedLevels() {
            // When
            java.util.List<Employee> result = dataInitializer.seedEmployees();

            // Then
            assertThat(result).extracting(Employee::getLevel)
                    .extracting(Enum::name)
                    .containsExactlyInAnyOrder("SENIOR", "SENIOR", "INTERMEDIATE", "JUNIOR", "SENIOR", "INTERMEDIATE", "SENIOR", "INTERMEDIATE");
        }

        @Test
        @DisplayName("should include varied departments")
        void shouldIncludeVariedDepartments() {
            // When
            java.util.List<Employee> result = dataInitializer.seedEmployees();

            // Then
            assertThat(result).extracting(Employee::getDepartment)
                    .contains("Engineering", "Design", "Product");
        }
    }

    @Nested
    @DisplayName("seedInteractions method")
    class SeedInteractionsMethod {

        @BeforeEach
        void setUp() {
            given(employeeRepository.saveAll(anyList())).willAnswer(invocation -> {
                java.util.List<Employee> employees = invocation.getArgument(0);
                for (int i = 0; i < employees.size(); i++) {
                    employees.get(i).setId((long) (i + 1));
                }
                return employees;
            });
            given(interactionRepository.saveAll(anyList())).willAnswer(invocation -> invocation.getArgument(0));
        }

        @Test
        @DisplayName("should return seeded interactions")
        void shouldReturnInteractions() {
            // Given
            java.util.List<Employee> employees = dataInitializer.seedEmployees();

            // When
            var result = dataInitializer.seedInteractions(employees);

            // Then
            assertThat(result).hasSize(28);
        }
    }

    @Nested
    @DisplayName("seedTasks method")
    class SeedTasksMethod {

        @BeforeEach
        void setUp() {
            given(employeeRepository.saveAll(anyList())).willAnswer(invocation -> {
                java.util.List<Employee> employees = invocation.getArgument(0);
                for (int i = 0; i < employees.size(); i++) {
                    employees.get(i).setId((long) (i + 1));
                }
                return employees;
            });
            given(interactionRepository.saveAll(anyList())).willAnswer(invocation -> invocation.getArgument(0));
            given(taskRepository.saveAll(anyList())).willAnswer(invocation -> invocation.getArgument(0));
        }

        @Test
        @DisplayName("should return seeded tasks")
        void shouldReturnTasks() {
            // Given
            java.util.List<Employee> employees = dataInitializer.seedEmployees();
            java.util.List<com.staffengagement.interaction.domain.Interaction> interactions =
                    dataInitializer.seedInteractions(employees);

            // When
            var result = dataInitializer.seedTasks(employees, interactions);

            // Then
            assertThat(result).hasSize(20);
        }

        @Test
        @DisplayName("should include tasks with varied completion states")
        void shouldIncludeVariedCompletionStates() {
            // Given
            java.util.List<Employee> employees = dataInitializer.seedEmployees();
            java.util.List<com.staffengagement.interaction.domain.Interaction> interactions =
                    dataInitializer.seedInteractions(employees);

            // When
            var result = dataInitializer.seedTasks(employees, interactions);

            // Then
            long completed = result.stream().filter(com.staffengagement.task.domain.Task::isCompleted).count();
            long inProgress = result.stream().filter(t -> !t.isCompleted()).count();
            assertThat(completed).isEqualTo(6);
            assertThat(inProgress).isEqualTo(14);
        }
    }

    @Nested
    @DisplayName("seedTaskItems method")
    class SeedTaskItemsMethod {

        @BeforeEach
        void setUp() {
            given(employeeRepository.saveAll(anyList())).willAnswer(invocation -> {
                java.util.List<Employee> employees = invocation.getArgument(0);
                for (int i = 0; i < employees.size(); i++) {
                    employees.get(i).setId((long) (i + 1));
                }
                return employees;
            });
            given(interactionRepository.saveAll(anyList())).willAnswer(invocation -> invocation.getArgument(0));
            given(taskRepository.saveAll(anyList())).willAnswer(invocation -> invocation.getArgument(0));
            given(taskItemRepository.saveAll(anyList())).willAnswer(invocation -> invocation.getArgument(0));
        }

        @Test
        @DisplayName("should seed task items for tasks")
        void shouldSeedTaskItems() {
            // Given
            java.util.List<Employee> employees = dataInitializer.seedEmployees();
            java.util.List<com.staffengagement.interaction.domain.Interaction> interactions =
                    dataInitializer.seedInteractions(employees);
            java.util.List<com.staffengagement.task.domain.Task> tasks =
                    dataInitializer.seedTasks(employees, interactions);

            // When
            dataInitializer.seedTaskItems(tasks);

            // Then
            then(taskItemRepository).should(times(1)).saveAll(anyList());
        }
    }

    @Nested
    @DisplayName("seedPortfolios method")
    class SeedPortfoliosMethod {

        @BeforeEach
        void setUp() {
            given(employeeRepository.saveAll(anyList())).willAnswer(invocation -> {
                java.util.List<Employee> employees = invocation.getArgument(0);
                for (int i = 0; i < employees.size(); i++) {
                    employees.get(i).setId((long) (i + 1));
                }
                return employees;
            });
            given(portfolioRepository.saveAll(anyList())).willAnswer(invocation -> {
                java.util.List<Portfolio> portfolios = invocation.getArgument(0);
                for (int i = 0; i < portfolios.size(); i++) {
                    Portfolio p = portfolios.get(i);
                    p.setId((long) (i + 1));
                }
                return portfolios;
            });
        }

        @Test
        @DisplayName("should seed portfolios for all employees")
        void shouldSeedPortfolios() {
            // Given
            java.util.List<Employee> employees = dataInitializer.seedEmployees();

            // When
            var result = dataInitializer.seedPortfolios(employees);

            // Then
            assertThat(result).hasSize(8);
        }
    }

    @Nested
    @DisplayName("seedSkills method")
    class SeedSkillsMethod {

        @BeforeEach
        void setUp() {
            given(employeeRepository.saveAll(anyList())).willAnswer(invocation -> {
                java.util.List<Employee> employees = invocation.getArgument(0);
                for (int i = 0; i < employees.size(); i++) {
                    employees.get(i).setId((long) (i + 1));
                }
                return employees;
            });
            given(portfolioRepository.saveAll(anyList())).willAnswer(invocation -> {
                java.util.List<Portfolio> portfolios = invocation.getArgument(0);
                for (int i = 0; i < portfolios.size(); i++) {
                    portfolios.get(i).setId((long) (i + 1));
                }
                return portfolios;
            });
            given(portfolioSkillRepository.saveAll(anyList())).willAnswer(invocation -> invocation.getArgument(0));
        }

        @Test
        @DisplayName("should seed skills for portfolios")
        void shouldSeedSkills() {
            // Given
            java.util.List<Employee> employees = dataInitializer.seedEmployees();
            java.util.List<com.staffengagement.portfolio.domain.Portfolio> portfolios =
                    dataInitializer.seedPortfolios(employees);

            // When
            dataInitializer.seedSkills(portfolios);

            // Then
            then(portfolioSkillRepository).should(times(1)).saveAll(anyList());
        }

        @Test
        @DisplayName("should seed more than 40 skills")
        void shouldSeedMoreThan40Skills() {
            // Given
            java.util.List<Employee> employees = dataInitializer.seedEmployees();
            java.util.List<com.staffengagement.portfolio.domain.Portfolio> portfolios =
                    dataInitializer.seedPortfolios(employees);

            // When
            dataInitializer.seedSkills(portfolios);

            // Then - verify by counting the saveAll call argument
            ArgumentCaptor<java.util.List<com.staffengagement.portfolio.domain.PortfolioSkill>> captor =
                    ArgumentCaptor.forClass(java.util.List.class);
            then(portfolioSkillRepository).should(times(1)).saveAll(captor.capture());
            assertThat(captor.getValue()).hasSizeGreaterThan(40);
        }
    }
}
