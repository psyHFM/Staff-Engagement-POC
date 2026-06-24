package com.staffengagement.employee.controller.dto;

import com.staffengagement.employee.domain.EmployeeLevel;
import com.staffengagement.shared.kernel.EmployeeRole;
import jakarta.validation.constraints.Size;

/**
 * Body for {@code PUT /api/v1/employees/{id}} — full replace of {@code fullName},
 * {@code jobTitle}, {@code department}, and {@code level} (omitted optional fields
 * become null). {@code role} is honoured only when the caller is an ADMIN (a non-admin
 * attempting to change it is rejected with 403 by the service). {@code email} is the
 * immutable identity key: it is not part of the replace; if supplied and differing from
 * the stored value the service rejects it with 400. {@code fullName} is required.
 *
 * <p>Note: {@code fullName} has no {@code @NotBlank} here because the controller applies
 * {@code @Valid} on create-style requests; for PUT the service still rejects a blank
 * {@code fullName} with 400. (Validation annotations are wired in Group 4.)
 */
public record UpdateEmployeeRequest(
        @Size(max = 255) String fullName,
        @Size(max = 255) String jobTitle,
        @Size(max = 255) String department,
        EmployeeLevel level,
        EmployeeRole role,
        String email) {
}