package com.staffengagement.shared.security;

import com.staffengagement.shared.api.EmployeeContract;
import com.staffengagement.shared.api.EmployeeSummary;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Optional;

/**
 * {@code POST /api/v1/auth/login} — public endpoint that exchanges stub credentials
 * for a JWT. Invalid credentials yield 400 via the uniform error envelope.
 *
 * <p>Role resolution (Phase 1, Model B): authentication is still stub-driven, but the
 * JWT's role authority is resolved from the Employee record via
 * {@link EmployeeContract#findByEmail(String)} using the (email-shaped) principal name.
 * When no Employee record exists yet — including before the Employee module is wired in,
 * where no {@link EmployeeContract} bean is present — the stub user's fallback role list
 * is used, so a user can still obtain a token and self-create their profile.
 */
@RestController
@RequestMapping("/api/v1/auth")
public class AuthController {

    private final StubUserStore userStore;
    private final JwtTokenProvider tokenProvider;
    private final ObjectProvider<EmployeeContract> employeeContracts;

    public AuthController(StubUserStore userStore, JwtTokenProvider tokenProvider,
                         ObjectProvider<EmployeeContract> employeeContracts) {
        this.userStore = userStore;
        this.tokenProvider = tokenProvider;
        this.employeeContracts = employeeContracts;
    }

    public record LoginRequest(String username, String password) {
    }

    public record LoginResponse(String token, String tokenType, long expiresInSeconds, Long employeeId) {
    }

    @PostMapping("/login")
    public ResponseEntity<LoginResponse> login(@RequestBody LoginRequest request) {
        var user = userStore.findByCredentials(request.username(), request.password())
                .orElseThrow(() -> new IllegalArgumentException("Invalid credentials"));
        var summary = resolveSummary(request.username());
        List<String> roles = summary.map(s -> List.of(s.role().name()))
                .orElseGet(() -> stubUserRoles(user));
        // Include employeeId in JWT claims so it can be retrieved later
        String token = summary.map(s -> tokenProvider.generate(user.username(), roles, s.id().value()))
                .orElseGet(() -> tokenProvider.generate(user.username(), roles));
        Long employeeId = summary.map(s -> s.id().value()).orElse(null);
        return ResponseEntity.ok(new LoginResponse(token, "Bearer", tokenProvider.expirationSeconds(), employeeId));
    }

    /**
     * Resolves the Employee summary for the principal when the Employee module is wired.
     * Returns empty when no record exists yet or when no {@link EmployeeContract} bean is
     * available (pre-Employee module), so the caller can fall back to stub roles and a
     * null employee id.
     */
    private Optional<EmployeeSummary> resolveSummary(String email) {
        EmployeeContract contract = employeeContracts.getIfAvailable();
        if (contract != null) {
            return contract.findByEmail(email);
        }
        return Optional.empty();
    }

    private List<String> stubUserRoles(StubUserStore.StubUser stubUser) {
        return stubUser.roles();
    }
}