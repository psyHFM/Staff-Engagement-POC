package com.staffengagement.shared.security;

import org.junit.jupiter.api.Test;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

class JwtTokenProviderTest {

    private static final String BASE64_SECRET =
            "Y2hhbmdlLW1lLXRvLWEtcmVhbC1zZWNyZXQta2V5LWZvci1zdGFmZi1lbmdhZ2VtZW50LXBvYw==";

    private final JwtTokenProvider provider =
            new JwtTokenProvider(new JwtProperties(BASE64_SECRET, "staff-engagement-poc", 60));

    @Test
    void generatedTokenRoundTripsSubjectAndRoles() {
        // Given
        String username = "employee";
        List<String> roles = List.of("EMPLOYEE");

        // When
        String token = provider.generate(username, roles);

        // Then
        assertThat(provider.isValid(token)).isTrue();
        assertThat(provider.subject(token)).isEqualTo(username);
        assertThat(provider.roles(token)).containsExactly("EMPLOYEE");
    }

    @Test
    void invalidTokenIsRejected() {
        // Given
        String badToken = "not-a-jwt";

        // When
        boolean valid = provider.isValid(badToken);

        // Then
        assertThat(valid).isFalse();
    }
}