package com.staffengagement.interaction.controller;

import static org.assertj.core.api.Assertions.assertThat;

import java.lang.reflect.Method;
import org.junit.jupiter.api.Test;
import org.springframework.security.access.prepost.PreAuthorize;

/**
 * BDD unit test asserting the RBAC rule is declared on each interaction
 * endpoint via {@code @PreAuthorize("hasRole('MANAGER')")}.
 *
 * <p>The behavioural 401/403 envelope is produced by the shared security layer
 * (Phase 0: {@code AuthErrorHandlers} + {@code SecurityConfig}, already tested);
 * the splice's responsibility is to <em>declare</em> the MANAGER-only rule. A
 * reflection check keeps this a pure unit test (no Spring/AOP context) per
 * {@code testing-strategy.yaml} (unit tests only) while still being
 * mutation-resilient — flipping "MANAGER" to any other value fails the test.
 */
class InteractionAccessControlTest {

    private static final String MANAGER_ONLY = "hasRole('MANAGER')";

    @Test
    void createEndpointRequiresManagerRole() throws Exception {
        // Given — the create endpoint
        Method create = InteractionController.class.getMethod("create",
                com.staffengagement.interaction.controller.dto.CreateInteractionRequest.class);

        // When / Then
        PreAuthorize annotation = create.getAnnotation(PreAuthorize.class);
        assertThat(annotation).as("create must be @PreAuthorize-protected").isNotNull();
        assertThat(annotation.value()).isEqualTo(MANAGER_ONLY);
    }

    @Test
    void listBySubjectEndpointRequiresManagerRole() throws Exception {
        // Given — the list-by-subject endpoint
        Method list = InteractionController.class.getMethod("listBySubject",
                Long.class, int.class, int.class, String.class);

        // When / Then
        PreAuthorize annotation = list.getAnnotation(PreAuthorize.class);
        assertThat(annotation).as("listBySubject must be @PreAuthorize-protected").isNotNull();
        assertThat(annotation.value()).isEqualTo(MANAGER_ONLY);
    }

    @Test
    void getByIdEndpointRequiresManagerRole() throws Exception {
        // Given — the get-by-id endpoint
        Method getById = InteractionController.class.getMethod("getById", Long.class);

        // When / Then
        PreAuthorize annotation = getById.getAnnotation(PreAuthorize.class);
        assertThat(annotation).as("getById must be @PreAuthorize-protected").isNotNull();
        assertThat(annotation.value()).isEqualTo(MANAGER_ONLY);
    }
}