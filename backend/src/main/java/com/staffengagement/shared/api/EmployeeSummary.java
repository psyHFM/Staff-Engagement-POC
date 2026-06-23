package com.staffengagement.shared.api;

import com.staffengagement.shared.kernel.EmployeeId;

/**
 * Read model for an Employee, returned by {@link EmployeeContract}. Frozen in Phase 0.
 */
public record EmployeeSummary(EmployeeId id, String fullName, String email) {
}