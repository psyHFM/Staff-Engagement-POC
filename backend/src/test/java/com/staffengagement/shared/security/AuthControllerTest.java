package com.staffengagement.shared.security;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class AuthControllerTest {

    private static final String BASE64_SECRET =
            "Y2hhbmdlLW1lLXRvLWEtcmVhbC1zZWNyZXQta2V5LWZvci1zdGFmZi1lbmdhZ2VtZW50LXBvYw==";

    private final StubUserStore users = new StubUserStore();
    private final JwtTokenProvider provider =
            new JwtTokenProvider(new JwtProperties(BASE64_SECRET, "staff-engagement-poc", 60));
    private final AuthController controller = new AuthController(users, provider);

    @Test
    void loginWithValidCredentialsReturnsBearerToken() {
        // Given
        var request = new AuthController.LoginRequest("employee", "staffeng");

        // When
        var response = controller.login(request);

        // Then
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().token()).isNotBlank();
        assertThat(response.getBody().tokenType()).isEqualTo("Bearer");
    }

    @Test
    void loginWithInvalidCredentialsIsRejected() {
        // Given
        var request = new AuthController.LoginRequest("employee", "wrong");

        // When / Then
        assertThatThrownBy(() -> controller.login(request))
                .isInstanceOf(IllegalArgumentException.class);
    }
}