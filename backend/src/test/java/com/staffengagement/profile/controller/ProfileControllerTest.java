package com.staffengagement.profile.controller;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.BDDMockito.given;
import static org.mockito.BDDMockito.then;

import com.staffengagement.profile.service.PersonProfile;
import com.staffengagement.profile.service.ProfileNotFoundException;
import com.staffengagement.profile.service.ProfileService;
import com.staffengagement.profile.service.SkillWithStrength;
import com.staffengagement.shared.kernel.EmployeeRole;
import com.staffengagement.shared.api.EmployeeSummary;
import com.staffengagement.shared.api.InteractionSummary;
import com.staffengagement.shared.api.PortfolioSummary;
import com.staffengagement.shared.api.TaskSummary;
import com.staffengagement.shared.kernel.EmployeeId;
import java.util.Collections;
import java.util.List;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

/**
 * BDD unit tests for {@link ProfileController}. The service is mocked and the controller
 * is exercised directly — no Spring MVC context (per {@code testing-strategy.yaml}).
 */
@ExtendWith(MockitoExtension.class)
class ProfileControllerTest {

    @Mock
    private ProfileService profileService;

    @InjectMocks
    private ProfileController controller;

    @Test
    @DisplayName("Should return 200 with profile when found")
    void getProfile_found_returns200WithProfile() {
        // Given
        EmployeeId id = new EmployeeId(7L);
        EmployeeSummary employee = new EmployeeSummary(
                id, "Jane Doe", "jane@staff.eng", EmployeeRole.EMPLOYEE, "Engineer", "Engineering", "Senior");
        PersonProfile profile = new PersonProfile(
                employee,
                Collections.emptyList(),
                Collections.emptyList(),
                new PortfolioSummary(id, Collections.emptyList(), Collections.emptyList(), Collections.emptyList(), Collections.emptyList()),
                List.of(new SkillWithStrength("Java", 5, 3)));
        given(profileService.profileFor(id)).willReturn(profile);

        // When
        ResponseEntity<PersonProfile> response = controller.getProfile(7L);

        // Then
        then(profileService).should().profileFor(id);
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody()).isEqualTo(profile);
    }

    @Test
    @DisplayName("Should let ProfileNotFoundException propagate to the error handler")
    void getProfile_notFound_throwsDomainException() {
        // Given
        EmployeeId id = new EmployeeId(99L);
        given(profileService.profileFor(id)).willThrow(new ProfileNotFoundException(id));

        // When / Then
        assertThatThrownBy(() -> controller.getProfile(99L))
                .isInstanceOf(ProfileNotFoundException.class);
    }

    @Test
    @DisplayName("Should bind the path variable to an EmployeeId")
    void getProfile_bindsPathVariableToEmployeeId() {
        // Given
        given(profileService.profileFor(new EmployeeId(42L))).willReturn(personProfile(new EmployeeId(42L)));

        // When
        controller.getProfile(42L);

        // Then
        then(profileService).should().profileFor(new EmployeeId(42L));
    }

    private PersonProfile personProfile(EmployeeId id) {
        return new PersonProfile(
                new EmployeeSummary(id, "Name", "name@staff.eng", EmployeeRole.EMPLOYEE, null, null, null),
                Collections.emptyList(),
                Collections.emptyList(),
                new PortfolioSummary(id, Collections.emptyList(), Collections.emptyList(), Collections.emptyList(), Collections.emptyList()),
                Collections.emptyList());
    }
}
