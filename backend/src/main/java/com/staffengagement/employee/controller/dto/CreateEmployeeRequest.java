package com.staffengagement.employee.controller.dto;

import com.staffengagement.employee.domain.EmployeeLevel;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/**
 * Body for {@code POST /api/v1/employees} — self-service create. Carries NO
 * {@code email} (bound to the authenticated principal server-side) and NO {@code role}
 * (forced to {@code EMPLOYEE}; no self-promotion). {@code fullName} is required; the
 * optional fields may be null.
 */
public record CreateEmployeeRequest(
        @NotBlank @Size(max = 255) String fullName,
        @Size(max = 255) String jobTitle,
        @Size(max = 255) String department,
        EmployeeLevel level) {
}