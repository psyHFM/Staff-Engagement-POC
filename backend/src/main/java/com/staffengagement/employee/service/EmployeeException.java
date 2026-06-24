package com.staffengagement.employee.service;

/**
 * The single domain exception for the Employee module, raised by
 * {@link EmployeeService} for all of its recoverable error cases. The {@link Kind}
 * discriminates the HTTP status the controller-layer error handler maps it to
 * (404 / 409 / 403); the message is human-readable and self-describing — i.e.
 * "the message is the exception it is" — for example {@code "Employee not found: 42"},
 * {@code "Email already in use: jane@staff.eng"}, or
 * {@code "Not allowed to update employee: 42"}.
 *
 * <p>This consolidates the three former dedicated exceptions (EmployeeNotFound,
 * DuplicateEmail, EmployeeAccessDenied) into one type, keeping the module's failure
 * vocabulary in a single place. The {@link Kind} preserves the distinct status codes
 * required by {@code api-standards.yaml} (404 / 409 / 403) <em>without</em> the service
 * importing HTTP types — the service stays web-agnostic; only the module error handler
 * translates {@link Kind} to an {@code HttpStatus}. A dedicated exception is used for the
 * 403 case (rather than Spring's {@code AccessDeniedException}) because the shared
 * {@code GlobalExceptionHandler}'s {@code Exception} catch-all would otherwise turn it
 * into a 500 before Spring Security's {@code AccessDeniedHandler} ever sees it.
 *
 * <p>{@code IllegalArgumentException} is still used (and left to the shared global handler)
 * for the 400 cases the service raises directly: blank {@code fullName}, an attempt to
 * change the immutable {@code email}, and an unsupported {@code sort} field.
 */
public class EmployeeException extends RuntimeException {

    /** The recoverable Employee error cases, each mapped to a distinct HTTP status. */
    public enum Kind {
        /** No Employee record for the id → 404 Not Found. */
        NOT_FOUND,
        /** The email identity key is already bound to a record → 409 Conflict. */
        DUPLICATE_EMAIL,
        /** Caller is neither the owner nor an ADMIN, or a non-admin attempted a role change → 403 Forbidden. */
        ACCESS_DENIED
    }

    private final Kind kind;

    public EmployeeException(Kind kind, String message) {
        super(message);
        this.kind = kind;
    }

    public Kind kind() {
        return kind;
    }
}