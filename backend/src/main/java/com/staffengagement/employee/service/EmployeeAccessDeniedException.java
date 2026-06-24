package com.staffengagement.employee.service;

/**
 * Thrown when a caller is neither the owner nor an ADMIN (update not allowed), or when
 * a non-admin attempts to change {@code role}. Mapped to 403 by the Employee module
 * error handler. A dedicated exception is used (rather than Spring's
 * {@code AccessDeniedException}) because the shared {@code GlobalExceptionHandler}'s
 * {@code Exception} catch-all would otherwise turn it into a 500 before Spring
 * Security's {@code AccessDeniedHandler} ever sees it.
 */
public class EmployeeAccessDeniedException extends RuntimeException {
    public EmployeeAccessDeniedException(Long id) {
        super("Not allowed to update employee: " + id);
    }
}