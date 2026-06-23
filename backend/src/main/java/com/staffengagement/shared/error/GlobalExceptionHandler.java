package com.staffengagement.shared.error;

import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import java.time.Instant;

/**
 * Translates exceptions into the uniform error envelope ({@code api-standards.yaml}).
 * Authentication/authorization failures are handled earlier by Spring Security's
 * {@code AuthenticationEntryPoint}/{@code AccessDeniedHandler}, not here.
 */
@RestControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<ErrorEnvelope> handleBadRequest(IllegalArgumentException ex, HttpServletRequest req) {
        return envelope(HttpStatus.BAD_REQUEST, ex.getMessage(), req);
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<ErrorEnvelope> handleUnexpected(Exception ex, HttpServletRequest req) {
        return envelope(HttpStatus.INTERNAL_SERVER_ERROR, ex.getMessage(), req);
    }

    private ResponseEntity<ErrorEnvelope> envelope(HttpStatus status, String message, HttpServletRequest req) {
        var body = new ErrorEnvelope(Instant.now(), status.value(), status.getReasonPhrase(), message, req.getRequestURI());
        return ResponseEntity.status(status).body(body);
    }
}