package com.staffengagement.portfolio.controller;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.BDDMockito.given;
import static org.mockito.BDDMockito.then;
import static org.mockito.Mockito.verify;

import com.staffengagement.portfolio.service.EmployeeNotFoundException;
import com.staffengagement.portfolio.service.PortfolioService;
import com.staffengagement.portfolio.service.PortfolioView;
import com.staffengagement.shared.kernel.EmployeeId;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

/**
 * BDD unit tests for {@link PortfolioController} (Phase 4 / testing-strategy.yaml).
 *
 * <p>The service is mocked — no Spring MVC context (per {@code testing-strategy.yaml}:
 * unit tests only). Verifies path→{@link EmployeeId} binding, the 201/204 status codes,
 * the {@code PUT} body's employeeId being pinned to the path, and that 404 domain
 * exceptions propagate for the {@link PortfolioErrorHandler} to map.
 */
@ExtendWith(MockitoExtension.class)
class PortfolioControllerTest {

    @Mock
    private PortfolioService portfolioService;

    @InjectMocks
    private PortfolioController controller;

    private static PortfolioView emptyView() {
        return new PortfolioView(1L, List.of(), List.of(), List.of(), List.of());
    }

    @Test
    void getPortfolioBindsPathIdAndReturnsServiceView() {
        // Given — the service returns the portfolio view for employee 1
        PortfolioView view = new PortfolioView(1L,
                List.of(new PortfolioView.SkillView(10L, "Angular", 5, 9)),
                List.of(), List.of(), List.of());
        given(portfolioService.getPortfolio(new EmployeeId(1L))).willReturn(view);

        // When
        PortfolioView result = controller.getPortfolio(1L);

        // Then
        assertThat(result).isEqualTo(view);
        assertThat(result.skills()).hasSize(1);
        assertThat(result.skills().get(0).projectCount()).isEqualTo(9);
    }

    @Test
    void getPortfolioPropagatesEmployeeNotFoundFor404Mapping() {
        // Given — the service raises the domain exception for an unknown employee
        given(portfolioService.getPortfolio(new EmployeeId(99L)))
                .willThrow(new EmployeeNotFoundException(99L));

        // When / Then — the controller raises it; PortfolioErrorHandler maps it to 404
        assertThatThrownBy(() -> controller.getPortfolio(99L))
                .isInstanceOf(EmployeeNotFoundException.class);
    }

    @Test
    void replacePortfolioPinsEmployeeIdToPathAndForwardsBody() {
        // Given — the service returns the replaced view
        PortfolioView body = new PortfolioView(999L, // deliberately mismatched; the path wins
                List.of(new PortfolioView.SkillView(null, "Angular", 1, 1)),
                List.of(), List.of(), List.of());
        PortfolioView replaced = emptyView();
        given(portfolioService.replacePortfolio(eq(new EmployeeId(1L)), any(PortfolioView.class)))
                .willReturn(replaced);

        // When
        PortfolioView result = controller.replacePortfolio(1L, body);

        // Then — the employeeId in the forwarded view is pinned to the path (1), not the body (999)
        then(portfolioService).should().replacePortfolio(eq(new EmployeeId(1L)), any(PortfolioView.class));
        assertThat(result).isEqualTo(replaced);
        verify(portfolioService).replacePortfolio(eq(new EmployeeId(1L)),
                org.mockito.ArgumentMatchers.argThat(v -> v.employeeId().equals(1L)));
    }

    @Test
    void addSkillReturns201WithCreatedEntry() {
        // Given — the service persists and returns the created skill with an id
        PortfolioView.SkillView created = new PortfolioView.SkillView(100L, "Angular", 5, 9);
        given(portfolioService.addSkill(eq(new EmployeeId(1L)), any())).willReturn(created);

        // When
        var response = controller.addSkill(1L, new PortfolioView.SkillView(null, "Angular", 5, 9));

        // Then
        assertThat(response.getStatusCode().value()).isEqualTo(201);
        assertThat(response.getBody()).isEqualTo(created);
    }

    @Test
    void updateSkillForwardsIdsAndEntry() {
        // Given
        PortfolioView.SkillView updated = new PortfolioView.SkillView(7L, "Angular", 6, 10);
        given(portfolioService.updateSkill(new EmployeeId(1L), 7L, new PortfolioView.SkillView(7L, "Angular", 6, 10)))
                .willReturn(updated);

        // When
        PortfolioView.SkillView result = controller.updateSkill(1L, 7L, new PortfolioView.SkillView(7L, "Angular", 6, 10));

        // Then
        assertThat(result).isEqualTo(updated);
        then(portfolioService).should().updateSkill(new EmployeeId(1L), 7L, new PortfolioView.SkillView(7L, "Angular", 6, 10));
    }

    @Test
    void deleteSkillReturns204() {
        // When
        var response = controller.deleteSkill(1L, 7L);

        // Then
        assertThat(response.getStatusCode().value()).isEqualTo(204);
        then(portfolioService).should().deleteSkill(new EmployeeId(1L), 7L);
    }

    @Test
    void addEducationAddProjectAddLinkReturn201() {
        // Given
        given(portfolioService.addEducation(eq(new EmployeeId(1L)), any()))
                .willReturn(new PortfolioView.EducationView(1L, "Uni", null, null, null));
        given(portfolioService.addProject(eq(new EmployeeId(1L)), any()))
                .willReturn(new PortfolioView.ProjectView(2L, "Portal", null, null, null));
        given(portfolioService.addLink(eq(new EmployeeId(1L)), any()))
                .willReturn(new PortfolioView.LinkView(3L, "GitHub", "https://gh"));

        // When / Then — each add returns 201
        assertThat(controller.addEducation(1L, new PortfolioView.EducationView(null, "Uni", null, null, null))
                .getStatusCode().value()).isEqualTo(201);
        assertThat(controller.addProject(1L, new PortfolioView.ProjectView(null, "Portal", null, null, null))
                .getStatusCode().value()).isEqualTo(201);
        assertThat(controller.addLink(1L, new PortfolioView.LinkView(null, "GitHub", "https://gh"))
                .getStatusCode().value()).isEqualTo(201);
    }

    @Test
    void deleteEducationDeleteProjectDeleteLinkReturn204() {
        // When / Then — each delete returns 204 and forwards the ids
        assertThat(controller.deleteEducation(1L, 1L).getStatusCode().value()).isEqualTo(204);
        assertThat(controller.deleteProject(1L, 2L).getStatusCode().value()).isEqualTo(204);
        assertThat(controller.deleteLink(1L, 3L).getStatusCode().value()).isEqualTo(204);
        then(portfolioService).should().deleteEducation(new EmployeeId(1L), 1L);
        then(portfolioService).should().deleteProject(new EmployeeId(1L), 2L);
        then(portfolioService).should().deleteLink(new EmployeeId(1L), 3L);
    }

    @Test
    void updateEducationForwardsIdsAndReturnsServiceView() {
        // Given
        PortfolioView.EducationView updated = new PortfolioView.EducationView(7L, "New", "PhD", 2010, 2014);
        PortfolioView.EducationView entry = new PortfolioView.EducationView(7L, "New", "PhD", 2010, 2014);
        given(portfolioService.updateEducation(new EmployeeId(1L), 7L, entry)).willReturn(updated);

        // When
        PortfolioView.EducationView result = controller.updateEducation(1L, 7L, entry);

        // Then
        assertThat(result).isEqualTo(updated);
        then(portfolioService).should().updateEducation(new EmployeeId(1L), 7L, entry);
    }

    @Test
    void updateProjectForwardsIdsAndReturnsServiceView() {
        // Given
        PortfolioView.ProjectView updated = new PortfolioView.ProjectView(8L, "New", "d", 2020, 2021);
        PortfolioView.ProjectView entry = new PortfolioView.ProjectView(8L, "New", "d", 2020, 2021);
        given(portfolioService.updateProject(new EmployeeId(1L), 8L, entry)).willReturn(updated);

        // When
        PortfolioView.ProjectView result = controller.updateProject(1L, 8L, entry);

        // Then
        assertThat(result).isEqualTo(updated);
        then(portfolioService).should().updateProject(new EmployeeId(1L), 8L, entry);
    }

    @Test
    void updateLinkForwardsIdsAndReturnsServiceView() {
        // Given
        PortfolioView.LinkView updated = new PortfolioView.LinkView(9L, "GitHub", "https://gh");
        PortfolioView.LinkView entry = new PortfolioView.LinkView(9L, "GitHub", "https://gh");
        given(portfolioService.updateLink(new EmployeeId(1L), 9L, entry)).willReturn(updated);

        // When
        PortfolioView.LinkView result = controller.updateLink(1L, 9L, entry);

        // Then
        assertThat(result).isEqualTo(updated);
        then(portfolioService).should().updateLink(new EmployeeId(1L), 9L, entry);
    }
}