package com.staffengagement.employee.controller;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.staffengagement.employee.controller.dto.CreateEmployeeRequest;
import com.staffengagement.employee.controller.dto.UpdateEmployeeRequest;
import com.staffengagement.employee.domain.EmployeeLevel;
import com.staffengagement.shared.kernel.Caller;
import com.staffengagement.employee.service.EmployeeException;
import com.staffengagement.employee.service.EmployeeResponse;
import com.staffengagement.employee.service.EmployeeService;
import com.staffengagement.shared.api.Paged;
import com.staffengagement.shared.kernel.EmployeeId;
import com.staffengagement.shared.kernel.EmployeeRole;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.authority.SimpleGrantedAuthority;

/**
 * BDD unit tests for {@link EmployeeController}. The service is mocked — no Spring MVC
 * context (per {@code testing-strategy.yaml}: unit tests only). RBAC (the
 * {@code @PreAuthorize} declarations) is verified separately by
 * {@link EmployeeAccessControlTest}; the 401/403 envelope behaviour itself is the shared
 * security layer (Phase 0). The caller is passed into the controller method directly
 * (as the principal email + an {@link Authentication} carrying {@code ROLE_*} authorities)
 * so the {@link EmployeeController#callerOf} extraction is exercised.
 */
@ExtendWith(MockitoExtension.class)
class EmployeeControllerTest {

    @Mock
    private EmployeeService employeeService;

    @InjectMocks
    private EmployeeController controller;

    private static Authentication auth(String email, EmployeeRole role) {
        return new UsernamePasswordAuthenticationToken(
                email, null, List.of(new SimpleGrantedAuthority("ROLE_" + role.name())));
    }

    private static EmployeeResponse response(Long id, String email, EmployeeRole role) {
        Instant t = Instant.parse("2026-06-24T10:00:00Z");
        return new EmployeeResponse(new EmployeeId(id), "Jane Doe", email, role,
                "Eng", "Platform", EmployeeLevel.SENIOR, t, t);
    }

    // ---- Create ----

    @Test
    void createReturns201ForwardsBodyAndBindsCallerFromPrincipal() {
        // Given — the service persists and returns the created response
        EmployeeResponse created = response(42L, "jane@staff.eng", EmployeeRole.EMPLOYEE);
        when(employeeService.create(any(), any(), any(), any(), any(Caller.class))).thenReturn(created);

        // When
        var result = controller.create(
                new CreateEmployeeRequest("Jane Doe", "Eng", "Platform", EmployeeLevel.SENIOR),
                "jane@staff.eng", auth("jane@staff.eng", EmployeeRole.EMPLOYEE));

        // Then — 201 with the unwrapped response; the body and a Caller built from the principal are forwarded
        assertThat(result.getStatusCode().value()).isEqualTo(201);
        assertThat(result.getBody()).isEqualTo(created);

        ArgumentCaptor<Caller> caller = ArgumentCaptor.forClass(Caller.class);
        verify(employeeService).create(eq("Jane Doe"), eq("Eng"), eq("Platform"),
                eq(EmployeeLevel.SENIOR), caller.capture());
        assertThat(caller.getValue().email()).isEqualTo("jane@staff.eng");
        assertThat(caller.getValue().role()).isEqualTo(EmployeeRole.EMPLOYEE);
    }

    @Test
    void createBindsAdminRoleWhenAuthorityIsAdmin() {
        // Given — an admin self-creating still forwards the ADMIN caller (the service forces EMPLOYEE)
        EmployeeResponse created = response(42L, "admin@staff.eng", EmployeeRole.EMPLOYEE);
        when(employeeService.create(any(), any(), any(), any(), any(Caller.class))).thenReturn(created);

        // When
        controller.create(new CreateEmployeeRequest("Admin", null, null, null),
                "admin@staff.eng", auth("admin@staff.eng", EmployeeRole.ADMIN));

        // Then — the extracted caller carries the admin role
        ArgumentCaptor<Caller> caller = ArgumentCaptor.forClass(Caller.class);
        verify(employeeService).create(eq("Admin"), any(), any(), any(), caller.capture());
        assertThat(caller.getValue().email()).isEqualTo("admin@staff.eng");
        assertThat(caller.getValue().role()).isEqualTo(EmployeeRole.ADMIN);
    }

    // ---- List ----

    @Test
    void listForwardsOffsetLimitSortAndReturnsPagedResult() {
        // Given
        EmployeeResponse r = response(7L, "jane@staff.eng", EmployeeRole.EMPLOYEE);
        Paged<EmployeeResponse> page = new Paged<>(List.of(r), 0, 20, 1L);
        when(employeeService.list(0, 20, "fullName,asc")).thenReturn(page);

        // When
        Paged<EmployeeResponse> result = controller.list(0, 20, "fullName,asc");

        // Then
        assertThat(result).isEqualTo(page);
        verify(employeeService).list(0, 20, "fullName,asc");
    }

    @Test
    void listForwardsDefaultsWhenParamsOmitted() {
        // Given
        when(employeeService.list(0, 20, null)).thenReturn(new Paged<>(List.of(), 0, 20, 0L));

        // When
        controller.list(0, 20, null);

        // Then — defaults are forwarded unchanged (clamping/whitelisting is the service's job)
        verify(employeeService).list(0, 20, null);
    }

    // ---- getById ----

    @Test
    void getByIdReturnsResponseWhenPresent() {
        // Given
        EmployeeResponse r = response(5L, "jane@staff.eng", EmployeeRole.EMPLOYEE);
        when(employeeService.findResponseById(5L)).thenReturn(Optional.of(r));

        // When
        EmployeeResponse result = controller.getById(5L);

        // Then
        assertThat(result).isEqualTo(r);
    }

    @Test
    void getByIdThrowsNotFoundWhenAbsent() {
        // Given — no employee for the id
        when(employeeService.findResponseById(99L)).thenReturn(Optional.empty());

        // When / Then — the controller raises EmployeeException(NOT_FOUND) → 404 by the error handler
        assertThatThrownBy(() -> controller.getById(99L))
                .isInstanceOfSatisfying(EmployeeException.class,
                        ex -> assertThat(ex.kind()).isEqualTo(EmployeeException.Kind.NOT_FOUND));
    }

    // ---- Update ----

    @Test
    void updateForwardsAllFieldsAndBindsCallerFromPrincipal() {
        // Given — admin updating a record and setting role
        EmployeeResponse updated = response(7L, "jane@staff.eng", EmployeeRole.ADMIN);
        when(employeeService.update(any(), any(), any(), any(), any(), any(), any(), any(Caller.class)))
                .thenReturn(updated);

        // When
        EmployeeResponse result = controller.update(7L,
                new UpdateEmployeeRequest("Jane Smith", "Lead", "X", EmployeeLevel.INTERMEDIATE,
                        EmployeeRole.ADMIN, null),
                "admin@staff.eng", auth("admin@staff.eng", EmployeeRole.ADMIN));

        // Then
        assertThat(result).isEqualTo(updated);
        ArgumentCaptor<Caller> caller = ArgumentCaptor.forClass(Caller.class);
        verify(employeeService).update(eq(7L), eq("Jane Smith"), eq("Lead"), eq("X"),
                eq(EmployeeLevel.INTERMEDIATE), eq(EmployeeRole.ADMIN), eq(null), caller.capture());
        assertThat(caller.getValue().email()).isEqualTo("admin@staff.eng");
        assertThat(caller.getValue().role()).isEqualTo(EmployeeRole.ADMIN);
    }

    @Test
    void updatePropagatesServiceAccessDeniedAsEmployeeException() {
        // Given — a non-owner non-admin caller is rejected by the service with ACCESS_DENIED
        when(employeeService.update(any(), any(), any(), any(), any(), any(), any(), any(Caller.class)))
                .thenThrow(new EmployeeException(EmployeeException.Kind.ACCESS_DENIED,
                        "Not allowed to update employee: 7"));

        // When / Then — the controller does not swallow it; it propagates for the error handler to map to 403
        assertThatThrownBy(() -> controller.update(7L,
                new UpdateEmployeeRequest("X", null, null, null, null, null),
                "bob@staff.eng", auth("bob@staff.eng", EmployeeRole.EMPLOYEE)))
                .isInstanceOfSatisfying(EmployeeException.class,
                        ex -> assertThat(ex.kind()).isEqualTo(EmployeeException.Kind.ACCESS_DENIED));
    }
}