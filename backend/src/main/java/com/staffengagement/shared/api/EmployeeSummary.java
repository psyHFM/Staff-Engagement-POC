package com.staffengagement.shared.api;

import com.staffengagement.shared.kernel.EmployeeId;
import com.staffengagement.shared.kernel.EmployeeRole;

/**
 * Read model for an Employee, returned by {@link EmployeeContract}. Frozen in Phase 0;
 * {@code role} added additively in the Phase 1 shared-kernel coordination PR (ROADMAP
 * §2.2 — coordination PR, additive only). {@code jobTitle}, {@code department}, and
 * {@code level} were added additively in Phase 6 so the rounded profile can display the
 * full employee header without reaching into the Employee module's internals.
 */
public record EmployeeSummary(
        EmployeeId id,
        String fullName,
        String email,
        EmployeeRole role,
        String jobTitle,
        String department,
        String level) {
}