package com.staffengagement.shared.security;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * BDD unit test for the renamed security stub (Phase 1 shared-kernel coordination PR;
 * {@code backend-foundation} delta "JWT + RBAC security stub").
 */
class StubUserStoreTest {

    private final StubUserStore users = new StubUserStore();

    @Test
    void authenticatesEmailShapedUsernamesWithFallbackRoles() {
        // Given / When
        var employee = users.findByCredentials("employee@staff.eng", "staffeng");
        var admin = users.findByCredentials("admin@staff.eng", "staffeng");

        // Then — usernames are email-shaped (the principal name doubles as identity key)
        assertThat(employee).isPresent()
                .get().extracting(StubUserStore.StubUser::username).isEqualTo("employee@staff.eng");
        assertThat(admin).isPresent()
                .get().extracting(StubUserStore.StubUser::username).isEqualTo("admin@staff.eng");
        // and the fallback role list is EMPLOYEE/ADMIN only
        assertThat(employee.get().roles()).containsExactly("EMPLOYEE");
        assertThat(admin.get().roles()).containsExactly("ADMIN");
    }

    @Test
    void rejectsWrongPassword() {
        // Given / When
        var result = users.findByCredentials("employee@staff.eng", "wrong");

        // Then
        assertThat(result).isEmpty();
    }

    @Test
    void doesNotExposeManagerUserOrRole() {
        // Given / When
        var managerByCreds = users.findByCredentials("manager", "staffeng");
        var managerByName = users.findByUsername("manager");

        // Then — the MANAGER role/user is removed in Phase 1
        assertThat(managerByCreds).isEmpty();
        assertThat(managerByName).isEmpty();
    }
}