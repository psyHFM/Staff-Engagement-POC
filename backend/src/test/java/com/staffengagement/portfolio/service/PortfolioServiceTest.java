package com.staffengagement.portfolio.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.BDDMockito.given;
import static org.mockito.BDDMockito.then;
import static org.mockito.Mockito.doNothing;
import static org.mockito.Mockito.never;

import com.staffengagement.portfolio.domain.Portfolio;
import com.staffengagement.portfolio.domain.PortfolioEducation;
import com.staffengagement.portfolio.domain.PortfolioLink;
import com.staffengagement.portfolio.domain.PortfolioProject;
import com.staffengagement.portfolio.domain.PortfolioSkill;
import com.staffengagement.portfolio.repository.PortfolioEducationRepository;
import com.staffengagement.portfolio.repository.PortfolioLinkRepository;
import com.staffengagement.portfolio.repository.PortfolioProjectRepository;
import com.staffengagement.portfolio.repository.PortfolioRepository;
import com.staffengagement.portfolio.repository.PortfolioSkillRepository;
import com.staffengagement.shared.api.EmployeeContract;
import com.staffengagement.shared.api.EmployeeSummary;
import com.staffengagement.shared.api.PortfolioSummary;
import com.staffengagement.shared.api.SkillStrength;
import com.staffengagement.shared.kernel.Caller;
import com.staffengagement.shared.kernel.EmployeeId;
import com.staffengagement.shared.kernel.EmployeeRole;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;
import org.springframework.beans.factory.ObjectProvider;

/**
 * BDD unit tests for {@link PortfolioService} (Phase 4 / testing-strategy.yaml).
 *
 * <p>Given-When-Then style, Mockito-only — no database, no Spring context (integration
 * testing is disabled per the constitution). Covers the frozen {@link PortfolioContract}
 * read ({@code portfolioFor}) and the module write/read paths, including validation,
 * the idempotent 1:1 upsert, ownership filtering on sub-resource updates, and the
 * optional-{@link EmployeeContract} branches so mutation testing cannot weaken them.
 */
@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class PortfolioServiceTest {

    private static final EmployeeId EMPLOYEE = new EmployeeId(1L);
    private static final EmployeeId OTHER_EMPLOYEE = new EmployeeId(2L);
    /** Email-shaped principal for EMPLOYEE (the owner of the portfolio under test). */
    private static final String OWNER_EMAIL = "ada@staff.eng";
    private static final String OTHER_EMAIL = "other@staff.eng";
    private static final Caller OWNER = new Caller(OWNER_EMAIL, EmployeeRole.EMPLOYEE);
    private static final Caller ADMIN = new Caller("admin@staff.eng", EmployeeRole.ADMIN);

    @Mock
    private PortfolioRepository portfolioRepository;
    @Mock
    private PortfolioSkillRepository skillRepository;
    @Mock
    private PortfolioEducationRepository educationRepository;
    @Mock
    private PortfolioProjectRepository projectRepository;
    @Mock
    private PortfolioLinkRepository linkRepository;
    @Mock
    private ObjectProvider<EmployeeContract> employeeContractProvider;
    @Mock
    private EmployeeContract employeeContract;

    @InjectMocks
    private PortfolioService service;

    @BeforeEach
    void setUp() {
        given(employeeContractProvider.getIfAvailable()).willReturn(employeeContract);
        // Default: EMPLOYEE (id=1) is owned by ada@staff.eng. Tests that need a
        // different owner / an admin / a non-owner caller set up their own call.
        given(employeeContract.findById(EMPLOYEE)).willReturn(
                Optional.of(new EmployeeSummary(EMPLOYEE, "Ada Lovelace", OWNER_EMAIL, EmployeeRole.EMPLOYEE, "Engineer", "Platform", "senior")));
    }

    // ---------------- portfolioFor (frozen contract) ----------------

    @Test
    @DisplayName("Should map skill entries to SkillStrength with the employee name")
    void portfolioFor_mapsSkillsToStrengthsWithName() {
        // Given — the employee exists, owns a portfolio with one skill
        Portfolio portfolio = portfolio(10L, EMPLOYEE.value());
        PortfolioSkill skill = PortfolioSkill.builder().id(100L).portfolioId(10L)
                .skill("Angular").years(5).projectCount(8).build();
        given(employeeContract.exists(EMPLOYEE)).willReturn(true);
        given(employeeContract.findById(EMPLOYEE)).willReturn(
                Optional.of(new EmployeeSummary(EMPLOYEE, "Ada Lovelace", "ada@staff.eng", EmployeeRole.EMPLOYEE, "Engineer", "Platform", "senior")));
        given(portfolioRepository.findByEmployeeId(EMPLOYEE.value())).willReturn(Optional.of(portfolio));
        given(skillRepository.findByPortfolioId(10L)).willReturn(List.of(skill));

        // When
        PortfolioSummary result = service.portfolioFor(EMPLOYEE);

        // Then
        assertThat(result.employeeId()).isEqualTo(EMPLOYEE);
        assertThat(result.skills()).hasSize(1);
        SkillStrength strength = result.skills().get(0);
        assertThat(strength.employeeId()).isEqualTo(EMPLOYEE);
        assertThat(strength.employeeName()).isEqualTo("Ada Lovelace");
        assertThat(strength.skill()).isEqualTo("Angular");
        assertThat(strength.years()).isEqualTo(5);
        assertThat(strength.projectCount()).isEqualTo(8);
    }

    @Test
    @DisplayName("Should return an empty skills list when the employee has no portfolio")
    void portfolioFor_returnsEmptySkillsWhenNoPortfolio() {
        // Given — employee exists but has no portfolio row
        given(employeeContract.exists(EMPLOYEE)).willReturn(true);
        given(portfolioRepository.findByEmployeeId(EMPLOYEE.value())).willReturn(Optional.empty());

        // When
        PortfolioSummary result = service.portfolioFor(EMPLOYEE);

        // Then
        assertThat(result.employeeId()).isEqualTo(EMPLOYEE);
        assertThat(result.skills()).isEmpty();
        then(skillRepository).should(never()).findByPortfolioId(any());
    }

    @Test
    @DisplayName("Should resolve an empty employee name when no EmployeeContract is present")
    void portfolioFor_resolvesEmptyNameWhenContractAbsent() {
        // Given — no employee module: the contract provider returns null
        given(employeeContractProvider.getIfAvailable()).willReturn(null);
        Portfolio portfolio = portfolio(10L, EMPLOYEE.value());
        PortfolioSkill skill = PortfolioSkill.builder().id(100L).portfolioId(10L)
                .skill("Java").years(3).projectCount(2).build();
        given(portfolioRepository.findByEmployeeId(EMPLOYEE.value())).willReturn(Optional.of(portfolio));
        given(skillRepository.findByPortfolioId(10L)).willReturn(List.of(skill));

        // When
        PortfolioSummary result = service.portfolioFor(EMPLOYEE);

        // Then — the skill still carries the id and quantified experience; the name degrades to ""
        assertThat(result.skills()).hasSize(1);
        assertThat(result.skills().get(0).employeeName()).isEqualTo("");
        assertThat(result.skills().get(0).years()).isEqualTo(3);
    }

    @Test
    @DisplayName("Should resolve an empty name when the contract cannot find the employee")
    void portfolioFor_resolvesEmptyNameWhenEmployeeNotFoundByContract() {
        // Given — the contract is present but findById returns empty
        Portfolio portfolio = portfolio(10L, EMPLOYEE.value());
        PortfolioSkill skill = PortfolioSkill.builder().id(100L).portfolioId(10L)
                .skill("Angular").years(1).projectCount(1).build();
        given(employeeContract.findById(EMPLOYEE)).willReturn(Optional.empty());
        given(portfolioRepository.findByEmployeeId(EMPLOYEE.value())).willReturn(Optional.of(portfolio));
        given(skillRepository.findByPortfolioId(10L)).willReturn(List.of(skill));

        // When
        PortfolioSummary result = service.portfolioFor(EMPLOYEE);

        // Then
        assertThat(result.skills().get(0).employeeName()).isEqualTo("");
    }

    // ---------------- getPortfolio ----------------

    @Test
    @DisplayName("Should return the full portfolio view for an existing portfolio")
    void getPortfolio_returnsFullView() {
        // Given
        Portfolio portfolio = portfolio(10L, EMPLOYEE.value());
        given(employeeContract.exists(EMPLOYEE)).willReturn(true);
        given(portfolioRepository.findByEmployeeId(EMPLOYEE.value())).willReturn(Optional.of(portfolio));
        given(skillRepository.findByPortfolioId(10L)).willReturn(
                List.of(PortfolioSkill.builder().id(1L).portfolioId(10L).skill("Angular").years(4).projectCount(6).build()));
        given(educationRepository.findByPortfolioId(10L)).willReturn(
                List.of(PortfolioEducation.builder().id(2L).portfolioId(10L).institution("Uni").build()));
        given(projectRepository.findByPortfolioId(10L)).willReturn(
                List.of(PortfolioProject.builder().id(3L).portfolioId(10L).name("Portal").build()));
        given(linkRepository.findByPortfolioId(10L)).willReturn(
                List.of(PortfolioLink.builder().id(4L).portfolioId(10L).url("https://x").build()));

        // When
        PortfolioView view = service.getPortfolio(EMPLOYEE);

        // Then
        assertThat(view.employeeId()).isEqualTo(1L);
        assertThat(view.skills()).hasSize(1);
        assertThat(view.education()).hasSize(1);
        assertThat(view.projects()).hasSize(1);
        assertThat(view.links()).hasSize(1);
        assertThat(view.skills().get(0).projectCount()).isEqualTo(6);
    }

    @Test
    @DisplayName("Should return an empty view for an existing employee with no portfolio")
    void getPortfolio_returnsEmptyViewWhenUnset() {
        // Given — employee exists but no portfolio row
        given(employeeContract.exists(EMPLOYEE)).willReturn(true);
        given(portfolioRepository.findByEmployeeId(EMPLOYEE.value())).willReturn(Optional.empty());

        // When
        PortfolioView view = service.getPortfolio(EMPLOYEE);

        // Then — each section is empty (serialized as []), not null
        assertThat(view.employeeId()).isEqualTo(1L);
        assertThat(view.skills()).isEmpty();
        assertThat(view.education()).isEmpty();
        assertThat(view.projects()).isEmpty();
        assertThat(view.links()).isEmpty();
    }

    @Test
    @DisplayName("Should skip the existence check and return an empty view when no contract is present")
    void getPortfolio_skipsExistenceCheckWhenContractAbsent() {
        // Given — no employee module; cannot confirm existence, so assume the employee exists
        given(employeeContractProvider.getIfAvailable()).willReturn(null);
        given(portfolioRepository.findByEmployeeId(EMPLOYEE.value())).willReturn(Optional.empty());

        // When
        PortfolioView view = service.getPortfolio(EMPLOYEE);

        // Then — no 404; an empty view is returned
        assertThat(view.employeeId()).isEqualTo(1L);
        assertThat(view.skills()).isEmpty();
    }

    @Test
    @DisplayName("Should throw EmployeeNotFoundException when the contract reports the employee absent")
    void getPortfolio_throwsWhenEmployeeAbsent() {
        // Given
        given(employeeContract.exists(EMPLOYEE)).willReturn(false);

        // When / Then
        assertThatThrownBy(() -> service.getPortfolio(EMPLOYEE))
                .isInstanceOf(EmployeeNotFoundException.class)
                .hasMessageContaining("Employee not found: 1");
        then(portfolioRepository).should(never()).findByEmployeeId(any());
    }

    // ---------------- replacePortfolio (upsert) ----------------

    @Test
    @DisplayName("Should create the portfolio and replace all child rows on bulk replace")
    void replacePortfolio_upsertsAndReplacesChildren() {
        // Given — no portfolio yet; replace creates it and inserts children
        PortfolioView view = new PortfolioView(1L, OWNER_EMAIL,
                List.of(new PortfolioView.SkillView(null, "Angular", 5, 9)),
                List.of(new PortfolioView.EducationView(null, "Uni", "BSc", 2010, 2014)),
                List.of(new PortfolioView.ProjectView(null, "Portal", "desc", 2020, 2021)),
                List.of(new PortfolioView.LinkView(null, "GitHub", "https://gh")));
        given(employeeContract.exists(EMPLOYEE)).willReturn(true);
        given(portfolioRepository.findByEmployeeId(EMPLOYEE.value())).willReturn(Optional.empty());
        given(portfolioRepository.save(any(Portfolio.class))).willAnswer(inv -> withId(inv.getArgument(0), 10L));
        given(skillRepository.findByPortfolioId(10L)).willReturn(List.of());
        given(educationRepository.findByPortfolioId(10L)).willReturn(List.of());
        given(projectRepository.findByPortfolioId(10L)).willReturn(List.of());
        given(linkRepository.findByPortfolioId(10L)).willReturn(List.of());

        // When
        service.replacePortfolio(EMPLOYEE, view, OWNER);

        // Then — every old child collection is cleared and the new rows are inserted
        then(skillRepository).should().deleteByPortfolioId(10L);
        then(educationRepository).should().deleteByPortfolioId(10L);
        then(projectRepository).should().deleteByPortfolioId(10L);
        then(linkRepository).should().deleteByPortfolioId(10L);
        then(skillRepository).should().save(any(PortfolioSkill.class));
        then(educationRepository).should().save(any(PortfolioEducation.class));
        then(projectRepository).should().save(any(PortfolioProject.class));
        then(linkRepository).should().save(any(PortfolioLink.class));
    }

    @Test
    @DisplayName("Should reject bulk replace for an unknown employee")
    void replacePortfolio_throwsForUnknownEmployee() {
        // Given
        given(employeeContract.exists(EMPLOYEE)).willReturn(false);

        // When / Then
        assertThatThrownBy(() -> service.replacePortfolio(EMPLOYEE,
                new PortfolioView(1L, null, List.of(), List.of(), List.of(), List.of()), OWNER))
                .isInstanceOf(EmployeeNotFoundException.class);
        then(portfolioRepository).should(never()).findByEmployeeId(any());
    }

    // ---------------- skill sub-resource ----------------

    @Test
    @DisplayName("Should add a valid skill entry to a new portfolio and return the saved view")
    void addSkill_persistsValidEntry() {
        // Given — no portfolio yet, so addSkill upserts the portfolio first
        PortfolioView.SkillView entry = new PortfolioView.SkillView(null, "Angular", 5, 9);
        given(employeeContract.exists(EMPLOYEE)).willReturn(true);
        given(portfolioRepository.findByEmployeeId(EMPLOYEE.value())).willReturn(Optional.empty());
        given(portfolioRepository.save(any(Portfolio.class))).willAnswer(inv -> withId(inv.getArgument(0), 10L));
        given(skillRepository.save(any(PortfolioSkill.class))).willAnswer(inv -> withId(inv.getArgument(0), 100L));

        // When
        PortfolioView.SkillView result = service.addSkill(EMPLOYEE, entry, OWNER);

        // Then — the saved skill is stamped with ids and echoes the request fields
        ArgumentCaptor<PortfolioSkill> captor = ArgumentCaptor.forClass(PortfolioSkill.class);
        then(skillRepository).should().save(captor.capture());
        assertThat(captor.getValue().getPortfolioId()).isEqualTo(10L);
        assertThat(captor.getValue().getSkill()).isEqualTo("Angular");
        assertThat(captor.getValue().getYears()).isEqualTo(5);
        assertThat(captor.getValue().getProjectCount()).isEqualTo(9);
        assertThat(result.id()).isEqualTo(100L);
        assertThat(result.projectCount()).isEqualTo(9);
    }

    @Test
    @DisplayName("Should reject a blank skill name")
    void addSkill_rejectsBlankSkill() {
        // Given
        given(employeeContract.exists(EMPLOYEE)).willReturn(true);
        given(portfolioRepository.findByEmployeeId(EMPLOYEE.value())).willReturn(Optional.of(portfolio(10L, EMPLOYEE.value())));

        // When / Then
        assertThatThrownBy(() -> service.addSkill(EMPLOYEE, new PortfolioView.SkillView(null, "  ", 1, 1), OWNER))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("skill is required");
        then(skillRepository).should(never()).save(any(PortfolioSkill.class));
    }

    @Test
    @DisplayName("Should reject negative years on a skill entry")
    void addSkill_rejectsNegativeYears() {
        // Given
        given(employeeContract.exists(EMPLOYEE)).willReturn(true);
        given(portfolioRepository.findByEmployeeId(EMPLOYEE.value())).willReturn(Optional.of(portfolio(10L, EMPLOYEE.value())));

        // When / Then
        assertThatThrownBy(() -> service.addSkill(EMPLOYEE, new PortfolioView.SkillView(null, "Angular", -1, 1), OWNER))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("years");
        then(skillRepository).should(never()).save(any(PortfolioSkill.class));
    }

    @Test
    @DisplayName("Should reject negative project count on a skill entry")
    void addSkill_rejectsNegativeProjectCount() {
        // Given
        given(employeeContract.exists(EMPLOYEE)).willReturn(true);
        given(portfolioRepository.findByEmployeeId(EMPLOYEE.value())).willReturn(Optional.of(portfolio(10L, EMPLOYEE.value())));

        // When / Then
        assertThatThrownBy(() -> service.addSkill(EMPLOYEE, new PortfolioView.SkillView(null, "Angular", 1, -2), OWNER))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("projectCount");
        then(skillRepository).should(never()).save(any(PortfolioSkill.class));
    }

    @Test
    @DisplayName("Should update a skill entry owned by the employee")
    void updateSkill_updatesOwnedEntry() {
        // Given — skill 100 belongs to portfolio 10, owned by EMPLOYEE
        PortfolioSkill skill = PortfolioSkill.builder().id(100L).portfolioId(10L).skill("Old").years(1).projectCount(1).build();
        given(employeeContract.exists(EMPLOYEE)).willReturn(true);
        given(skillRepository.findById(100L)).willReturn(Optional.of(skill));
        given(portfolioRepository.findById(10L)).willReturn(Optional.of(portfolio(10L, EMPLOYEE.value())));
        given(skillRepository.save(any(PortfolioSkill.class))).willAnswer(inv -> inv.getArgument(0));

        // When
        PortfolioView.SkillView result = service.updateSkill(EMPLOYEE, 100L, new PortfolioView.SkillView(100L, "New", 7, 12), OWNER);

        // Then
        assertThat(skill.getSkill()).isEqualTo("New");
        assertThat(skill.getYears()).isEqualTo(7);
        assertThat(skill.getProjectCount()).isEqualTo(12);
        assertThat(result.skill()).isEqualTo("New");
    }

    @Test
    @DisplayName("Should reject updating a skill that belongs to another employee's portfolio")
    void updateSkill_rejectsForeignOwnedEntry() {
        // Given — skill 100 belongs to portfolio 20, owned by OTHER_EMPLOYEE
        PortfolioSkill skill = PortfolioSkill.builder().id(100L).portfolioId(20L).skill("X").years(1).projectCount(1).build();
        given(employeeContract.exists(EMPLOYEE)).willReturn(true);
        given(skillRepository.findById(100L)).willReturn(Optional.of(skill));
        given(portfolioRepository.findById(20L)).willReturn(Optional.of(portfolio(20L, OTHER_EMPLOYEE.value())));

        // When / Then — ownership check fails → 404 domain exception, no save
        assertThatThrownBy(() -> service.updateSkill(EMPLOYEE, 100L, new PortfolioView.SkillView(100L, "New", 1, 1), OWNER))
                .isInstanceOf(PortfolioEntryNotFoundException.class);
        then(skillRepository).should(never()).save(any(PortfolioSkill.class));
    }

    @Test
    @DisplayName("Should reject updating an unknown skill entry")
    void updateSkill_rejectsUnknownEntry() {
        // Given
        given(employeeContract.exists(EMPLOYEE)).willReturn(true);
        given(skillRepository.findById(404L)).willReturn(Optional.empty());

        // When / Then
        assertThatThrownBy(() -> service.updateSkill(EMPLOYEE, 404L, new PortfolioView.SkillView(404L, "New", 1, 1), OWNER))
                .isInstanceOf(PortfolioEntryNotFoundException.class);
    }

    @Test
    @DisplayName("Should delete a skill entry owned by the employee")
    void deleteSkill_removesOwnedEntry() {
        // Given
        PortfolioSkill skill = PortfolioSkill.builder().id(100L).portfolioId(10L).build();
        given(employeeContract.exists(EMPLOYEE)).willReturn(true);
        given(skillRepository.findById(100L)).willReturn(Optional.of(skill));
        given(portfolioRepository.findById(10L)).willReturn(Optional.of(portfolio(10L, EMPLOYEE.value())));

        // When
        service.deleteSkill(EMPLOYEE, 100L, OWNER);

        // Then
        then(skillRepository).should().delete(skill);
    }

    @Test
    @DisplayName("Should reject deleting a skill owned by another employee")
    void deleteSkill_rejectsForeignOwnedEntry() {
        // Given
        PortfolioSkill skill = PortfolioSkill.builder().id(100L).portfolioId(20L).build();
        given(employeeContract.exists(EMPLOYEE)).willReturn(true);
        given(skillRepository.findById(100L)).willReturn(Optional.of(skill));
        given(portfolioRepository.findById(20L)).willReturn(Optional.of(portfolio(20L, OTHER_EMPLOYEE.value())));

        // When / Then
        assertThatThrownBy(() -> service.deleteSkill(EMPLOYEE, 100L, OWNER))
                .isInstanceOf(PortfolioEntryNotFoundException.class);
        then(skillRepository).should(never()).delete(any(PortfolioSkill.class));
    }

    // ---------------- education / project / link sub-resources ----------------

    @Test
    @DisplayName("Should add and return an education entry")
    void addEducation_persistsValidEntry() {
        // Given
        PortfolioView.EducationView entry = new PortfolioView.EducationView(null, "Uni", "BSc", 2010, 2014);
        given(employeeContract.exists(EMPLOYEE)).willReturn(true);
        given(portfolioRepository.findByEmployeeId(EMPLOYEE.value())).willReturn(Optional.empty());
        given(portfolioRepository.save(any(Portfolio.class))).willAnswer(inv -> withId(inv.getArgument(0), 10L));
        given(educationRepository.save(any(PortfolioEducation.class))).willAnswer(inv -> withId(inv.getArgument(0), 200L));

        // When
        PortfolioView.EducationView result = service.addEducation(EMPLOYEE, entry, OWNER);

        // Then
        assertThat(result.id()).isEqualTo(200L);
        assertThat(result.institution()).isEqualTo("Uni");
    }

    @Test
    @DisplayName("Should reject a blank institution")
    void addEducation_rejectsBlankInstitution() {
        // Given
        given(employeeContract.exists(EMPLOYEE)).willReturn(true);
        given(portfolioRepository.findByEmployeeId(EMPLOYEE.value())).willReturn(Optional.of(portfolio(10L, EMPLOYEE.value())));

        // When / Then
        assertThatThrownBy(() -> service.addEducation(EMPLOYEE, new PortfolioView.EducationView(null, "", null, null, null), OWNER))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("institution is required");
    }

    @Test
    @DisplayName("Should add and return a project entry")
    void addProject_persistsValidEntry() {
        // Given
        PortfolioView.ProjectView entry = new PortfolioView.ProjectView(null, "Portal", "desc", 2020, 2021);
        given(employeeContract.exists(EMPLOYEE)).willReturn(true);
        given(portfolioRepository.findByEmployeeId(EMPLOYEE.value())).willReturn(Optional.of(portfolio(10L, EMPLOYEE.value())));
        given(projectRepository.save(any(PortfolioProject.class))).willAnswer(inv -> withId(inv.getArgument(0), 300L));

        // When
        PortfolioView.ProjectView result = service.addProject(EMPLOYEE, entry, OWNER);

        // Then
        assertThat(result.id()).isEqualTo(300L);
        assertThat(result.name()).isEqualTo("Portal");
    }

    @Test
    @DisplayName("Should reject a blank project name")
    void addProject_rejectsBlankName() {
        // Given
        given(employeeContract.exists(EMPLOYEE)).willReturn(true);
        given(portfolioRepository.findByEmployeeId(EMPLOYEE.value())).willReturn(Optional.of(portfolio(10L, EMPLOYEE.value())));

        // When / Then
        assertThatThrownBy(() -> service.addProject(EMPLOYEE, new PortfolioView.ProjectView(null, " ", null, null, null), OWNER))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("name is required");
    }

    @Test
    @DisplayName("Should add and return a link entry")
    void addLink_persistsValidEntry() {
        // Given
        PortfolioView.LinkView entry = new PortfolioView.LinkView(null, "GitHub", "https://gh");
        given(employeeContract.exists(EMPLOYEE)).willReturn(true);
        given(portfolioRepository.findByEmployeeId(EMPLOYEE.value())).willReturn(Optional.of(portfolio(10L, EMPLOYEE.value())));
        given(linkRepository.save(any(PortfolioLink.class))).willAnswer(inv -> withId(inv.getArgument(0), 400L));

        // When
        PortfolioView.LinkView result = service.addLink(EMPLOYEE, entry, OWNER);

        // Then
        assertThat(result.id()).isEqualTo(400L);
        assertThat(result.url()).isEqualTo("https://gh");
    }

    @Test
    @DisplayName("Should reject a blank link url")
    void addLink_rejectsBlankUrl() {
        // Given
        given(employeeContract.exists(EMPLOYEE)).willReturn(true);
        given(portfolioRepository.findByEmployeeId(EMPLOYEE.value())).willReturn(Optional.of(portfolio(10L, EMPLOYEE.value())));

        // When / Then
        assertThatThrownBy(() -> service.addLink(EMPLOYEE, new PortfolioView.LinkView(null, "GitHub", " "), OWNER))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("url is required");
    }

    @Test
    @DisplayName("Should update and delete a project entry owned by the employee")
    void project_updateAndDelete_ownedByEmployee() {
        // Given — project 300 belongs to portfolio 10, owned by EMPLOYEE
        PortfolioProject project = PortfolioProject.builder().id(300L).portfolioId(10L).name("Old").build();
        given(employeeContract.exists(EMPLOYEE)).willReturn(true);
        given(projectRepository.findById(300L)).willReturn(Optional.of(project));
        given(portfolioRepository.findById(10L)).willReturn(Optional.of(portfolio(10L, EMPLOYEE.value())));
        given(projectRepository.save(any(PortfolioProject.class))).willAnswer(inv -> inv.getArgument(0));

        // When — update
        PortfolioView.ProjectView updated = service.updateProject(EMPLOYEE, 300L,
                new PortfolioView.ProjectView(300L, "New", "d", 2020, 2021), OWNER);

        // Then
        assertThat(updated.name()).isEqualTo("New");
        assertThat(project.getName()).isEqualTo("New");

        // When — delete
        service.deleteProject(EMPLOYEE, 300L, OWNER);

        // Then
        then(projectRepository).should().delete(project);
    }

    @Test
    @DisplayName("Should reject updating a link owned by another employee")
    void updateLink_rejectsForeignOwnedEntry() {
        // Given — link 400 belongs to portfolio 20, owned by OTHER_EMPLOYEE
        PortfolioLink link = PortfolioLink.builder().id(400L).portfolioId(20L).url("https://x").build();
        given(employeeContract.exists(EMPLOYEE)).willReturn(true);
        given(linkRepository.findById(400L)).willReturn(Optional.of(link));
        given(portfolioRepository.findById(20L)).willReturn(Optional.of(portfolio(20L, OTHER_EMPLOYEE.value())));

        // When / Then
        assertThatThrownBy(() -> service.updateLink(EMPLOYEE, 400L, new PortfolioView.LinkView(400L, "L", "https://y"), OWNER))
                .isInstanceOf(PortfolioEntryNotFoundException.class);
        then(linkRepository).should(never()).save(any(PortfolioLink.class));
    }

    // ---------------- unknown-employee rejection (each write method gates on requireEmployeeExists) ----------------

    @Test
    @DisplayName("Should reject every sub-resource write for an unknown employee (404 via contract)")
    void writes_rejectUnknownEmployee() {
        // Given — the contract reports the employee absent; no further lookups are reached
        given(employeeContract.exists(EMPLOYEE)).willReturn(false);

        PortfolioView.SkillView skill = new PortfolioView.SkillView(null, "Angular", 1, 1);
        PortfolioView.EducationView edu = new PortfolioView.EducationView(null, "Uni", null, null, null);
        PortfolioView.ProjectView proj = new PortfolioView.ProjectView(null, "Portal", null, null, null);
        PortfolioView.LinkView link = new PortfolioView.LinkView(null, "L", "https://x");

        // When / Then — each method throws before touching any repository
        assertThatThrownBy(() -> service.addSkill(EMPLOYEE, skill, OWNER)).isInstanceOf(EmployeeNotFoundException.class);
        assertThatThrownBy(() -> service.addEducation(EMPLOYEE, edu, OWNER)).isInstanceOf(EmployeeNotFoundException.class);
        assertThatThrownBy(() -> service.addProject(EMPLOYEE, proj, OWNER)).isInstanceOf(EmployeeNotFoundException.class);
        assertThatThrownBy(() -> service.addLink(EMPLOYEE, link, OWNER)).isInstanceOf(EmployeeNotFoundException.class);
        assertThatThrownBy(() -> service.updateSkill(EMPLOYEE, 1L, skill, OWNER)).isInstanceOf(EmployeeNotFoundException.class);
        assertThatThrownBy(() -> service.updateEducation(EMPLOYEE, 1L, edu, OWNER)).isInstanceOf(EmployeeNotFoundException.class);
        assertThatThrownBy(() -> service.updateProject(EMPLOYEE, 1L, proj, OWNER)).isInstanceOf(EmployeeNotFoundException.class);
        assertThatThrownBy(() -> service.updateLink(EMPLOYEE, 1L, link, OWNER)).isInstanceOf(EmployeeNotFoundException.class);
        assertThatThrownBy(() -> service.deleteSkill(EMPLOYEE, 1L, OWNER)).isInstanceOf(EmployeeNotFoundException.class);
        assertThatThrownBy(() -> service.deleteEducation(EMPLOYEE, 1L, OWNER)).isInstanceOf(EmployeeNotFoundException.class);
        assertThatThrownBy(() -> service.deleteProject(EMPLOYEE, 1L, OWNER)).isInstanceOf(EmployeeNotFoundException.class);
        assertThatThrownBy(() -> service.deleteLink(EMPLOYEE, 1L, OWNER)).isInstanceOf(EmployeeNotFoundException.class);
        then(portfolioRepository).should(never()).save(any(Portfolio.class));
        then(skillRepository).should(never()).save(any(PortfolioSkill.class));
    }

    // ---------------- boundary / validation edge ----------------

    @Test
    @DisplayName("Should accept zero years and zero project count (the >= 0 boundary)")
    void addSkill_acceptsZeroYearsAndProjectCount() {
        // Given — years=0 and projectCount=0 are valid (boundary of the >= 0 rule)
        given(employeeContract.exists(EMPLOYEE)).willReturn(true);
        given(portfolioRepository.findByEmployeeId(EMPLOYEE.value())).willReturn(Optional.empty());
        given(portfolioRepository.save(any(Portfolio.class))).willAnswer(inv -> withId(inv.getArgument(0), 10L));
        given(skillRepository.save(any(PortfolioSkill.class))).willAnswer(inv -> withId(inv.getArgument(0), 100L));

        // When
        PortfolioView.SkillView result = service.addSkill(EMPLOYEE, new PortfolioView.SkillView(null, "Angular", 0, 0), OWNER);

        // Then — no rejection; the zeros round-trip
        assertThat(result.years()).isZero();
        assertThat(result.projectCount()).isZero();
    }

    // ---------------- education update / delete ownership ----------------

    @Test
    @DisplayName("Should update every field of an education entry owned by the employee")
    void updateEducation_updatesAllOwnedFields() {
        // Given — education 200 belongs to portfolio 10, owned by EMPLOYEE
        PortfolioEducation edu = PortfolioEducation.builder().id(200L).portfolioId(10L)
                .institution("Old").qualification("OldQ").startYear(2000).endYear(2001).build();
        given(employeeContract.exists(EMPLOYEE)).willReturn(true);
        given(educationRepository.findById(200L)).willReturn(Optional.of(edu));
        given(portfolioRepository.findById(10L)).willReturn(Optional.of(portfolio(10L, EMPLOYEE.value())));
        given(educationRepository.save(any(PortfolioEducation.class))).willAnswer(inv -> inv.getArgument(0));

        // When
        PortfolioView.EducationView result = service.updateEducation(EMPLOYEE, 200L,
                new PortfolioView.EducationView(200L, "NewUni", "PhD", 2010, 2014), OWNER);

        // Then — every field is applied and echoed back
        assertThat(edu.getInstitution()).isEqualTo("NewUni");
        assertThat(edu.getQualification()).isEqualTo("PhD");
        assertThat(edu.getStartYear()).isEqualTo(2010);
        assertThat(edu.getEndYear()).isEqualTo(2014);
        assertThat(result.institution()).isEqualTo("NewUni");
        assertThat(result.endYear()).isEqualTo(2014);
    }

    @Test
    @DisplayName("Should reject updating an education entry owned by another employee")
    void updateEducation_rejectsForeignOwnedEntry() {
        // Given
        PortfolioEducation edu = PortfolioEducation.builder().id(200L).portfolioId(20L).institution("X").build();
        given(employeeContract.exists(EMPLOYEE)).willReturn(true);
        given(educationRepository.findById(200L)).willReturn(Optional.of(edu));
        given(portfolioRepository.findById(20L)).willReturn(Optional.of(portfolio(20L, OTHER_EMPLOYEE.value())));

        // When / Then
        assertThatThrownBy(() -> service.updateEducation(EMPLOYEE, 200L,
                new PortfolioView.EducationView(200L, "New", null, null, null), OWNER))
                .isInstanceOf(PortfolioEntryNotFoundException.class);
        then(educationRepository).should(never()).save(any(PortfolioEducation.class));
    }

    @Test
    @DisplayName("Should delete an education entry owned by the employee")
    void deleteEducation_removesOwnedEntry() {
        // Given
        PortfolioEducation edu = PortfolioEducation.builder().id(200L).portfolioId(10L).institution("X").build();
        given(employeeContract.exists(EMPLOYEE)).willReturn(true);
        given(educationRepository.findById(200L)).willReturn(Optional.of(edu));
        given(portfolioRepository.findById(10L)).willReturn(Optional.of(portfolio(10L, EMPLOYEE.value())));

        // When
        service.deleteEducation(EMPLOYEE, 200L, OWNER);

        // Then
        then(educationRepository).should().delete(edu);
    }

    @Test
    @DisplayName("Should reject deleting an education entry owned by another employee")
    void deleteEducation_rejectsForeignOwnedEntry() {
        // Given
        PortfolioEducation edu = PortfolioEducation.builder().id(200L).portfolioId(20L).institution("X").build();
        given(employeeContract.exists(EMPLOYEE)).willReturn(true);
        given(educationRepository.findById(200L)).willReturn(Optional.of(edu));
        given(portfolioRepository.findById(20L)).willReturn(Optional.of(portfolio(20L, OTHER_EMPLOYEE.value())));

        // When / Then
        assertThatThrownBy(() -> service.deleteEducation(EMPLOYEE, 200L, OWNER))
                .isInstanceOf(PortfolioEntryNotFoundException.class);
        then(educationRepository).should(never()).delete(any(PortfolioEducation.class));
    }

    // ---------------- project update / delete ownership ----------------

    @Test
    @DisplayName("Should update every field of a project entry owned by the employee")
    void updateProject_updatesAllOwnedFields() {
        // Given — project 300 belongs to portfolio 10, owned by EMPLOYEE
        PortfolioProject project = PortfolioProject.builder().id(300L).portfolioId(10L)
                .name("Old").description("old desc").startYear(2000).endYear(2001).build();
        given(employeeContract.exists(EMPLOYEE)).willReturn(true);
        given(projectRepository.findById(300L)).willReturn(Optional.of(project));
        given(portfolioRepository.findById(10L)).willReturn(Optional.of(portfolio(10L, EMPLOYEE.value())));
        given(projectRepository.save(any(PortfolioProject.class))).willAnswer(inv -> inv.getArgument(0));

        // When
        PortfolioView.ProjectView result = service.updateProject(EMPLOYEE, 300L,
                new PortfolioView.ProjectView(300L, "New", "new desc", 2020, 2021), OWNER);

        // Then — name, description, and both years are applied
        assertThat(project.getName()).isEqualTo("New");
        assertThat(project.getDescription()).isEqualTo("new desc");
        assertThat(project.getStartYear()).isEqualTo(2020);
        assertThat(project.getEndYear()).isEqualTo(2021);
        assertThat(result.description()).isEqualTo("new desc");
        assertThat(result.endYear()).isEqualTo(2021);
    }

    @Test
    @DisplayName("Should reject updating a project entry owned by another employee")
    void updateProject_rejectsForeignOwnedEntry() {
        // Given
        PortfolioProject project = PortfolioProject.builder().id(300L).portfolioId(20L).name("X").build();
        given(employeeContract.exists(EMPLOYEE)).willReturn(true);
        given(projectRepository.findById(300L)).willReturn(Optional.of(project));
        given(portfolioRepository.findById(20L)).willReturn(Optional.of(portfolio(20L, OTHER_EMPLOYEE.value())));

        // When / Then
        assertThatThrownBy(() -> service.updateProject(EMPLOYEE, 300L,
                new PortfolioView.ProjectView(300L, "New", null, null, null), OWNER))
                .isInstanceOf(PortfolioEntryNotFoundException.class);
        then(projectRepository).should(never()).save(any(PortfolioProject.class));
    }

    @Test
    @DisplayName("Should reject deleting a project entry owned by another employee")
    void deleteProject_rejectsForeignOwnedEntry() {
        // Given
        PortfolioProject project = PortfolioProject.builder().id(300L).portfolioId(20L).name("X").build();
        given(employeeContract.exists(EMPLOYEE)).willReturn(true);
        given(projectRepository.findById(300L)).willReturn(Optional.of(project));
        given(portfolioRepository.findById(20L)).willReturn(Optional.of(portfolio(20L, OTHER_EMPLOYEE.value())));

        // When / Then
        assertThatThrownBy(() -> service.deleteProject(EMPLOYEE, 300L, OWNER))
                .isInstanceOf(PortfolioEntryNotFoundException.class);
        then(projectRepository).should(never()).delete(any(PortfolioProject.class));
    }

    // ---------------- link update / delete ownership ----------------

    @Test
    @DisplayName("Should update every field of a link entry owned by the employee")
    void updateLink_updatesAllOwnedFields() {
        // Given — link 400 belongs to portfolio 10, owned by EMPLOYEE
        PortfolioLink link = PortfolioLink.builder().id(400L).portfolioId(10L).label("Old").url("https://old").build();
        given(employeeContract.exists(EMPLOYEE)).willReturn(true);
        given(linkRepository.findById(400L)).willReturn(Optional.of(link));
        given(portfolioRepository.findById(10L)).willReturn(Optional.of(portfolio(10L, EMPLOYEE.value())));
        given(linkRepository.save(any(PortfolioLink.class))).willAnswer(inv -> inv.getArgument(0));

        // When
        PortfolioView.LinkView result = service.updateLink(EMPLOYEE, 400L,
                new PortfolioView.LinkView(400L, "GitHub", "https://gh"), OWNER);

        // Then — both label and url are applied
        assertThat(link.getLabel()).isEqualTo("GitHub");
        assertThat(link.getUrl()).isEqualTo("https://gh");
        assertThat(result.label()).isEqualTo("GitHub");
    }

    @Test
    @DisplayName("Should delete a link entry owned by the employee")
    void deleteLink_removesOwnedEntry() {
        // Given
        PortfolioLink link = PortfolioLink.builder().id(400L).portfolioId(10L).url("https://x").build();
        given(employeeContract.exists(EMPLOYEE)).willReturn(true);
        given(linkRepository.findById(400L)).willReturn(Optional.of(link));
        given(portfolioRepository.findById(10L)).willReturn(Optional.of(portfolio(10L, EMPLOYEE.value())));

        // When
        service.deleteLink(EMPLOYEE, 400L, OWNER);

        // Then
        then(linkRepository).should().delete(link);
    }

    @Test
    @DisplayName("Should reject deleting a link entry owned by another employee")
    void deleteLink_rejectsForeignOwnedEntry() {
        // Given
        PortfolioLink link = PortfolioLink.builder().id(400L).portfolioId(20L).url("https://x").build();
        given(employeeContract.exists(EMPLOYEE)).willReturn(true);
        given(linkRepository.findById(400L)).willReturn(Optional.of(link));
        given(portfolioRepository.findById(20L)).willReturn(Optional.of(portfolio(20L, OTHER_EMPLOYEE.value())));

        // When / Then
        assertThatThrownBy(() -> service.deleteLink(EMPLOYEE, 400L, OWNER))
                .isInstanceOf(PortfolioEntryNotFoundException.class);
        then(linkRepository).should(never()).delete(any(PortfolioLink.class));
    }

    // ---------------- replacePortfolio child validation ----------------

    @Test
    @DisplayName("Should reject bulk replace when a skill entry is invalid")
    void replacePortfolio_rejectsInvalidSkillChild() {
        // Given
        given(employeeContract.exists(EMPLOYEE)).willReturn(true);
        given(portfolioRepository.findByEmployeeId(EMPLOYEE.value())).willReturn(Optional.of(portfolio(10L, EMPLOYEE.value())));

        // When / Then — a blank skill trips validateSkill inside replaceChildren
        assertThatThrownBy(() -> service.replacePortfolio(EMPLOYEE, new PortfolioView(1L, null,
                List.of(new PortfolioView.SkillView(null, "  ", 1, 1)), List.of(), List.of(), List.of()), OWNER))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("skill is required");
        then(skillRepository).should(never()).save(any(PortfolioSkill.class));
    }

    @Test
    @DisplayName("Should reject bulk replace when an education entry is invalid")
    void replacePortfolio_rejectsInvalidEducationChild() {
        // Given
        given(employeeContract.exists(EMPLOYEE)).willReturn(true);
        given(portfolioRepository.findByEmployeeId(EMPLOYEE.value())).willReturn(Optional.of(portfolio(10L, EMPLOYEE.value())));

        // When / Then — a blank institution trips validateEducation inside replaceChildren
        assertThatThrownBy(() -> service.replacePortfolio(EMPLOYEE, new PortfolioView(1L, null,
                List.of(), List.of(new PortfolioView.EducationView(null, "", null, null, null)), List.of(), List.of()), OWNER))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("institution is required");
        then(educationRepository).should(never()).save(any(PortfolioEducation.class));
    }

    @Test
    @DisplayName("Should reject bulk replace when a project entry is invalid")
    void replacePortfolio_rejectsInvalidProjectChild() {
        // Given
        given(employeeContract.exists(EMPLOYEE)).willReturn(true);
        given(portfolioRepository.findByEmployeeId(EMPLOYEE.value())).willReturn(Optional.of(portfolio(10L, EMPLOYEE.value())));

        // When / Then — a blank name trips validateProject inside replaceChildren
        assertThatThrownBy(() -> service.replacePortfolio(EMPLOYEE, new PortfolioView(1L, null,
                List.of(), List.of(), List.of(new PortfolioView.ProjectView(null, " ", null, null, null)), List.of()), OWNER))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("name is required");
        then(projectRepository).should(never()).save(any(PortfolioProject.class));
    }

    @Test
    @DisplayName("Should reject bulk replace when a link entry is invalid")
    void replacePortfolio_rejectsInvalidLinkChild() {
        // Given
        given(employeeContract.exists(EMPLOYEE)).willReturn(true);
        given(portfolioRepository.findByEmployeeId(EMPLOYEE.value())).willReturn(Optional.of(portfolio(10L, EMPLOYEE.value())));

        // When / Then — a blank url trips validateLink inside replaceChildren
        assertThatThrownBy(() -> service.replacePortfolio(EMPLOYEE, new PortfolioView(1L, null,
                List.of(), List.of(), List.of(), List.of(new PortfolioView.LinkView(null, "L", " "))), OWNER))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("url is required");
        then(linkRepository).should(never()).save(any(PortfolioLink.class));
    }

    // ---------------- ATSE1-39 RBAC: owner-or-admin gate on every mutating method ----------------

    @Test
    @DisplayName("Should reject a non-owner non-admin caller with ACCESS_DENIED on every mutating method (RBAC)")
    void rbac_rejectsNonOwnerNonAdminOnEveryWrite() {
        // Given — caller is a different employee who is neither the portfolio owner nor an admin
        Caller other = new Caller(OTHER_EMAIL, EmployeeRole.EMPLOYEE);
        given(employeeContract.exists(EMPLOYEE)).willReturn(true);

        PortfolioView.SkillView skill = new PortfolioView.SkillView(null, "Angular", 1, 1);
        PortfolioView.EducationView edu = new PortfolioView.EducationView(null, "Uni", null, null, null);
        PortfolioView.ProjectView proj = new PortfolioView.ProjectView(null, "Portal", null, null, null);
        PortfolioView.LinkView link = new PortfolioView.LinkView(null, "L", "https://x");
        PortfolioView bulk = new PortfolioView(1L, null, List.of(), List.of(), List.of(), List.of());

        // When / Then — every mutating method throws PortfolioException(ACCESS_DENIED)
        assertThatThrownBy(() -> service.replacePortfolio(EMPLOYEE, bulk, other))
                .isInstanceOf(PortfolioException.class)
                .extracting(e -> ((PortfolioException) e).kind()).isEqualTo(PortfolioException.Kind.ACCESS_DENIED);
        assertThatThrownBy(() -> service.addSkill(EMPLOYEE, skill, other))
                .isInstanceOf(PortfolioException.class)
                .extracting(e -> ((PortfolioException) e).kind()).isEqualTo(PortfolioException.Kind.ACCESS_DENIED);
        assertThatThrownBy(() -> service.updateSkill(EMPLOYEE, 1L, skill, other))
                .isInstanceOf(PortfolioException.class)
                .extracting(e -> ((PortfolioException) e).kind()).isEqualTo(PortfolioException.Kind.ACCESS_DENIED);
        assertThatThrownBy(() -> service.deleteSkill(EMPLOYEE, 1L, other))
                .isInstanceOf(PortfolioException.class)
                .extracting(e -> ((PortfolioException) e).kind()).isEqualTo(PortfolioException.Kind.ACCESS_DENIED);
        assertThatThrownBy(() -> service.addEducation(EMPLOYEE, edu, other))
                .isInstanceOf(PortfolioException.class)
                .extracting(e -> ((PortfolioException) e).kind()).isEqualTo(PortfolioException.Kind.ACCESS_DENIED);
        assertThatThrownBy(() -> service.updateEducation(EMPLOYEE, 1L, edu, other))
                .isInstanceOf(PortfolioException.class)
                .extracting(e -> ((PortfolioException) e).kind()).isEqualTo(PortfolioException.Kind.ACCESS_DENIED);
        assertThatThrownBy(() -> service.deleteEducation(EMPLOYEE, 1L, other))
                .isInstanceOf(PortfolioException.class)
                .extracting(e -> ((PortfolioException) e).kind()).isEqualTo(PortfolioException.Kind.ACCESS_DENIED);
        assertThatThrownBy(() -> service.addProject(EMPLOYEE, proj, other))
                .isInstanceOf(PortfolioException.class)
                .extracting(e -> ((PortfolioException) e).kind()).isEqualTo(PortfolioException.Kind.ACCESS_DENIED);
        assertThatThrownBy(() -> service.updateProject(EMPLOYEE, 1L, proj, other))
                .isInstanceOf(PortfolioException.class)
                .extracting(e -> ((PortfolioException) e).kind()).isEqualTo(PortfolioException.Kind.ACCESS_DENIED);
        assertThatThrownBy(() -> service.deleteProject(EMPLOYEE, 1L, other))
                .isInstanceOf(PortfolioException.class)
                .extracting(e -> ((PortfolioException) e).kind()).isEqualTo(PortfolioException.Kind.ACCESS_DENIED);
        assertThatThrownBy(() -> service.addLink(EMPLOYEE, link, other))
                .isInstanceOf(PortfolioException.class)
                .extracting(e -> ((PortfolioException) e).kind()).isEqualTo(PortfolioException.Kind.ACCESS_DENIED);
        assertThatThrownBy(() -> service.updateLink(EMPLOYEE, 1L, link, other))
                .isInstanceOf(PortfolioException.class)
                .extracting(e -> ((PortfolioException) e).kind()).isEqualTo(PortfolioException.Kind.ACCESS_DENIED);
        assertThatThrownBy(() -> service.deleteLink(EMPLOYEE, 1L, other))
                .isInstanceOf(PortfolioException.class)
                .extracting(e -> ((PortfolioException) e).kind()).isEqualTo(PortfolioException.Kind.ACCESS_DENIED);

        // And — no repository was touched by any of those rejected calls
        then(portfolioRepository).should(never()).save(any(Portfolio.class));
        then(skillRepository).should(never()).save(any(PortfolioSkill.class));
        then(educationRepository).should(never()).save(any(PortfolioEducation.class));
        then(projectRepository).should(never()).save(any(PortfolioProject.class));
        then(linkRepository).should(never()).save(any(PortfolioLink.class));
    }

    @Test
    @DisplayName("Should allow an ADMIN caller to mutate any employee's portfolio (RBAC override)")
    void rbac_adminCanMutateAnyPortfolio() {
        // Given — caller is an ADMIN, not the portfolio owner
        given(employeeContract.exists(EMPLOYEE)).willReturn(true);
        given(portfolioRepository.findByEmployeeId(EMPLOYEE.value())).willReturn(Optional.empty());
        given(portfolioRepository.save(any(Portfolio.class))).willAnswer(inv -> withId(inv.getArgument(0), 10L));
        given(skillRepository.save(any(PortfolioSkill.class))).willAnswer(inv -> withId(inv.getArgument(0), 100L));

        // When — admin adds a skill on behalf of the employee
        PortfolioView.SkillView result = service.addSkill(EMPLOYEE,
                new PortfolioView.SkillView(null, "Angular", 5, 9), ADMIN);

        // Then — the row is persisted; admin's email is recorded as neither blocker nor owner check
        assertThat(result.id()).isEqualTo(100L);
        then(skillRepository).should().save(any(PortfolioSkill.class));
    }

    @Test
    @DisplayName("Should allow the portfolio owner to mutate their own portfolio (RBAC owner path)")
    void rbac_ownerCanMutateOwnPortfolio() {
        // Given — caller is the owner (ada@staff.eng), portfolio row already exists
        Portfolio portfolio = portfolio(10L, EMPLOYEE.value());
        given(employeeContract.exists(EMPLOYEE)).willReturn(true);
        given(portfolioRepository.findByEmployeeId(EMPLOYEE.value())).willReturn(Optional.of(portfolio));
        given(skillRepository.findByPortfolioId(10L)).willReturn(List.of());
        given(skillRepository.save(any(PortfolioSkill.class))).willAnswer(inv -> withId(inv.getArgument(0), 100L));

        // When — owner adds a skill to their own portfolio
        PortfolioView.SkillView result = service.addSkill(EMPLOYEE,
                new PortfolioView.SkillView(null, "Angular", 5, 9), OWNER);

        // Then — the row is persisted under the owner's portfolio
        assertThat(result.skill()).isEqualTo("Angular");
        then(skillRepository).should().save(any(PortfolioSkill.class));
    }

    // ---------------- helpers ----------------

    private static Portfolio portfolio(long id, long employeeId) {
        return Portfolio.builder().id(id).employeeId(employeeId).build();
    }

    private static <T> T withId(T entity, long id) {
        if (entity instanceof Portfolio p) {
            p.setId(id);
        } else if (entity instanceof PortfolioSkill s) {
            s.setId(id);
        } else if (entity instanceof PortfolioEducation e) {
            e.setId(id);
        } else if (entity instanceof PortfolioProject p) {
            p.setId(id);
        } else if (entity instanceof PortfolioLink l) {
            l.setId(id);
        }
        return entity;
    }
}