package com.staffengagement.skills.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.BDDMockito.given;

import com.staffengagement.shared.api.EmployeeContract;
import com.staffengagement.shared.api.EmployeeSummary;
import com.staffengagement.shared.api.PageRequest;
import com.staffengagement.shared.api.Paged;
import com.staffengagement.shared.api.PortfolioContract;
import com.staffengagement.shared.api.PortfolioSummary;
import com.staffengagement.shared.api.SkillStrength;
import com.staffengagement.shared.kernel.EmployeeId;
import com.staffengagement.shared.kernel.EmployeeRole;
import java.util.List;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

/**
 * BDD unit tests for {@link SkillsService} (JUnit 5 + Mockito).
 *
 * <p>The two frozen contracts are mocked so the test stays a pure unit test (no
 * database, no Spring context). Scenarios cover aggregation, filtering, pagination,
 * sorting, and edge cases that mutation analysis is likely to exercise.
 */
@ExtendWith(MockitoExtension.class)
class SkillsServiceTest {

    @Mock
    private EmployeeContract employeeContract;

    @Mock
    private PortfolioContract portfolioContract;

    private SkillsService service;

    @BeforeEach
    void setUp() {
        service = new SkillsService(employeeContract, portfolioContract);
    }

    private static EmployeeSummary employee(Long id, String name) {
        return new EmployeeSummary(new EmployeeId(id), name, id + "@staff.eng", EmployeeRole.EMPLOYEE);
    }

    private static SkillStrength skill(Long employeeId, String employeeName, String skill, int years, int projectCount) {
        return new SkillStrength(new EmployeeId(employeeId), employeeName, skill, years, projectCount);
    }

    private static PortfolioSummary portfolio(SkillStrength... skills) {
        return new PortfolioSummary(skills[0].employeeId(), List.of(skills));
    }

    private static PortfolioSummary emptyPortfolio(EmployeeId employeeId) {
        return new PortfolioSummary(employeeId, List.of());
    }

    private void givenPortfolio(EmployeeId id, PortfolioSummary summary) {
        given(portfolioContract.portfolioFor(id)).willReturn(summary);
    }

    // ---- Aggregation basics ----

    @Test
    void strongInReturnsEmptyPageWhenNoEmployeesExist() {
        // Given
        given(employeeContract.allEmployees()).willReturn(List.of());

        // When
        Paged<SkillStrength> result = service.strongIn("Angular", 0, PageRequest.of(0, 20));

        // Then
        assertThat(result.content()).isEmpty();
        assertThat(result.offset()).isZero();
        assertThat(result.limit()).isEqualTo(20);
        assertThat(result.total()).isZero();
    }

    @Test
    void strongInReturnsEmptyPageWhenNoSkillMatches() {
        // Given
        EmployeeSummary emp = employee(1L, "Jane");
        given(employeeContract.allEmployees()).willReturn(List.of(emp));
        givenPortfolio(emp.id(), portfolio(skill(1L, "Jane", "React", 5, 2)));

        // When
        Paged<SkillStrength> result = service.strongIn("Angular", 0, PageRequest.of(0, 20));

        // Then
        assertThat(result.content()).isEmpty();
        assertThat(result.total()).isZero();
    }

    @Test
    void strongInReturnsMatchingSkillEntriesRankedByYearsDescendingByDefault() {
        // Given
        EmployeeSummary jane = employee(1L, "Jane");
        EmployeeSummary bob = employee(2L, "Bob");
        given(employeeContract.allEmployees()).willReturn(List.of(jane, bob));
        givenPortfolio(jane.id(), portfolio(skill(1L, "Jane", "Angular", 3, 2)));
        givenPortfolio(bob.id(), portfolio(skill(2L, "Bob", "Angular", 5, 4)));

        // When
        Paged<SkillStrength> result = service.strongIn("Angular", 0, PageRequest.of(0, 20));

        // Then
        assertThat(result.total()).isEqualTo(2L);
        assertThat(result.content()).extracting(SkillStrength::employeeName).containsExactly("Bob", "Jane");
        assertThat(result.content()).extracting(SkillStrength::years).containsExactly(5, 3);
    }

    // ---- Filtering ----

    @Test
    void strongInFiltersByMinYearsIncludingBoundary() {
        // Given — entries with 2, 3, and 4 years; minYears=3 should keep 3 and 4
        EmployeeSummary a = employee(1L, "A");
        EmployeeSummary b = employee(2L, "B");
        EmployeeSummary c = employee(3L, "C");
        given(employeeContract.allEmployees()).willReturn(List.of(a, b, c));
        givenPortfolio(a.id(), portfolio(skill(1L, "A", "Angular", 2, 1)));
        givenPortfolio(b.id(), portfolio(skill(2L, "B", "Angular", 3, 1)));
        givenPortfolio(c.id(), portfolio(skill(3L, "C", "Angular", 4, 1)));

        // When
        Paged<SkillStrength> result = service.strongIn("Angular", 3, PageRequest.of(0, 20));

        // Then — kills mutants that replace >= with > or <
        assertThat(result.total()).isEqualTo(2L);
        assertThat(result.content()).extracting(SkillStrength::years).containsExactly(4, 3);
    }

    @Test
    void searchNormalizesNegativeMinYearsToZero() {
        // Given
        EmployeeSummary emp = employee(1L, "Jane");
        given(employeeContract.allEmployees()).willReturn(List.of(emp));
        givenPortfolio(emp.id(), portfolio(skill(1L, "Jane", "Angular", 1, 1)));

        // When
        Paged<SkillStrength> result = service.search("Angular", -1, 0, 20, null);

        // Then
        assertThat(result.total()).isEqualTo(1L);
        assertThat(result.content()).extracting(SkillStrength::years).containsExactly(1);
    }

    @Test
    void searchIsCaseInsensitiveForSkillName() {
        // Given
        EmployeeSummary emp = employee(1L, "Jane");
        given(employeeContract.allEmployees()).willReturn(List.of(emp));
        givenPortfolio(emp.id(), portfolio(skill(1L, "Jane", "Angular", 4, 2)));

        // When / Then — both directions match
        assertThat(service.search("angular", 0, 0, 20, null).content()).hasSize(1);
        assertThat(service.search("ANGULAR", 0, 0, 20, null).content()).hasSize(1);
        assertThat(service.search("AnGuLaR", 0, 0, 20, null).content()).hasSize(1);
    }

    @Test
    void searchUsesContainsForPartialMatch() {
        // Given
        EmployeeSummary emp = employee(1L, "Jane");
        given(employeeContract.allEmployees()).willReturn(List.of(emp));
        givenPortfolio(emp.id(), portfolio(skill(1L, "Jane", "Angular 17", 4, 2)));

        // When
        Paged<SkillStrength> result = service.search("angular", 0, 0, 20, null);

        // Then
        assertThat(result.content()).hasSize(1);
        assertThat(result.content().get(0).skill()).isEqualTo("Angular 17");
    }

    // ---- Pagination ----

    @Test
    void searchPagesAfterFilterAndSort() {
        // Given — 5 matching entries, years 1..5
        given(employeeContract.allEmployees()).willReturn(List.of(
                employee(1L, "A"), employee(2L, "B"), employee(3L, "C"),
                employee(4L, "D"), employee(5L, "E")));
        for (long i = 1; i <= 5; i++) {
            givenPortfolio(new EmployeeId(i), portfolio(skill(i, String.valueOf(i), "Java", (int) i, 1)));
        }

        // When
        Paged<SkillStrength> result = service.search("Java", 0, 2, 2, null);

        // Then
        assertThat(result.content()).hasSize(2);
        assertThat(result.offset()).isEqualTo(2);
        assertThat(result.limit()).isEqualTo(2);
        assertThat(result.total()).isEqualTo(5L);
        assertThat(result.content()).extracting(SkillStrength::years).containsExactly(3, 2);
    }

    @Test
    void searchReturnsEmptyContentWhenOffsetExceedsTotal() {
        // Given
        EmployeeSummary emp = employee(1L, "Jane");
        given(employeeContract.allEmployees()).willReturn(List.of(emp));
        givenPortfolio(emp.id(), portfolio(skill(1L, "Jane", "Angular", 5, 2)));

        // When
        Paged<SkillStrength> result = service.search("Angular", 0, 10, 20, null);

        // Then
        assertThat(result.content()).isEmpty();
        assertThat(result.offset()).isEqualTo(10);
        assertThat(result.total()).isEqualTo(1L);
    }

    @Test
    void searchClampsLimitToMax() {
        // Given
        given(employeeContract.allEmployees()).willReturn(List.of(employee(1L, "Jane")));
        givenPortfolio(new EmployeeId(1L), portfolio(skill(1L, "Jane", "Angular", 5, 2)));

        // When
        Paged<SkillStrength> result = service.search("Angular", 0, 0, 200, null);

        // Then
        assertThat(result.limit()).isEqualTo(SkillsService.maxLimit());
        assertThat(result.content()).hasSize(1);
    }

    @Test
    void searchUsesDefaultLimitWhenLimitIsNonPositive() {
        // Given
        given(employeeContract.allEmployees()).willReturn(List.of(employee(1L, "Jane")));
        givenPortfolio(new EmployeeId(1L), portfolio(skill(1L, "Jane", "Angular", 5, 2)));

        // When
        Paged<SkillStrength> result = service.search("Angular", 0, 0, 0, null);

        // Then
        assertThat(result.limit()).isEqualTo(SkillsService.defaultLimit());
        assertThat(result.content()).hasSize(1);
    }

    @Test
    void searchUsesZeroOffsetWhenOffsetIsNegative() {
        // Given
        given(employeeContract.allEmployees()).willReturn(List.of(employee(1L, "Jane")));
        givenPortfolio(new EmployeeId(1L), portfolio(skill(1L, "Jane", "Angular", 5, 2)));

        // When
        Paged<SkillStrength> result = service.search("Angular", 0, -5, 20, null);

        // Then
        assertThat(result.offset()).isZero();
        assertThat(result.content()).hasSize(1);
    }

    // ---- Sorting ----

    @Test
    void searchSortsByProjectCountAscending() {
        // Given
        EmployeeSummary a = employee(1L, "A");
        EmployeeSummary b = employee(2L, "B");
        given(employeeContract.allEmployees()).willReturn(List.of(a, b));
        givenPortfolio(a.id(), portfolio(skill(1L, "A", "Java", 5, 1)));
        givenPortfolio(b.id(), portfolio(skill(2L, "B", "Java", 2, 3)));

        // When
        Paged<SkillStrength> result = service.search("Java", 0, 0, 20, "projectCount,asc");

        // Then
        assertThat(result.content()).extracting(SkillStrength::projectCount).containsExactly(1, 3);
    }

    @Test
    void searchSortsByProjectCountDescending() {
        // Given
        EmployeeSummary a = employee(1L, "A");
        EmployeeSummary b = employee(2L, "B");
        given(employeeContract.allEmployees()).willReturn(List.of(a, b));
        givenPortfolio(a.id(), portfolio(skill(1L, "A", "Java", 5, 1)));
        givenPortfolio(b.id(), portfolio(skill(2L, "B", "Java", 2, 3)));

        // When
        Paged<SkillStrength> result = service.search("Java", 0, 0, 20, "projectCount,desc");

        // Then
        assertThat(result.content()).extracting(SkillStrength::projectCount).containsExactly(3, 1);
    }

    @Test
    void searchSortsByYearsAscending() {
        // Given
        EmployeeSummary a = employee(1L, "A");
        EmployeeSummary b = employee(2L, "B");
        given(employeeContract.allEmployees()).willReturn(List.of(a, b));
        givenPortfolio(a.id(), portfolio(skill(1L, "A", "Java", 5, 1)));
        givenPortfolio(b.id(), portfolio(skill(2L, "B", "Java", 2, 3)));

        // When
        Paged<SkillStrength> result = service.search("Java", 0, 0, 20, "years,asc");

        // Then
        assertThat(result.content()).extracting(SkillStrength::years).containsExactly(2, 5);
    }

    @Test
    void searchUsesDefaultDirectionWhenSortHasNoDirection() {
        // Given
        EmployeeSummary a = employee(1L, "A");
        EmployeeSummary b = employee(2L, "B");
        given(employeeContract.allEmployees()).willReturn(List.of(a, b));
        givenPortfolio(a.id(), portfolio(skill(1L, "A", "Java", 2, 1)));
        givenPortfolio(b.id(), portfolio(skill(2L, "B", "Java", 5, 3)));

        // When
        Paged<SkillStrength> result = service.search("Java", 0, 0, 20, "years");

        // Then — missing direction defaults to desc
        assertThat(result.content()).extracting(SkillStrength::years).containsExactly(5, 2);
    }

    @Test
    void searchUsesDefaultSortWhenSortIsBlank() {
        // Given
        EmployeeSummary a = employee(1L, "A");
        EmployeeSummary b = employee(2L, "B");
        given(employeeContract.allEmployees()).willReturn(List.of(a, b));
        givenPortfolio(a.id(), portfolio(skill(1L, "A", "Java", 2, 1)));
        givenPortfolio(b.id(), portfolio(skill(2L, "B", "Java", 5, 3)));

        // When
        Paged<SkillStrength> result = service.search("Java", 0, 0, 20, "   ");

        // Then — blank sort falls back to years,desc
        assertThat(result.content()).extracting(SkillStrength::years).containsExactly(5, 2);
    }

    @Test
    void searchBreaksTiesByOtherStrengthIndicatorThenName() {
        // Given — equal years, different projectCount and names
        EmployeeSummary a = employee(1L, "Bob");
        EmployeeSummary b = employee(2L, "Alice");
        given(employeeContract.allEmployees()).willReturn(List.of(a, b));
        givenPortfolio(a.id(), portfolio(skill(1L, "Bob", "Java", 5, 3)));
        givenPortfolio(b.id(), portfolio(skill(2L, "Alice", "Java", 5, 1)));

        // When — default years,desc
        Paged<SkillStrength> result = service.search("Java", 0, 0, 20, null);

        // Then — years tie → projectCount desc → name asc
        assertThat(result.content()).extracting(SkillStrength::employeeName).containsExactly("Bob", "Alice");
    }

    // ---- Validation ----

    @Test
    void searchRejectsBlankSkillName() {
        // When / Then
        assertThatThrownBy(() -> service.search("   ", 0, 0, 20, null))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("name is required");
    }

    @Test
    void searchRejectsNullSkillName() {
        // When / Then
        assertThatThrownBy(() -> service.search(null, 0, 0, 20, null))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("name is required");
    }

    @Test
    void searchRejectsUnknownSortField() {
        // Given / When / Then — sort validation happens before any contract call
        assertThatThrownBy(() -> service.search("Angular", 0, 0, 20, "hackerField,asc"))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("unsupported sort field");
    }

    @Test
    void searchRejectsMalformedSortDirection() {
        // Given / When / Then — anything other than "asc"/"desc" is rejected before any contract call
        assertThatThrownBy(() -> service.search("Angular", 0, 0, 20, "years,up"))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("unsupported sort direction");
    }

    // ---- Resilience ----

    @Test
    void searchIgnoresPortfolioEntryWithNullSkillName() {
        // Given
        EmployeeSummary emp = employee(1L, "Jane");
        given(employeeContract.allEmployees()).willReturn(List.of(emp));
        givenPortfolio(emp.id(), new PortfolioSummary(emp.id(), List.of(
                skill(1L, "Jane", "Angular", 5, 2),
                new SkillStrength(emp.id(), "Jane", null, 3, 4))));

        // When
        Paged<SkillStrength> result = service.search("Angular", 0, 0, 20, null);

        // Then
        assertThat(result.total()).isEqualTo(1L);
        assertThat(result.content().get(0).skill()).isEqualTo("Angular");
    }

    @Test
    void searchTieBreakHandlesNullEmployeeName() {
        // Given — equal years and projectCount, one null name
        EmployeeSummary a = employee(1L, "A");
        EmployeeSummary b = employee(2L, "B");
        given(employeeContract.allEmployees()).willReturn(List.of(a, b));
        givenPortfolio(a.id(), new PortfolioSummary(a.id(), List.of(
                new SkillStrength(a.id(), null, "Java", 5, 3))));
        givenPortfolio(b.id(), new PortfolioSummary(b.id(), List.of(
                skill(2L, "Bob", "Java", 5, 3))));

        // When
        Paged<SkillStrength> result = service.search("Java", 0, 0, 20, null);

        // Then — null name sorts before non-null ("" < "Bob")
        assertThat(result.content()).extracting(SkillStrength::employeeId).containsExactly(a.id(), b.id());
    }

    @Test
    void searchSkipsEmployeeWithoutPortfolio() {
        // Given
        EmployeeSummary withPortfolio = employee(1L, "Jane");
        EmployeeSummary withoutPortfolio = employee(2L, "Ghost");
        given(employeeContract.allEmployees()).willReturn(List.of(withPortfolio, withoutPortfolio));
        givenPortfolio(withPortfolio.id(), portfolio(skill(1L, "Jane", "Angular", 5, 2)));
        given(portfolioContract.portfolioFor(withoutPortfolio.id())).willReturn(emptyPortfolio(withoutPortfolio.id()));

        // When
        Paged<SkillStrength> result = service.search("Angular", 0, 0, 20, null);

        // Then
        assertThat(result.total()).isEqualTo(1L);
        assertThat(result.content().get(0).employeeName()).isEqualTo("Jane");
    }

    @Test
    void searchCollectsMultipleSkillsPerEmployee() {
        // Given
        EmployeeSummary emp = employee(1L, "Jane");
        given(employeeContract.allEmployees()).willReturn(List.of(emp));
        givenPortfolio(emp.id(), new PortfolioSummary(emp.id(), List.of(
                skill(1L, "Jane", "Angular", 4, 2),
                skill(1L, "Jane", "React", 2, 5),
                skill(1L, "Jane", "Angular", 1, 1))));

        // When
        Paged<SkillStrength> result = service.search("Angular", 0, 0, 20, null);

        // Then
        assertThat(result.total()).isEqualTo(2L);
        assertThat(result.content()).extracting(SkillStrength::years).containsExactly(4, 1);
    }

    @Test
    void searchDoesNotInvokePortfolioContractWhenNoEmployees() {
        // Given
        given(employeeContract.allEmployees()).willReturn(List.of());

        // When
        service.search("Angular", 0, 0, 20, null);

        // Then — portfolioContract is never called ( Mockito defaults to no interaction)
        org.mockito.Mockito.verifyNoInteractions(portfolioContract);
    }
}
