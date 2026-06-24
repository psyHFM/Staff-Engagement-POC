package com.staffengagement.interaction.controller;

import com.staffengagement.interaction.service.FacilitatorNotFoundException;
import com.staffengagement.interaction.service.InteractionNotFoundException;
import com.staffengagement.interaction.service.SubjectNotFoundException;
import com.staffengagement.shared.error.ErrorEnvelope;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import java.time.Instant;

/**
 * Module-local error handler for the Interaction module. Maps the module's
 * domain exceptions and malformed/invalid request bodies to the uniform
 * {@link ErrorEnvelope} ({@code api-standards.yaml}).
 *
 * <p>Scoped to {@code com.staffengagement.interaction.controller} so it never
 * intercepts exceptions from other modules. The frozen
 * {@code shared.error.GlobalExceptionHandler} is untouched (design D9): it still
 * handles {@code IllegalArgumentException} (missing required fields → 400) and the
 * catch-all → 500. For exceptions handled here (the module's own not-found types
 * and {@code HttpMessageNotReadableException} for invalid {@code type} /
 * malformed JSON), these handlers are more specific and take precedence.
 */
@RestControllerAdvice(basePackages = "com.staffengagement.interaction.controller")
public class InteractionErrorHandler {

    @ExceptionHandler({SubjectNotFoundException.class, FacilitatorNotFoundException.class, InteractionNotFoundException.class})
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