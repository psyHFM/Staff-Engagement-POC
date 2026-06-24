package com.staffengagement.portfolio.controller;

import com.staffengagement.portfolio.service.EmployeeNotFoundException;
import com.staffengagement.portfolio.service.PortfolioEntryNotFoundException;
import com.staffengagement.shared.error.ErrorEnvelope;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import java.time.Instant;

/**
 * Module-local error handler for the Portfolio module. Maps the module's 404 domain
 * exceptions and malformed request bodies to the uniform {@link ErrorEnvelope}
 * ({@code api-standards.yaml}).
 *
 * <p>Scoped to {@code com.staffengagement.portfolio.controller} so it never intercepts
 * exceptions from other modules. {@code IllegalArgumentException} (validation → 400) is
 * still handled by the frozen {@code shared.error.GlobalExceptionHandler}; this handler is
 * more specific for the module's own not-found types and {@code HttpMessageNotReadableException}.
 *
 * <p>Uses {@code shared.error.ErrorEnvelope} — the shared error contract
 * ({@code api-standards.yaml}) — which is a legitimate shared-foundation type, not a
 * module internal. The portfolio ArchUnit denylist therefore forbids other modules'
 * internals and {@code shared.security}/{@code shared.health}, but permits
 * {@code shared.error}/{@code shared.api}/{@code shared.kernel}.
 */
@RestControllerAdvice(basePackages = "com.staffengagement.portfolio.controller")
public class PortfolioErrorHandler {

    @ExceptionHandler({EmployeeNotFoundException.class, PortfolioEntryNotFoundException.class})
    public ResponseEntity<ErrorEnvelope> handleNotFound(RuntimeException ex, HttpServletRequest req) {
        return envelope(HttpStatus.NOT_FOUND, ex.getMessage(), req);
    }

    @ExceptionHandler(HttpMessageNotReadableException.class)
    public ResponseEntity<ErrorEnvelope> handleNotReadable(HttpMessageNotReadableException ex, HttpServletRequest req) {
        return envelope(HttpStatus.BAD_REQUEST, "Malformed or invalid request body", req);
    }

    private ResponseEntity<ErrorEnvelope> envelope(HttpStatus status, String message, HttpServletRequest req) {
        ErrorEnvelope body = new ErrorEnvelope(Instant.now(), status.value(), status.getReasonPhrase(), message, req.getRequestURI());
        return ResponseEntity.status(status).body(body);
    }
}