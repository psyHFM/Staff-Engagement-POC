package com.staffengagement.employee.controller;

import static org.assertj.core.api.Assertions.assertThat;

import com.staffengagement.employee.controller.dto.CreateEmployeeRequest;
import com.staffengagement.employee.controller.dto.UpdateEmployeeRequest;
import java.lang.reflect.Method;
import org.junit.jupiter.api.Test;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;

/**
 * BDD unit test asserting the RBAC rule is declared on each employee endpoint via
 * {@code @PreAuthorize("isAuthenticated()")}.
 *
 * <p>All four endpoints require only an authenticated caller. The finer-grained
 * owner-or-admin and admin-only-role-change rules on {@code PUT} are enforced inside
 * {@code EmployeeService} via the {@code Caller} (they cannot be expressed in a
 * {@code @PreAuthorize} expression because they need the path id and the stored record)
 * and are covered by {@code EmployeeServiceTest}. The behavioural 401/403 envelope is
 * produced by the shared security layer (Phase 0: {@code AuthErrorHandlers} +
 * {@code SecurityConfig}, already tested); this splice's responsibility is to
 * <em>declare</em> the authenticated-only rule. A reflection check keeps this a pure
 * unit test (no Spring/AOP context) per {@code testing-strategy.yaml} (unit tests only)
 * while still being mutation-resilient — flipping the expression to any other value
 * fails the test.
 */
class EmployeeAccessControlTest {

    private static final String AUTHENTICATED = "isAuthenticated()";

    @Test
    void createEndpointRequiresAuthentication() throws Exception {
        // Given — the create endpoint
        Method create = EmployeeController.class.getMethod(
                "create", CreateEmployeeRequest.class, String.class, Authentication.class);

        // When / Then
        PreAuthorize annotation = create.getAnnotation(PreAuthorize.class);
        assertThat(annotation).as("create must be @PreAuthorize-protected").isNotNull();
        assertThat(annotation.value()).isEqualTo(AUTHENTICATED);
    }

    @Test
    void listEndpointRequiresAuthentication() throws Exception {
        // Given — the list endpoint
        Method list = EmployeeController.class.getMethod("list", int.class, int.class, String.class);

        // When / Then
        PreAuthorize annotation = list.getAnnotation(PreAuthorize.class);
        assertThat(annotation).as("list must be @PreAuthorize-protected").isNotNull();
        assertThat(annotation.value()).isEqualTo(AUTHENTICATED);
    }

    @Test
    void getByIdEndpointRequiresAuthentication() throws Exception {
        // Given — the get-by-id endpoint
        Method getById = EmployeeController.class.getMethod("getById", Long.class);

        // When / Then
        PreAuthorize annotation = getById.getAnnotation(PreAuthorize.class);
        assertThat(annotation).as("getById must be @PreAuthorize-protected").isNotNull();
        assertThat(annotation.value()).isEqualTo(AUTHENTICATED);
    }

    @Test
    void updateEndpointRequiresAuthentication() throws Exception {
        // Given — the update endpoint
        Method update = EmployeeController.class.getMethod(
                "update", Long.class, UpdateEmployeeRequest.class, String.class, Authentication.class);

        // When / Then
        PreAuthorize annotation = update.getAnnotation(PreAuthorize.class);
        assertThat(annotation).as("update must be @PreAuthorize-protected").isNotNull();
        assertThat(annotation.value()).isEqualTo(AUTHENTICATED);
    }
}