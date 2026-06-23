package com.staffengagement.shared.security;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * {@code POST /api/v1/auth/login} — public endpoint that exchanges stub credentials
 * for a JWT. Invalid credentials yield 400 via the uniform error envelope.
 */
@RestController
@RequestMapping("/api/v1/auth")
public class AuthController {

    private final StubUserStore userStore;
    private final JwtTokenProvider tokenProvider;

    public AuthController(StubUserStore userStore, JwtTokenProvider tokenProvider) {
        this.userStore = userStore;
        this.tokenProvider = tokenProvider;
    }

    public record LoginRequest(String username, String password) {
    }

    public record LoginResponse(String token, String tokenType, long expiresInSeconds) {
    }

    @PostMapping("/login")
    public ResponseEntity<LoginResponse> login(@RequestBody LoginRequest request) {
        var user = userStore.findByCredentials(request.username(), request.password())
                .orElseThrow(() -> new IllegalArgumentException("Invalid credentials"));
        String token = tokenProvider.generate(user.username(), user.roles());
        return ResponseEntity.ok(new LoginResponse(token, "Bearer", tokenProvider.expirationSeconds()));
    }
}