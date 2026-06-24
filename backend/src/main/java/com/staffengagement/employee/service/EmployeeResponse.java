package com.staffengagement.employee.service;

import com.staffengagement.employee.domain.EmployeeLevel;
import com.staffengagement.shared.kernel.EmployeeId;
import com.staffengagement.shared.kernel.EmployeeRole;
import java.time.Instant;

/**
 * Full-field read model for an Employee, returned by the Employee module's own
 * endpoints (unwrapped, camelCase JSON). Richer than the frozen
 * {@link com.staffengagement.shared.api.EmployeeSummary}, which carries only
 * {@code id}/{@code fullName}/{@code email}/{@code role} for cross-module consumers;
 * the optional {@code jobTitle}/{@code department}/{@code level} and the server-managed
 * timestamps are exposed only here, never through the contract. {@code id} is the typed
 * {@link EmployeeId} (wire form {@code {"value":N}}, matching the other module DTOs).
 * Nullable optional fields are omitted when null ({@code non_null} Jackson inclusion).
 */
public record EmployeeResponse(
        EmployeeId id,
        String fullName,
        String email,
        EmployeeRole role,
        String jobTitle,
        String department,
        EmployeeLevel level,
        Instant createdAt,
        Instant updatedAt) {
}