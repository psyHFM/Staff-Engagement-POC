package com.staffengagement.profile.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.BDDMockito.given;
import static org.mockito.BDDMockito.then;

import com.staffengagement.shared.api.EmployeeContract;
import com.staffengagement.shared.kernel.EmployeeRole;
import com.staffengagement.shared.api.EmployeeSummary;
import com.staffengagement.shared.api.InteractionContract;
import com.staffengagement.shared.api.InteractionSummary;
import com.staffengagement.shared.kernel.InteractionType;
import com.staffengagement.shared.api.PortfolioContract;
import com.staffengagement.shared.api.PortfolioSummary;
import com.staffengagement.shared.api.TaskContract;
import com.staffengagement.shared.api.TaskSummary;
import com.staffengagement.shared.kernel.EmployeeId;
import com.staffengagement.shared.kernel.InteractionId;
import com.staffengagement.shared.kernel.TaskId;
import java.time.Instant;
import java.util.Collections;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

/**
 * BDD unit tests for {@link ProfileService} — verifies the rounded profile is assembled
 * from the four frozen contracts, missing employees raise {@link ProfileNotFoundException},
 * and top skills are sorted by years descending then project count descending.
 */
@ExtendWith(MockitoExtension.class)
class ProfileServiceTest {

    @Mock
    private EmployeeContract employeeContract;

    @Mock
    private InteractionContract interactionContract;

    @Mock
    private TaskContract taskContract;

    @Mock
    private PortfolioContract portfolioContract;

    @InjectMocks
    private ProfileService profileService;

    private EmployeeId employeeId;

    @BeforeEach
    void setUp() {
        employeeId = new EmployeeId(7L);
    }

    @Test
    @DisplayName("Should assemble a profile when the employee exists")
    void profileFor_existingEmployee_returnsAssembledProfile() {
        // Given
        EmployeeSummary employee = employeeSummary(employeeId);
        List<InteractionSummary> interactions = List.of(interactionSummary(new InteractionId(1L), employeeId));
        List<TaskSummary> tasks = List.of(taskSummary(new TaskId(10L), employeeId));
        PortfolioSummary portfolio = portfolioSummary(employeeId);

        given(employeeContract.findById(employeeId)).willReturn(Optional.of(employee));
        given(interactionContract.findBySubject(employeeId)).willReturn(interactions);
        given(taskContract.tasksForEmployee(employeeId)).willReturn(tasks);
        given(portfolioContract.portfolioFor(employeeId)).willReturn(portfolio);

        // When
        PersonProfile result = profileService.profileFor(employeeId);

        // Then
        then(employeeContract).should().findById(employeeId);
        then(interactionContract).should().findBySubject(employeeId);
        then(taskContract).should().tasksForEmployee(employeeId);
        then(portfolioContract).should().portfolioFor(employeeId);

        assertThat(result.employee()).isEqualTo(employee);
        assertThat(result.interactions()).containsExactlyElementsOf(interactions);
        assertThat(result.tasks()).containsExactlyElementsOf(tasks);
        assertThat(result.portfolio()).isEqualTo(portfolio);
        assertThat(result.topSkills()).hasSize(2);
        assertThat(result.topSkills().get(0).skill()).isEqualTo("Java");
        assertThat(result.topSkills().get(1).skill()).isEqualTo("Angular");
    }

    @Test
    @DisplayName("Should throw ProfileNotFoundException when the employee is absent")
    void profileFor_missingEmployee_throwsProfileNotFoundException() {
        // Given
        given(employeeContract.findById(employeeId)).willReturn(Optional.empty());

        // When / Then
        assertThatThrownBy(() -> profileService.profileFor(employeeId))
                .isInstanceOf(ProfileNotFoundException.class)
                .hasMessageContaining("Employee profile not found: 7");

        then(interactionContract).shouldHaveNoInteractions();
        then(taskContract).shouldHaveNoInteractions();
        then(portfolioContract).shouldHaveNoInteractions();
    }

    @Test
    @DisplayName("Should return empty collections when interactions, tasks and skills are absent")
    void profileFor_emptyCollections_returnsProfileWithEmptyLists() {
        // Given
        EmployeeSummary employee = employeeSummary(employeeId);
        PortfolioSummary emptyPortfolio = new PortfolioSummary(
                employeeId, Collections.emptyList(), Collections.emptyList(), Collections.emptyList(), Collections.emptyList());

        given(employeeContract.findById(employeeId)).willReturn(Optional.of(employee));
        given(interactionContract.findBySubject(employeeId)).willReturn(Collections.emptyList());
        given(taskContract.tasksForEmployee(employeeId)).willReturn(Collections.emptyList());
        given(portfolioContract.portfolioFor(employeeId)).willReturn(emptyPortfolio);

        // When
        PersonProfile result = profileService.profileFor(employeeId);

        // Then
        assertThat(result.interactions()).isEmpty();
        assertThat(result.tasks()).isEmpty();
        assertThat(result.portfolio().skills()).isEmpty();
        assertThat(result.topSkills()).isEmpty();
    }

    @Test
    @DisplayName("Should sort top skills by years descending then project count descending")
    void profileFor_skills_returnsTopSkillsSortedByYearsDesc() {
        // Given
        EmployeeSummary employee = employeeSummary(employeeId);
        PortfolioSummary portfolio = new PortfolioSummary(
                employeeId,
                List.of(
                        new com.staffengagement.shared.api.SkillStrength(employeeId, "Jane Doe", "TypeScript", 3, 4),
                        new com.staffengagement.shared.api.SkillStrength(employeeId, "Jane Doe", "Java", 5, 2),
                        new com.staffengagement.shared.api.SkillStrength(employeeId, "Jane Doe", "Angular", 5, 5)),
                Collections.emptyList(),
                Collections.emptyList(),
                Collections.emptyList());

        given(employeeContract.findById(employeeId)).willReturn(Optional.of(employee));
        given(interactionContract.findBySubject(employeeId)).willReturn(Collections.emptyList());
        given(taskContract.tasksForEmployee(employeeId)).willReturn(Collections.emptyList());
        given(portfolioContract.portfolioFor(employeeId)).willReturn(portfolio);

        // When
        PersonProfile result = profileService.profileFor(employeeId);

        // Then
        assertThat(result.topSkills()).extracting(SkillWithStrength::skill)
                .containsExactly("Angular", "Java", "TypeScript");
    }

    private EmployeeSummary employeeSummary(EmployeeId id) {
        return new EmployeeSummary(
                id, "Jane Doe", "jane@staff.eng", EmployeeRole.EMPLOYEE, "Engineer", "Engineering", "Senior");
    }

    private InteractionSummary interactionSummary(InteractionId id, EmployeeId subject) {
        return new InteractionSummary(
                id, InteractionType.CHECK_IN, subject, new EmployeeId(2L), "Great chat", Instant.now());
    }

    private TaskSummary taskSummary(TaskId id, EmployeeId subject) {
        return new TaskSummary(
                id, subject, "Read docs", new InteractionId(42L), false, "Read design doc");
    }

    private PortfolioSummary portfolioSummary(EmployeeId id) {
        return new PortfolioSummary(
                id,
                List.of(
                        new com.staffengagement.shared.api.SkillStrength(id, "Jane Doe", "Angular", 4, 3),
                        new com.staffengagement.shared.api.SkillStrength(id, "Jane Doe", "Java", 6, 4)),
                Collections.emptyList(),
                Collections.emptyList(),
                Collections.emptyList());
    }
}
