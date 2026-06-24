package com.staffengagement.portfolio.controller;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.BDDMockito.given;

import com.staffengagement.portfolio.service.EmployeeNotFoundException;
import com.staffengagement.portfolio.service.PortfolioEntryNotFoundException;
import com.staffengagement.shared.error.ErrorEnvelope;
import jakarta.servlet.http.HttpServletRequest;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;

/**
 * BDD unit tests for {@link PortfolioErrorHandler} (Phase 4 / testing-strategy.yaml).
 *
 * <p>Verifies the module's 404 domain exceptions and malformed-body error map to the
 * uniform {@link ErrorEnvelope} ({@code api-standards.yaml}): correct status, HTTP error
 * name, message, request path, and a non-null timestamp. Mockito-only — no Spring MVC
 * context (integration testing is disabled per the constitution).
 */
@ExtendWith(MockitoExtension.class)
class PortfolioErrorHandlerTest {

    @Mock
    private HttpServletRequest request;

    @InjectMocks
    private PortfolioErrorHandler handler;

    @Test
    void mapsEmployeeNotFoundTo404Envelope() {
        // Given — an unknown-employee exception with the path on the request
        given(request.getRequestURI()).willReturn("/api/v1/employees/99/portfolio");
        EmployeeNotFoundException ex = new EmployeeNotFoundException(99L);

        // When
        ResponseEntity<ErrorEnvelope> response = handler.handleNotFound(ex, request);

        // Then — 404 with the uniform envelope fields populated
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.NOT_FOUND);
        ErrorEnvelope body = response.getBody();
        assertThat(body).isNotNull();
        assertThat(body.status()).isEqualTo(404);
        assertThat(body.error()).isEqualTo("Not Found");
        assertThat(body.message()).isEqualTo(ex.getMessage());
        assertThat(body.path()).isEqualTo("/api/v1/employees/99/portfolio");
        assertThat(body.timestamp()).isNotNull();
    }

    @Test
    void mapsEntryNotFoundTo404Envelope() {
        // Given — a foreign/unknown sub-resource entry
        given(request.getRequestURI()).willReturn("/api/v1/employees/1/portfolio/skills/404");
        PortfolioEntryNotFoundException ex = new PortfolioEntryNotFoundException(404L);

        // When
        ResponseEntity<ErrorEnvelope> response = handler.handleNotFound(ex, request);

        // Then
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.NOT_FOUND);
        assertThat(response.getBody().status()).isEqualTo(404);
        assertThat(response.getBody().message()).isEqualTo(ex.getMessage());
        assertThat(response.getBody().path()).isEqualTo("/api/v1/employees/1/portfolio/skills/404");
    }

    @Test
    void mapsMalformedBodyTo400Envelope() {
        // Given — a malformed JSON body
        given(request.getRequestURI()).willReturn("/api/v1/employees/1/portfolio");
        HttpMessageNotReadableException ex = new HttpMessageNotReadableException("bad", (org.springframework.http.HttpInputMessage) null);

        // When
        ResponseEntity<ErrorEnvelope> response = handler.handleNotReadable(ex, request);

        // Then — 400 with a generic malformed-body message
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
        assertThat(response.getBody().status()).isEqualTo(400);
        assertThat(response.getBody().error()).isEqualTo("Bad Request");
        assertThat(response.getBody().message()).isEqualTo("Malformed or invalid request body");
        assertThat(response.getBody().timestamp()).isNotNull();
    }
}