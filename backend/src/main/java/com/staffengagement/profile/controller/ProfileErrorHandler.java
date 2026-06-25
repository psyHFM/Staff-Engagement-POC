package com.staffengagement.profile.controller;

import com.staffengagement.profile.service.ProfileNotFoundException;
import com.staffengagement.shared.error.ErrorEnvelope;
import jakarta.servlet.http.HttpServletRequest;
import java.time.Instant;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

/**
 * Module-local error handler for the Profile module.
 *
 * <p>Maps the module's only domain exception ({@link ProfileNotFoundException}) to a
 * 404 {@link ErrorEnvelope} and lets all other exceptions fall through to the frozen
 * {@code shared.error.GlobalExceptionHandler}.
 */
@RestControllerAdvice(basePackages = "com.staffengagement.profile.controller")
public class ProfileErrorHandler {

    @ExceptionHandler(ProfileNotFoundException.class)
    public ResponseEntity<ErrorEnvelope> handleNotFound(ProfileNotFoundException ex, HttpServletRequest req) {
        ErrorEnvelope body = new ErrorEnvelope(
                Instant.now(),
                HttpStatus.NOT_FOUND.value(),
                HttpStatus.NOT_FOUND.getReasonPhrase(),
                ex.getMessage(),
                req.getRequestURI());
        return ResponseEntity.status(HttpStatus.NOT_FOUND).body(body);
    }
}
