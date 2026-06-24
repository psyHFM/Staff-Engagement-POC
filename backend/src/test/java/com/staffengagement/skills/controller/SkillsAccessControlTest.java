package com.staffengagement.skills.controller;

import static org.assertj.core.api.Assertions.assertThat;

import java.lang.reflect.Method;
import org.junit.jupiter.api.Test;
import org.springframework.security.access.prepost.PreAuthorize;

/**
 * BDD unit test asserting the RBAC rule is declared on the skills search endpoint
 * via {@code @PreAuthorize("isAuthenticated()")}.
 *
 * <p>The behavioural 401/403 envelope is produced by the shared security layer
 * (Phase 0: {@code AuthErrorHandlers} + {@code SecurityConfig}, already tested);
 * the splice's responsibility is to declare the authentication rule. A reflection
 * check keeps this a pure unit test (no Spring/AOP context) per
 * {@code testing-strategy.yaml}.
 */
class SkillsAccessControlTest {

    private static final String AUTHENTICATED = "isAuthenticated()";

    @Test
    void searchEndpointRequiresAuthenticatedUser() throws Exception {
        // Given — the search endpoint
        Method search = SkillsController.class.getMethod("search",
                String.class, int.class, int.class, int.class, String.class);

        // When / Then
        PreAuthorize annotation = search.getAnnotation(PreAuthorize.class);
        assertThat(annotation).as("search must be @PreAuthorize-protected").isNotNull();
        assertThat(annotation.value()).isEqualTo(AUTHENTICATED);
    }
}
