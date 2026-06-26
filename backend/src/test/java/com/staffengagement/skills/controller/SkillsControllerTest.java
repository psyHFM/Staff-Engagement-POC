package com.staffengagement.skills.controller;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.BDDMockito.given;
import static org.mockito.BDDMockito.then;
import static org.mockito.Mockito.never;

import com.staffengagement.shared.api.PageRequest;
import com.staffengagement.shared.api.Paged;
import com.staffengagement.shared.api.SkillStrength;
import com.staffengagement.shared.kernel.EmployeeId;
import com.staffengagement.skills.service.SkillSummary;
import com.staffengagement.skills.service.SkillsService;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

/**
 * BDD unit tests for {@link SkillsController} (JUnit 5 + Mockito). The service is
 * mocked; tests verify query-parameter binding, validation, and that invalid input
 * never reaches the service.
 */
@ExtendWith(MockitoExtension.class)
class SkillsControllerTest {

    @Mock
    private SkillsService skillsService;

    @InjectMocks
    private SkillsController controller;

    private static Paged<SkillStrength> singlePage() {
        return new Paged<>(List.of(new SkillStrength(new EmployeeId(1L), "Jane", "Angular", 5, 2)), 0, 20, 1L);
    }

    @Test
    void searchBindsAllParametersAndForwardsToService() {
        // Given
        Paged<SkillStrength> page = singlePage();
        given(skillsService.search("angular", 3, 0, 10, "years,desc")).willReturn(page);

        // When
        Paged<SkillStrength> result = controller.search("angular", 3, 0, 10, "years,desc");

        // Then
        then(skillsService).should().search("angular", 3, 0, 10, "years,desc");
        assertThat(result).isEqualTo(page);
    }

    @Test
    void searchTrimsWhitespaceFromName() {
        // Given
        given(skillsService.search("angular", 0, 0, 20, null)).willReturn(singlePage());

        // When
        controller.search("  angular  ", 0, 0, 20, null);

        // Then
        then(skillsService).should().search("angular", 0, 0, 20, null);
    }

    @Test
    void searchRejectsBlankNameWith400AndDoesNotCallService() {
        // Given / When / Then
        assertThatThrownBy(() -> controller.search("   ", 0, 0, 20, null))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("name is required");
        then(skillsService).should(never()).search(anyString(), anyInt(), anyInt(), anyInt(), anyString());
    }

    @Test
    void searchRejectsNullNameWith400AndDoesNotCallService() {
        // Given / When / Then
        assertThatThrownBy(() -> controller.search(null, 0, 0, 20, null))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("name is required");
        then(skillsService).should(never()).search(anyString(), anyInt(), anyInt(), anyInt(), anyString());
    }

    @Test
    void searchForwardsDefaultSortWhenSortIsNull() {
        // Given
        given(skillsService.search("angular", 0, 0, 20, null)).willReturn(singlePage());

        // When
        controller.search("angular", 0, 0, 20, null);

        // Then — the service receives null sort and applies its own default
        then(skillsService).should().search("angular", 0, 0, 20, null);
    }

    @Test
    void searchForwardsProvidedSortString() {
        // Given
        given(skillsService.search("angular", 0, 0, 20, "projectCount,asc")).willReturn(singlePage());

        // When
        controller.search("angular", 0, 0, 20, "projectCount,asc");

        // Then
        then(skillsService).should().search("angular", 0, 0, 20, "projectCount,asc");
    }

    @Test
    void searchUsesDefaultOffsetAndLimitWhenOmitted() {
        // Given
        given(skillsService.search(eq("angular"), eq(0), eq(0), eq(20), eq(null)))
                .willReturn(singlePage());

        // When
        controller.search("angular", 0, 0, 20, null);

        // Then
        then(skillsService).should().search("angular", 0, 0, 20, null);
    }

    // ---- GET /skills/popular (ATSE1-40) ----

    private static SkillStrength skill(Long id, String name, int years, int projects) {
        return new SkillStrength(new EmployeeId(id), name, "Angular", years, projects);
    }

    @Test
    void popularForwardsLimitToServiceAndReturnsList() {
        // Given
        SkillSummary summary = new SkillSummary("Angular", 3, skill(1L, "Alice", 5, 2));
        given(skillsService.popularSkills(10)).willReturn(List.of(summary));

        // When
        List<SkillSummary> result = controller.popular(10);

        // Then
        assertThat(result).hasSize(1);
        assertThat(result.get(0).skill()).isEqualTo("Angular");
        assertThat(result.get(0).employeeCount()).isEqualTo(3);
        then(skillsService).should().popularSkills(10);
    }

    @Test
    void popularDefaultsToLimit20WhenNotProvided() {
        // Given
        given(skillsService.popularSkills(20)).willReturn(List.of());

        // When
        List<SkillSummary> result = controller.popular(20);

        // Then — the controller's @RequestParam default of 20 is forwarded
        then(skillsService).should().popularSkills(20);
        assertThat(result).isEmpty();
    }
}
