package com.staffengagement.employee.service;

import com.staffengagement.shared.kernel.EmployeeRole;

/**
 * The authenticated caller, extracted by the controller from the security context and
 * passed explicitly into the service so the service stays free of
 * {@code SecurityContextHolder} coupling (and unit-testable). {@code email} is the
 * principal's name (email-shaped, e.g. {@code admin@staff.eng}) — the Employee identity
 * key; {@code role} is the caller's resolved role.
 */
public record Caller(String email, EmployeeRole role) {
}