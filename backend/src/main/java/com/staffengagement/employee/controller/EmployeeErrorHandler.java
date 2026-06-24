package com.staffengagement.employee.controller;

import com.staffengagement.employee.service.EmployeeException;
import com.staffengagement.shared.error.ErrorEnvelope;
import jakarta.servlet.http.HttpServletRequest;
import java.time.Instant;
import java.util.stream.Collectors;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

/**
 * Module-local error handler for the Employee module. Maps the module's single domain
 * exception ({@link EmployeeException}, discriminated by {@link EmployeeException.Kind})
 * plus malformed bodies and Bean Validation failures to the uniform
 * {@link ErrorEnvelope} ({@code api-standards.yaml}).
 *
 * <p>Scoped to {@code com.staffengagement.employee.controller} so it never intercepts
 * exceptions from other modules. The frozen {@code shared.error.GlobalExceptionHandler}
 * is untouched (design D9): it still handles {@code IllegalArgumentException} (blank
 * {@code fullName}, immutable-email change, unsupported {@code sort} field → 400) and the
 * catch-all → 500. {@link EmployeeException} is more specific and takes precedence — it
 * must NOT be left to the catch-all, which would turn a 403/409/404 into a 500. Only the
 * Employee module raises {@code EmployeeException}, so no {@code IllegalArgumentException}
 * or generic {@code Exception} handler is declared here (that would shadow the frozen
 * global handler).
 */
@RestControllerAdvice(basePackages = "com.staffengagement.employee.controller")
public class EmployeeErrorHandler {

    @ExceptionHandler(EmployeeException.class)
    public ResponseEntity<ErrorEnvelope> handleEmployee(EmployeeException ex, HttpServletRequest req) {
        return envelope(statusFor(ex.kind()), ex.getMessage(), req);
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ErrorEnvelope> handleValidation(MethodArgumentNotValidException ex, HttpServletRequest req) {
        String message = ex.getBindingResult().getFieldErrors().stream()
                .map(fe -> fe.getField() + ": " + fe.getDefaultMessage())
                .collect(Collectors.joining("; "));
        return envelope(HttpStatus.BAD_REQUEST, message.isBlank() ? "Validation failed" : message, req);
    }

    @ExceptionHandler(HttpMessageNotReadableException.class)
    public ResponseEntity<ErrorEnvelope> handleNotReadable(HttpMessageNotReadableException ex, HttpServletRequest req) {
        return envelope(HttpStatus.BAD_REQUEST, "Malformed or invalid request body", req);
    }

    private static HttpStatus statusFor(EmployeeException.Kind kind) {
        return switch (kind) {
            case NOT_FOUND -> HttpStatus.NOT_FOUND;
            case DUPLICATE_EMAIL -> HttpStatus.CONFLICT;
            case ACCESS_DENIED -> HttpStatus.FORBIDDEN;
        };
    }

    private ResponseEntity<ErrorEnvelope> envelope(HttpStatus status, String message, HttpServletRequest req) {
        ErrorEnvelope body = new ErrorEnvelope(
                Instant.now(), status.value(), status.getReasonPhrase(), message, req.getRequestURI());
        return ResponseEntity.status(status).body(body);
    }
}