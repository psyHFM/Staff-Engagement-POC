package com.staffengagement.profile.controller;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import com.staffengagement.profile.service.ProfileNotFoundException;
import com.staffengagement.shared.error.ErrorEnvelope;
import com.staffengagement.shared.kernel.EmployeeId;
import jakarta.servlet.http.HttpServletRequest;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

/**
 * BDD unit tests for {@link ProfileErrorHandler} — verifies that
 * {@link ProfileNotFoundException} maps to a 404 {@link ErrorEnvelope} with the
 * uniform shape.
 */
class ProfileErrorHandlerTest {

    private final ProfileErrorHandler handler = new ProfileErrorHandler();

    private HttpServletRequest request(String path) {
        HttpServletRequest req = mock(HttpServletRequest.class);
        when(req.getRequestURI()).thenReturn(path);
        return req;
    }

    @Test
    void notFoundMapsTo404Envelope() {
        // Given
        var ex = new ProfileNotFoundException(new EmployeeId(42L));

        // When
        ResponseEntity<ErrorEnvelope> response = handler.handleNotFound(ex, request("/api/v1/employees/42/profile"));

        // Then
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.NOT_FOUND);
        ErrorEnvelope body = response.getBody();
        assertThat(body).isNotNull();
        assertThat(body.status()).isEqualTo(404);
        assertThat(body.error()).isEqualTo("Not Found");
        assertThat(body.message()).isEqualTo("Employee profile not found: 42");
        assertThat(body.path()).isEqualTo("/api/v1/employees/42/profile");
        assertThat(body.timestamp()).isNotNull();
    }
}
