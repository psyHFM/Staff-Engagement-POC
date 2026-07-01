package com.staffengagement.shared.security;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.core.context.SecurityContextHolder;

import java.io.IOException;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * Unit tests for {@link JwtAuthFilter}.
 * Verifies JWT extraction, validation, and security context population.
 */
@ExtendWith(MockitoExtension.class)
@DisplayName("JwtAuthFilter")
class JwtAuthFilterTest {

    @Mock
    private JwtTokenProvider tokenProvider;

    @Mock
    private StubUserStore userStore;

    @Mock
    private HttpServletRequest request;

    @Mock
    private HttpServletResponse response;

    @Mock
    private FilterChain filterChain;

    private JwtAuthFilter jwtAuthFilter;

    @BeforeEach
    void setUp() {
        jwtAuthFilter = new JwtAuthFilter(tokenProvider, userStore);
        SecurityContextHolder.clearContext();
    }

    @Test
    @DisplayName("should create JwtAuthFilter with required dependencies")
    void constructor_shouldCreateJwtAuthFilter() {
        // Given
        JwtTokenProvider tokenProvider = mock(JwtTokenProvider.class);
        StubUserStore userStore = mock(StubUserStore.class);

        // When
        JwtAuthFilter filter = new JwtAuthFilter(tokenProvider, userStore);

        // Then
        assertThat(filter).isNotNull();
    }

    @Test
    @DisplayName("should extract valid Bearer token and set authentication")
    void doFilterInternal_withValidBearerToken_shouldSetAuthentication() throws ServletException, IOException {
        // Given
        String token = "valid-jwt-token";
        String username = "test@staff.eng";
        List<String> roles = List.of("MANAGER");

        when(request.getHeader("Authorization")).thenReturn("Bearer " + token);
        when(tokenProvider.isValid(token)).thenReturn(true);
        when(tokenProvider.subject(token)).thenReturn(username);
        when(tokenProvider.roles(token)).thenReturn(roles);

        // When
        jwtAuthFilter.doFilterInternal(request, response, filterChain);

        // Then
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        assertThat(auth).isNotNull();
        assertThat(auth.getName()).isEqualTo(username);
        assertThat(auth.getCredentials()).isEqualTo(token);
        assertThat(auth.getAuthorities()).hasSize(1);
        assertThat(auth.getAuthorities().iterator().next().getAuthority()).isEqualTo("ROLE_MANAGER");
    }

    @Test
    @DisplayName("should handle multiple roles in token")
    void doFilterInternal_withMultipleRoles_shouldSetAllAuthorities() throws ServletException, IOException {
        // Given
        String token = "multi-role-jwt";
        String username = "admin@staff.eng";
        List<String> roles = List.of("MANAGER", "ADMIN");

        when(request.getHeader("Authorization")).thenReturn("Bearer " + token);
        when(tokenProvider.isValid(token)).thenReturn(true);
        when(tokenProvider.subject(token)).thenReturn(username);
        when(tokenProvider.roles(token)).thenReturn(roles);

        // When
        jwtAuthFilter.doFilterInternal(request, response, filterChain);

        // Then
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        assertThat(auth).isNotNull();
        assertThat(auth.getAuthorities()).hasSize(2);
        assertThat(auth.getAuthorities())
                .extracting(a -> a.getAuthority())
                .containsExactlyInAnyOrder("ROLE_MANAGER", "ROLE_ADMIN");
    }

    @Test
    @DisplayName("should skip authentication when no Authorization header")
    void doFilterInternal_noAuthorizationHeader_shouldSkipAuthentication() throws ServletException, IOException {
        // Given
        when(request.getHeader("Authorization")).thenReturn(null);

        // When
        jwtAuthFilter.doFilterInternal(request, response, filterChain);

        // Then
        verify(tokenProvider, never()).isValid(anyString());
        verify(filterChain).doFilter(request, response);
    }

    @Test
    @DisplayName("should skip authentication when header doesn't start with Bearer")
    void doFilterInternal_nonBearerHeader_shouldSkipAuthentication() throws ServletException, IOException {
        // Given
        when(request.getHeader("Authorization")).thenReturn("Basic some-token");

        // When
        jwtAuthFilter.doFilterInternal(request, response, filterChain);

        // Then
        verify(tokenProvider, never()).isValid(anyString());
        verify(filterChain).doFilter(request, response);
    }

    @Test
    @DisplayName("should skip authentication when token is invalid")
    void doFilterInternal_invalidToken_shouldSkipAuthentication() throws ServletException, IOException {
        // Given
        String token = "invalid-token";
        when(request.getHeader("Authorization")).thenReturn("Bearer " + token);
        when(tokenProvider.isValid(token)).thenReturn(false);

        // When
        jwtAuthFilter.doFilterInternal(request, response, filterChain);

        // Then
        verify(filterChain).doFilter(request, response);
    }

    @Test
    @DisplayName("should continue filter chain after processing")
    void doFilterInternal_shouldAlwaysContinueFilterChain() throws ServletException, IOException {
        // Given
        when(request.getHeader("Authorization")).thenReturn(null);

        // When
        jwtAuthFilter.doFilterInternal(request, response, filterChain);

        // Then
        verify(filterChain).doFilter(request, response);
    }

    @Test
    @DisplayName("should handle empty roles list")
    void doFilterInternal_withNoRoles_shouldSetAuthenticationWithoutAuthorities() throws ServletException, IOException {
        // Given
        String token = "no-roles-jwt";
        String username = "employee@staff.eng";
        List<String> roles = List.of();

        when(request.getHeader("Authorization")).thenReturn("Bearer " + token);
        when(tokenProvider.isValid(token)).thenReturn(true);
        when(tokenProvider.subject(token)).thenReturn(username);
        when(tokenProvider.roles(token)).thenReturn(roles);

        // When
        jwtAuthFilter.doFilterInternal(request, response, filterChain);

        // Then
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        assertThat(auth).isNotNull();
        assertThat(auth.getName()).isEqualTo(username);
        assertThat(auth.getAuthorities()).isEmpty();
    }

    @Test
    @DisplayName("should handle Bearer token with extra spaces")
    void doFilterInternal_bearerTokenWithSpaces_shouldExtractTokenWithLeadingSpace() throws ServletException, IOException {
        // Given
        String token = "jwt-token";
        when(request.getHeader("Authorization")).thenReturn("Bearer  " + token); // Extra space results in token with leading space
        when(tokenProvider.isValid(" " + token)).thenReturn(false); // Token with leading space is invalid

        // When
        jwtAuthFilter.doFilterInternal(request, response, filterChain);

        // Then
        verify(tokenProvider).isValid(" " + token); // Called with the token including leading space
        verify(filterChain).doFilter(request, response);
    }

    @Test
    @DisplayName("should handle empty Authorization header")
    void doFilterInternal_emptyAuthorizationHeader_shouldSkipAuthentication() throws ServletException, IOException {
        // Given
        when(request.getHeader("Authorization")).thenReturn("");

        // When
        jwtAuthFilter.doFilterInternal(request, response, filterChain);

        // Then
        verify(tokenProvider, never()).isValid(anyString());
        verify(filterChain).doFilter(request, response);
    }

    @Test
    @DisplayName("should handle Bearer prefix only without token")
    void doFilterInternal_bearerOnly_shouldSkipAuthentication() throws ServletException, IOException {
        // Given
        when(request.getHeader("Authorization")).thenReturn("Bearer ");
        when(tokenProvider.isValid("")).thenReturn(false); // Empty token is invalid

        // When
        jwtAuthFilter.doFilterInternal(request, response, filterChain);

        // Then
        verify(tokenProvider).isValid(""); // Called with empty string
        verify(filterChain).doFilter(request, response);
    }

    @AfterEach
    void tearDown() {
        SecurityContextHolder.clearContext();
    }
}
