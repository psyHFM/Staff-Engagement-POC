package com.staffengagement.interaction.controller;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import com.staffengagement.interaction.service.FacilitatorNotFoundException;
import com.staffengagement.interaction.service.InteractionNotFoundException;
import com.staffengagement.interaction.service.SubjectNotFoundException;
import com.staffengagement.shared.error.ErrorEnvelope;
import jakarta.servlet.http.HttpServletRequest;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;

/**
 * BDD unit tests for {@link InteractionErrorHandler} — verifies the module's
 * domain exceptions and malformed bodies map to the uniform {@link ErrorEnvelope}
 * with the right status. No Spring context (per {@code testing-strategy.yaml}).
 */
class InteractionErrorHandlerTest {

    private final InteractionErrorHandler handler = new InteractionErrorHandler();

    private HttpServletRequest request(String path) {
        HttpServletRequest req = mock(HttpServletRequest.class);
        when(req.getRequestURI()).thenReturn(path);
        return req;
    }

    @Test
    void unknownSubjectMapsTo404Envelope() {
        // Given
        var ex = new SubjectNotFoundException(1L);

        // When
        ResponseEntity<ErrorEnvelope> response = handler.handleNotFound(ex, request("/api/v1/interactions"));

        // Then
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.NOT_FOUND);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().status()).isEqualTo(404);
        assertThat(response.getBody().error()).isEqualTo("Not Found");
        assertThat(response.getBody().message()).contains("1");
        assertThat(response.getBody().path()).isEqualTo("/api/v1/interactions");
        assertThat(response.getBody().timestamp()).isNotNull();
    }

    @Test
    void unknownFacilitatorMapsTo404Envelope() {
        // Given
        var ex = new FacilitatorNotFoundException(2L);

        // When
        ResponseEntity<ErrorEnvelope> response = handler.handleNotFound(ex, request("/api/v1/interactions"));

        // Then
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.NOT_FOUND);
        assertThat(response.getBody().status()).isEqualTo(404);
        assertThat(response.getBody().message()).contains("2");
    }

    @Test
    void unknownInteractionMapsTo404Envelope() {
        // Given
        var ex = new InteractionNotFoundException(99L);

        // When
        ResponseEntity<ErrorEnvelope> response = handler.handleNotFound(ex, request("/api/v1/interactions/99"));

        // Then
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.NOT_FOUND);
        assertThat(response.getBody().message()).contains("99");
    }

    @Test
    void malformedOrInvalidBodyMapsTo400Envelope() {
        // Given — e.g. an unknown interaction type value fails Jackson deserialization
        var ex = new HttpMessageNotReadableException("bad", (org.springframework.http.HttpInputMessage) null);

        // When
        ResponseEntity<ErrorEnvelope> response = handler.handleNotReadable(ex, request("/api/v1/interactions"));

        // Then
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
        assertThat(response.getBody().status()).isEqualTo(400);
        assertThat(response.getBody().error()).isEqualTo("Bad Request");
        assertThat(response.getBody().path()).isEqualTo("/api/v1/interactions");
    }
}