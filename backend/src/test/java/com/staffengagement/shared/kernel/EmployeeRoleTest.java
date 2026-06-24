package com.staffengagement.shared.kernel;

import org.junit.jupiter.api.Test;

import java.util.Arrays;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * BDD unit test for the frozen {@link EmployeeRole} vocabulary (Phase 1 shared-kernel
 * coordination PR; {@code backend-foundation} delta "Shared kernel value types").
 */
class EmployeeRoleTest {

    @Test
    void exposesExactlyEmployeeAndAdmin() {
        // Given / When
        List<EmployeeRole> values = Arrays.asList(EmployeeRole.values());

        // Then
        assertThat(values).containsExactly(EmployeeRole.EMPLOYEE, EmployeeRole.ADMIN);
    }

    @Test
    void managerRoleDoesNotExist() {
        // Given / When
        List<String> names = Arrays.stream(EmployeeRole.values()).map(Enum::name).toList();

        // Then — MANAGER is removed; only EMPLOYEE and ADMIN remain
        assertThat(names).doesNotContain("MANAGER");
    }
}