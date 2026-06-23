package com.staffengagement.shared.security;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.junit.jupiter.api.Test;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.AuthenticationException;

import java.io.PrintWriter;
import java.io.StringWriter;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class AuthErrorHandlersTest {

    // Mirror Spring Boot's auto-configured mapper (JavaTimeModule registered)
    // so Instant serializes the same way it does in production.
    private final ObjectMapper mapper = new ObjectMapper().registerModule(new JavaTimeModule());
    private final AuthErrorHandlers handlers = new AuthErrorHandlers(mapper);

    @Test
    void missingCredentialsReturn401WithUniformEnvelope() throws Exception {
        // Given
        HttpServletRequest request = mock(HttpServletRequest.class);
        HttpServletResponse response = mock(HttpServletResponse.class);
        StringWriter body = new StringWriter();
        when(response.getWriter()).thenReturn(new PrintWriter(body));
        when(request.getRequestURI()).thenReturn("/api/v1/health");

        // When
        handlers.authenticationEntryPoint()
                .commence(request, response, new AuthenticationException("Bad credentials") {});

        // Then
        verify(response).setStatus(401);
        verify(response).setContentType("application/json");
        String json = body.toString();
        assertThat(json).contains("\"status\":401");
        assertThat(json).contains("\"error\":\"Unauthorized\"");
        assertThat(json).contains("\"message\":\"Bad credentials\"");
        assertThat(json).contains("\"path\":\"/api/v1/health\"");
        assertThat(json).contains("\"timestamp\"");
    }

    @Test
    void insufficientRoleReturns403WithUniformEnvelope() throws Exception {
        // Given
        HttpServletRequest request = mock(HttpServletRequest.class);
        HttpServletResponse response = mock(HttpServletResponse.class);
        StringWriter body = new StringWriter();
        when(response.getWriter()).thenReturn(new PrintWriter(body));
        when(request.getRequestURI()).thenReturn("/api/v1/employees/1");

        // When
        handlers.accessDeniedHandler().handle(request, response, new AccessDeniedException("Forbidden"));

        // Then
        verify(response).setStatus(403);
        String json = body.toString();
        assertThat(json).contains("\"status\":403");
        assertThat(json).contains("\"error\":\"Forbidden\"");
        assertThat(json).contains("\"path\":\"/api/v1/employees/1\"");
    }
}