package com.staffengagement.shared.security;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.staffengagement.shared.error.ErrorEnvelope;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.security.web.AuthenticationEntryPoint;
import org.springframework.security.web.access.AccessDeniedHandler;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.time.Instant;

/**
 * Emits the uniform {@link ErrorEnvelope} (api-standards.yaml) for security
 * failures. These are rejected inside the filter chain — before any controller
 * — so {@code @RestControllerAdvice} cannot see them; the chain needs explicit
 * entry-point / denied handlers that write the envelope directly.
 *
 * <ul>
 *   <li>Missing/invalid credentials → {@code 401 Unauthorized}</li>
 *   <li>Authenticated but lacking role → {@code 403 Forbidden}</li>
 * </ul>
 */
@Component
public class AuthErrorHandlers {

    private final ObjectMapper objectMapper;

    public AuthErrorHandlers(ObjectMapper objectMapper) {
        this.objectMapper = objectMapper;
    }

    public AuthenticationEntryPoint authenticationEntryPoint() {
        return (request, response, ex) -> writeEnvelope(response, request, HttpStatus.UNAUTHORIZED, ex);
    }

    public AccessDeniedHandler accessDeniedHandler() {
        return (request, response, ex) -> writeEnvelope(response, request, HttpStatus.FORBIDDEN, ex);
    }

    private void writeEnvelope(HttpServletResponse response, HttpServletRequest request,
                               HttpStatus status, Exception ex) throws IOException {
        response.setStatus(status.value());
        response.setContentType(MediaType.APPLICATION_JSON_VALUE);
        ErrorEnvelope envelope = new ErrorEnvelope(
                Instant.now(),
                status.value(),
                status.getReasonPhrase(),
                ex.getMessage() != null ? ex.getMessage() : status.getReasonPhrase(),
                request.getRequestURI()
        );
        response.getWriter().write(objectMapper.writeValueAsString(envelope));
    }
}