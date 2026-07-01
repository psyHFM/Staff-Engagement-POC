package com.staffengagement.shared.error;

import jakarta.servlet.http.HttpServletRequest;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

import java.time.Instant;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

/**
 * Unit tests for {@link GlobalExceptionHandler}.
 * Verifies uniform error envelope generation for exception handling.
 */
@DisplayName("GlobalExceptionHandler")
class GlobalExceptionHandlerTest {

    private GlobalExceptionHandler handler;
    private HttpServletRequest request;

    @BeforeEach
    void setUp() {
        handler = new GlobalExceptionHandler();
        request = mock(HttpServletRequest.class);
        when(request.getRequestURI()).thenReturn("/api/v1/test");
    }

    @Test
    @DisplayName("should handle IllegalArgumentException with 400 Bad Request")
    void handleBadRequest_shouldReturn400WithEnvelope() {
        // Given
        IllegalArgumentException ex = new IllegalArgumentException("Invalid input provided");

        // When
        ResponseEntity<ErrorEnvelope> response = handler.handleBadRequest(ex, request);

        // Then
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
        ErrorEnvelope body = response.getBody();
        assertThat(body).isNotNull();
        assertThat(body.status()).isEqualTo(400);
        assertThat(body.error()).isEqualTo("Bad Request");
        assertThat(body.message()).isEqualTo("Invalid input provided");
        assertThat(body.path()).isEqualTo("/api/v1/test");
        assertThat(body.timestamp()).isNotNull();
        assertThat(body.timestamp()).isBeforeOrEqualTo(Instant.now());
    }

    @Test
    @DisplayName("should handle generic Exception with 500 Internal Server Error")
    void handleUnexpected_shouldReturn500WithEnvelope() {
        // Given
        Exception ex = new RuntimeException("Unexpected database failure");

        // When
        ResponseEntity<ErrorEnvelope> response = handler.handleUnexpected(ex, request);

        // Then
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.INTERNAL_SERVER_ERROR);
        ErrorEnvelope body = response.getBody();
        assertThat(body).isNotNull();
        assertThat(body.status()).isEqualTo(500);
        assertThat(body.error()).isEqualTo("Internal Server Error");
        assertThat(body.message()).isEqualTo("Unexpected database failure");
        assertThat(body.path()).isEqualTo("/api/v1/test");
        assertThat(body.timestamp()).isNotNull();
        assertThat(body.timestamp()).isBeforeOrEqualTo(Instant.now());
    }

    @Test
    @DisplayName("should capture correct request URI in path")
    void handleBadRequest_shouldCaptureRequestUri() {
        // Given
        when(request.getRequestURI()).thenReturn("/api/v1/employees/123");
        IllegalArgumentException ex = new IllegalArgumentException("Employee not found");

        // When
        ResponseEntity<ErrorEnvelope> response = handler.handleBadRequest(ex, request);

        // Then
        assertThat(response.getBody().path()).isEqualTo("/api/v1/employees/123");
    }

    @Test
    @DisplayName("should handle exception with null message")
    void handleUnexpected_withNullMessage_shouldPreserveNullMessage() {
        // Given
        Exception ex = new Exception() {
            @Override
            public String getMessage() {
                return null;
            }
        };

        // When
        ResponseEntity<ErrorEnvelope> response = handler.handleUnexpected(ex, request);

        // Then
        ErrorEnvelope body = response.getBody();
        assertThat(body).isNotNull();
        assertThat(body.message()).isNull();
    }

    @Test
    @DisplayName("should handle empty message exception")
    void handleBadRequest_withEmptyMessage_shouldUseEmptyMessage() {
        // Given
        IllegalArgumentException ex = new IllegalArgumentException("");

        // When
        ResponseEntity<ErrorEnvelope> response = handler.handleBadRequest(ex, request);

        // Then
        assertThat(response.getBody().message()).isEmpty();
    }

    @Test
    @DisplayName("should handle exception with detailed message")
    void handleUnexpected_withDetailedMessage_shouldPreserveMessage() {
        // Given
        String detailedMessage = "Failed to process request: NullPointerException at line 42";
        Exception ex = new Exception(detailedMessage);

        // When
        ResponseEntity<ErrorEnvelope> response = handler.handleUnexpected(ex, request);

        // Then
        assertThat(response.getBody().message()).isEqualTo(detailedMessage);
    }

    @Test
    @DisplayName("should create envelope with current timestamp")
    void handleBadRequest_shouldSetTimestampToCurrentTime() {
        // Given
        Instant before = Instant.now();
        IllegalArgumentException ex = new IllegalArgumentException("test");

        // When
        ResponseEntity<ErrorEnvelope> response = handler.handleBadRequest(ex, request);

        // Then
        Instant after = Instant.now();
        Instant timestamp = response.getBody().timestamp();
        assertThat(timestamp).isAfterOrEqualTo(before);
        assertThat(timestamp).isBeforeOrEqualTo(after);
    }

    @Test
    @DisplayName("should handle different exception types as generic")
    void handleUnexpected_shouldHandleVariousExceptionTypes() {
        // Given
        Exception[] exceptions = {
                new NullPointerException("null pointer"),
                new IllegalStateException("illegal state"),
                new ArrayIndexOutOfBoundsException("index 5"),
                new ClassCastException("cannot cast")
        };

        // When/Then
        for (Exception ex : exceptions) {
            ResponseEntity<ErrorEnvelope> response = handler.handleUnexpected(ex, request);
            assertThat(response.getStatusCode()).isEqualTo(HttpStatus.INTERNAL_SERVER_ERROR);
            assertThat(response.getBody().message()).isEqualTo(ex.getMessage());
        }
    }

    @Test
    @DisplayName("should handle different request URIs")
    void handleBadRequest_shouldCaptureDifferentUris() {
        // Given
        String[] uris = {
                "/api/v1/employees",
                "/api/v1/tasks/123",
                "/api/v1/portfolios/456",
                "/api/v1/auth/login"
        };

        // When/Then
        for (String uri : uris) {
            when(request.getRequestURI()).thenReturn(uri);
            IllegalArgumentException ex = new IllegalArgumentException("test");
            ResponseEntity<ErrorEnvelope> response = handler.handleBadRequest(ex, request);
            assertThat(response.getBody().path()).isEqualTo(uri);
        }
    }

    @Test
    @DisplayName("should return consistent envelope structure for all error types")
    void shouldReturnConsistentEnvelopeStructure() {
        // Given
        IllegalArgumentException badRequestEx = new IllegalArgumentException("bad request");
        RuntimeException runtimeEx = new RuntimeException("runtime error");

        // When
        ResponseEntity<ErrorEnvelope> badRequestResponse = handler.handleBadRequest(badRequestEx, request);
        ResponseEntity<ErrorEnvelope> runtimeResponse = handler.handleUnexpected(runtimeEx, request);

        // Then
        ErrorEnvelope badRequestBody = badRequestResponse.getBody();
        ErrorEnvelope runtimeBody = runtimeResponse.getBody();

        assertThat(badRequestBody).isNotNull();
        assertThat(runtimeBody).isNotNull();

        // Both should have all required fields
        assertThat(badRequestBody.timestamp()).isNotNull();
        assertThat(badRequestBody.status()).isPositive();
        assertThat(badRequestBody.error()).isNotBlank();
        assertThat(badRequestBody.message()).isNotBlank();
        assertThat(badRequestBody.path()).isNotBlank();

        assertThat(runtimeBody.timestamp()).isNotNull();
        assertThat(runtimeBody.status()).isPositive();
        assertThat(runtimeBody.error()).isNotBlank();
        assertThat(runtimeBody.message()).isNotBlank();
        assertThat(runtimeBody.path()).isNotBlank();

        // Status codes should differ
        assertThat(badRequestBody.status()).isEqualTo(400);
        assertThat(runtimeBody.status()).isEqualTo(500);
    }
}
