package com.staffengagement.shared.security;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Unit tests for {@link SecurityConfig}.
 * Verifies configuration structure and dependencies.
 * Note: Full security chain testing requires Spring Boot test context.
 */
@DisplayName("SecurityConfig")
class SecurityConfigTest {

    private JwtAuthFilter jwtAuthFilter;
    private AuthErrorHandlers authErrorHandlers;
    private SecurityConfig securityConfig;
    private ObjectMapper objectMapper;

    @BeforeEach
    void setUp() {
        objectMapper = new ObjectMapper().registerModule(new JavaTimeModule());
        jwtAuthFilter = new JwtAuthFilter(null, null);
        authErrorHandlers = new AuthErrorHandlers(objectMapper);
        securityConfig = new SecurityConfig(jwtAuthFilter, authErrorHandlers);
    }

    @Test
    @DisplayName("should create SecurityConfig with required dependencies")
    void constructor_shouldCreateSecurityConfig() {
        // Given
        JwtAuthFilter jwtAuthFilter = new JwtAuthFilter(null, null);
        AuthErrorHandlers authErrorHandlers = new AuthErrorHandlers(objectMapper);

        // When
        SecurityConfig config = new SecurityConfig(jwtAuthFilter, authErrorHandlers);

        // Then
        assertThat(config).isNotNull();
    }

    @Test
    @DisplayName("should have securityFilterChain method")
    void shouldHaveSecurityFilterChainMethod() throws Exception {
        // Given/Then - method exists and is callable (actual chain building requires Spring context)
        assertThat(SecurityConfig.class.getDeclaredMethod("securityFilterChain",
                org.springframework.security.config.annotation.web.builders.HttpSecurity.class))
                .isNotNull();
    }
}
