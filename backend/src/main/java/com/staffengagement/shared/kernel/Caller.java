package com.staffengagement.shared.kernel;

/**
 * The authenticated caller, extracted by the controller from the security context and
 * passed explicitly into the service so the service stays free of
 * {@code SecurityContextHolder} coupling (and unit-testable). {@code email} is the
 * principal's name (email-shaped, e.g. {@code admin@staff.eng}) — the Employee identity
 * key; {@code role} is the caller's resolved role.
 *
 * <p>Relocated to {@code shared.kernel} from {@code employee.service} so any module
 * (portfolio, skills, etc.) can carry ownership/role checks without crossing module
 * boundaries (ArchUnit forbids {@code portfolio..} → {@code employee..}).
 */
public record Caller(String email, EmployeeRole role) {
}