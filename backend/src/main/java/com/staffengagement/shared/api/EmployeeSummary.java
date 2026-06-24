package com.staffengagement.shared.api;

import com.staffengagement.shared.kernel.EmployeeId;
import com.staffengagement.shared.kernel.EmployeeRole;

/**
 * Read model for an Employee, returned by {@link EmployeeContract}. Frozen in Phase 0;
 * {@code role} added additively in the Phase 1 shared-kernel coordination PR (ROADMAP
 * §2.2 — coordination PR, additive only; no existing producer existed in Phase 0).
 */
public record EmployeeSummary(EmployeeId id, String fullName, String email, EmployeeRole role) {
}