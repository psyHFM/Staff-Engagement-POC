package com.staffengagement.employee.service;

import com.staffengagement.employee.domain.Employee;
import com.staffengagement.employee.domain.EmployeeLevel;
import com.staffengagement.employee.repository.EmployeeRepository;
import com.staffengagement.shared.api.EmployeeSummary;
import com.staffengagement.shared.api.Paged;
import com.staffengagement.shared.kernel.EmployeeId;
import com.staffengagement.shared.kernel.EmployeeRole;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * BDD unit tests for {@link EmployeeService} (JUnit 5 + Mockito). The repository is
 * mocked; entity fields and the {@link Pageable} passed to it are captured to assert
 * the create/update/list logic and the frozen-contract reads.
 */
class EmployeeServiceTest {

    private EmployeeRepository repository;
    private EmployeeService service;

    @BeforeEach
    void setUp() {
        repository = mock(EmployeeRepository.class);
        service = new EmployeeService(repository);
    }

    private static Employee persistedEmployee(Long id, String email, EmployeeRole role) {
        Employee e = new Employee();
        e.setId(id);
        e.setFullName("Jane Doe");
        e.setEmail(email);
        e.setRole(role);
        e.setJobTitle("Eng");
        e.setDepartment("Platform");
        e.setLevel(EmployeeLevel.SENIOR);
        Instant t = Instant.parse("2026-06-24T10:00:00Z");
        e.setCreatedAt(t);
        e.setUpdatedAt(t);
        return e;
    }

    // ---- Frozen contract reads ----

    @Test
    void findByIdReturnsFourFieldSummaryWhenPresent() {
        // Given
        Employee e = persistedEmployee(7L, "jane@staff.eng", EmployeeRole.ADMIN);
        when(repository.findById(7L)).thenReturn(Optional.of(e));

        // When
        Optional<EmployeeSummary> result = service.findById(new EmployeeId(7L));

        // Then
        assertThat(result).isPresent();
        EmployeeSummary s = result.get();
        assertThat(s.id()).isEqualTo(new EmployeeId(7L));
        assertThat(s.fullName()).isEqualTo("Jane Doe");
        assertThat(s.email()).isEqualTo("jane@staff.eng");
        assertThat(s.role()).isEqualTo(EmployeeRole.ADMIN);
    }

    @Test
    void findByIdReturnsEmptyWhenMissing() {
        // Given
        when(repository.findById(99L)).thenReturn(Optional.empty());

        // When / Then
        assertThat(service.findById(new EmployeeId(99L))).isEmpty();
    }

    @Test
    void existsDelegatesToRepository() {
        // Given
        when(repository.existsById(5L)).thenReturn(true);
        when(repository.existsById(6L)).thenReturn(false);

        // When / Then
        assertThat(service.exists(new EmployeeId(5L))).isTrue();
        assertThat(service.exists(new EmployeeId(6L))).isFalse();
    }

    @Test
    void findByEmailReturnsSummaryWhenPresentAndEmptyWhenUnknown() {
        // Given
        when(repository.findByEmail("jane@staff.eng"))
                .thenReturn(Optional.of(persistedEmployee(7L, "jane@staff.eng", EmployeeRole.EMPLOYEE)));
        when(repository.findByEmail("nobody@staff.eng")).thenReturn(Optional.empty());

        // When / Then
        assertThat(service.findByEmail("jane@staff.eng")).isPresent()
                .get().extracting(EmployeeSummary::role).isEqualTo(EmployeeRole.EMPLOYEE);
        assertThat(service.findByEmail("nobody@staff.eng")).isEmpty();
    }

    // ---- Create ----

    @Test
    void createBindsEmailToCallerAndForcesEmployeeRole() {
        // Given
        Caller caller = new Caller("jane@staff.eng", EmployeeRole.ADMIN); // even an admin self-creating stays EMPLOYEE
        when(repository.existsByEmail("jane@staff.eng")).thenReturn(false);
        when(repository.save(any(Employee.class))).thenAnswer(inv -> {
            Employee e = inv.getArgument(0);
            e.setId(42L);
            return e;
        });

        // When
        EmployeeResponse response = service.create("Jane Doe", "Eng", "Platform",
                EmployeeLevel.SENIOR, caller);

        // Then
        ArgumentCaptor<Employee> captor = ArgumentCaptor.forClass(Employee.class);
        verify(repository).save(captor.capture());
        Employee saved = captor.getValue();
        assertThat(saved.getEmail()).isEqualTo("jane@staff.eng");        // bound to principal
        assertThat(saved.getRole()).isEqualTo(EmployeeRole.EMPLOYEE);   // forced, no self-promotion
        assertThat(saved.getFullName()).isEqualTo("Jane Doe");
        assertThat(saved.getJobTitle()).isEqualTo("Eng");
        assertThat(saved.getDepartment()).isEqualTo("Platform");
        assertThat(saved.getLevel()).isEqualTo(EmployeeLevel.SENIOR);
        assertThat(saved.getCreatedAt()).isNotNull();
        assertThat(saved.getUpdatedAt()).isEqualTo(saved.getCreatedAt());

        assertThat(response.id()).isEqualTo(new EmployeeId(42L));
        assertThat(response.role()).isEqualTo(EmployeeRole.EMPLOYEE);
        assertThat(response.email()).isEqualTo("jane@staff.eng");
    }

    @Test
    void createRejectsAlreadyBoundEmailWith409() {
        // Given
        Caller caller = new Caller("jane@staff.eng", EmployeeRole.EMPLOYEE);
        when(repository.existsByEmail("jane@staff.eng")).thenReturn(true);

        // When / Then
        assertThatThrownBy(() -> service.create("Jane Doe", null, null, null, caller))
                .isInstanceOf(DuplicateEmailException.class);
    }

    @Test
    void createRejectsBlankFullNameWith400() {
        // Given
        Caller caller = new Caller("jane@staff.eng", EmployeeRole.EMPLOYEE);

        // When / Then
        assertThatThrownBy(() -> service.create("  ", null, null, null, caller))
                .isInstanceOf(IllegalArgumentException.class);
    }

    // ---- Update ----

    @Test
    void ownerUpdatesOwnProfileWithoutChangingRole() {
        // Given — caller owns the record (email matches), is a non-admin, sends no role
        Employee existing = persistedEmployee(7L, "jane@staff.eng", EmployeeRole.EMPLOYEE);
        when(repository.findById(7L)).thenReturn(Optional.of(existing));
        when(repository.save(any(Employee.class))).thenAnswer(inv -> inv.getArgument(0));
        Caller caller = new Caller("jane@staff.eng", EmployeeRole.EMPLOYEE);

        // When
        EmployeeResponse response = service.update(7L, "Jane Smith", "Lead", "X",
                EmployeeLevel.INTERMEDIATE, null, null, caller);

        // Then
        assertThat(response.fullName()).isEqualTo("Jane Smith");
        assertThat(response.jobTitle()).isEqualTo("Lead");
        assertThat(response.department()).isEqualTo("X");
        assertThat(response.level()).isEqualTo(EmployeeLevel.INTERMEDIATE);
        assertThat(response.role()).isEqualTo(EmployeeRole.EMPLOYEE); // unchanged
        assertThat(response.updatedAt()).isNotEqualTo(existing.getCreatedAt());
    }

    @Test
    void adminUpdatesAnyRecordAndMayChangeRole() {
        // Given — admin updating someone else's record and setting role
        Employee existing = persistedEmployee(7L, "jane@staff.eng", EmployeeRole.EMPLOYEE);
        when(repository.findById(7L)).thenReturn(Optional.of(existing));
        when(repository.save(any(Employee.class))).thenAnswer(inv -> inv.getArgument(0));
        Caller admin = new Caller("admin@staff.eng", EmployeeRole.ADMIN);

        // When
        EmployeeResponse response = service.update(7L, "Jane Doe", null, null, null,
                EmployeeRole.ADMIN, null, admin);

        // Then
        assertThat(response.role()).isEqualTo(EmployeeRole.ADMIN);
    }

    @Test
    void nonOwnerNonAdminIsRejectedWith403() {
        // Given — caller is neither owner nor admin
        Employee existing = persistedEmployee(7L, "jane@staff.eng", EmployeeRole.EMPLOYEE);
        when(repository.findById(7L)).thenReturn(Optional.of(existing));
        Caller other = new Caller("bob@staff.eng", EmployeeRole.EMPLOYEE);

        // When / Then
        assertThatThrownBy(() -> service.update(7L, "X", null, null, null, null, null, other))
                .isInstanceOf(EmployeeAccessDeniedException.class);
    }

    @Test
    void nonAdminRoleChangeIsRejectedWith403() {
        // Given — owner (allowed to edit) but a non-admin trying to promote themselves
        Employee existing = persistedEmployee(7L, "jane@staff.eng", EmployeeRole.EMPLOYEE);
        when(repository.findById(7L)).thenReturn(Optional.of(existing));
        Caller owner = new Caller("jane@staff.eng", EmployeeRole.EMPLOYEE);

        // When / Then
        assertThatThrownBy(() -> service.update(7L, "Jane", null, null, null,
                EmployeeRole.ADMIN, null, owner))
                .isInstanceOf(EmployeeAccessDeniedException.class);
    }

    @Test
    void nonAdminReSendingSameRoleIsAllowed() {
        // Given — owner re-sending the same role (not a change) is a no-op, not a 403
        Employee existing = persistedEmployee(7L, "jane@staff.eng", EmployeeRole.EMPLOYEE);
        when(repository.findById(7L)).thenReturn(Optional.of(existing));
        when(repository.save(any(Employee.class))).thenAnswer(inv -> inv.getArgument(0));
        Caller owner = new Caller("jane@staff.eng", EmployeeRole.EMPLOYEE);

        // When
        EmployeeResponse response = service.update(7L, "Jane", null, null, null,
                EmployeeRole.EMPLOYEE, null, owner);

        // Then
        assertThat(response.role()).isEqualTo(EmployeeRole.EMPLOYEE);
    }

    @Test
    void differingEmailIsRejectedWith400() {
        // Given — owner attempts to change the immutable identity key
        Employee existing = persistedEmployee(7L, "jane@staff.eng", EmployeeRole.EMPLOYEE);
        when(repository.findById(7L)).thenReturn(Optional.of(existing));
        Caller owner = new Caller("jane@staff.eng", EmployeeRole.EMPLOYEE);

        // When / Then
        assertThatThrownBy(() -> service.update(7L, "Jane", null, null, null, null,
                "other@staff.eng", owner))
                .isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    void updateMissingEmployeeReturns404() {
        // Given
        when(repository.findById(99L)).thenReturn(Optional.empty());
        Caller admin = new Caller("admin@staff.eng", EmployeeRole.ADMIN);

        // When / Then
        assertThatThrownBy(() -> service.update(99L, "Jane", null, null, null, null, null, admin))
                .isInstanceOf(EmployeeNotFoundException.class);
    }

    @Test
    void updateRejectsBlankFullNameWith400() {
        // Given — owner but blank fullName
        Employee existing = persistedEmployee(7L, "jane@staff.eng", EmployeeRole.EMPLOYEE);
        when(repository.findById(7L)).thenReturn(Optional.of(existing));
        Caller owner = new Caller("jane@staff.eng", EmployeeRole.EMPLOYEE);

        // When / Then
        assertThatThrownBy(() -> service.update(7L, "  ", null, null, null, null, null, owner))
                .isInstanceOf(IllegalArgumentException.class);
    }

    // ---- List ----

    @Test
    void listDefaultsToCreatedAtDescAndReturnsPaged() {
        // Given
        Employee e = persistedEmployee(7L, "jane@staff.eng", EmployeeRole.EMPLOYEE);
        when(repository.findAll(any(Pageable.class)))
                .thenAnswer(inv -> new PageImpl<>(List.of(e), inv.getArgument(0), 1L));

        // When
        Paged<EmployeeResponse> result = service.list(0, 20, null);

        // Then
        ArgumentCaptor<Pageable> captor = ArgumentCaptor.forClass(Pageable.class);
        verify(repository).findAll(captor.capture());
        assertThat(captor.getValue().getOffset()).isZero();
        assertThat(captor.getValue().getPageSize()).isEqualTo(20);
        assertThat(captor.getValue().getSort().getOrderFor("createdAt").getDirection())
                .isEqualTo(Sort.Direction.DESC);

        assertThat(result.content()).hasSize(1);
        assertThat(result.offset()).isZero();
        assertThat(result.limit()).isEqualTo(20);
        assertThat(result.total()).isEqualTo(1L);
    }

    @Test
    void listClampsLimitToHundred() {
        // Given
        when(repository.findAll(any(Pageable.class)))
                .thenAnswer(inv -> new PageImpl<>(List.of(), inv.getArgument(0), 0L));

        // When
        service.list(0, 150, null);

        // Then
        ArgumentCaptor<Pageable> captor = ArgumentCaptor.forClass(Pageable.class);
        verify(repository).findAll(captor.capture());
        assertThat(captor.getValue().getPageSize()).isEqualTo(100);
    }

    @Test
    void listRejectsUnknownSortFieldWith400() {
        // Given / When / Then
        assertThatThrownBy(() -> service.list(0, 20, "hackerField,asc"))
                .isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    void listHonoursWhitelistedSortFieldAndDirection() {
        // Given
        when(repository.findAll(any(Pageable.class)))
                .thenAnswer(inv -> new PageImpl<>(List.of(), inv.getArgument(0), 0L));

        // When
        service.list(0, 20, "fullName,asc");

        // Then
        ArgumentCaptor<Pageable> captor = ArgumentCaptor.forClass(Pageable.class);
        verify(repository).findAll(captor.capture());
        assertThat(captor.getValue().getSort().getOrderFor("fullName").getDirection())
                .isEqualTo(Sort.Direction.ASC);
    }

    // ---- getById ----

    @Test
    void findResponseByIdReturnsFullRecordWhenPresent() {
        // Given
        when(repository.findById(7L))
                .thenReturn(Optional.of(persistedEmployee(7L, "jane@staff.eng", EmployeeRole.EMPLOYEE)));

        // When
        Optional<EmployeeResponse> result = service.findResponseById(7L);

        // Then
        assertThat(result).isPresent();
        assertThat(result.get().jobTitle()).isEqualTo("Eng");
        assertThat(result.get().level()).isEqualTo(EmployeeLevel.SENIOR);
    }

    @Test
    void findResponseByIdReturnsEmptyWhenMissing() {
        // Given
        when(repository.findById(99L)).thenReturn(Optional.empty());

        // When / Then
        assertThat(service.findResponseById(99L)).isEmpty();
    }
}