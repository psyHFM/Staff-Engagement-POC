package com.staffengagement.shared.error;

import java.time.Instant;

/**
 * Uniform error envelope ({@code api-standards.yaml}). All error responses use this
 * shape: ISO-8601 {@code timestamp}, integer {@code status}, HTTP error name
 * {@code error}, detailed {@code message}, and request {@code path}.
 */
public record ErrorEnvelope(
        Instant timestamp,
        int status,
        String error,
        String message,
        String path) {
}