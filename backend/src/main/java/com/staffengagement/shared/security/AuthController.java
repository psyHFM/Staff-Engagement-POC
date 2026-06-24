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

    public record LoginResponse(String token, String tokenType, long expiresInSeconds) {
    }

    @PostMapping("/login")
    public ResponseEntity<LoginResponse> login(@RequestBody LoginRequest request) {
        var user = userStore.findByCredentials(request.username(), request.password())
                .orElseThrow(() -> new IllegalArgumentException("Invalid credentials"));
        List<String> roles = resolveRoles(request.username(), user);
        String token = tokenProvider.generate(user.username(), roles);
        return ResponseEntity.ok(new LoginResponse(token, "Bearer", tokenProvider.expirationSeconds()));
    }

    /**
     * Resolves the role authority for the issued token. Prefers the Employee record
     * (so an admin's promotion takes effect on the user's next login); falls back to the
     * stub's role list when no record exists yet, and to {@code ROLE_EMPLOYEE} semantics
     * carried by the stub when no {@link EmployeeContract} bean is available (pre-Employee
     * module).
     */
    private List<String> resolveRoles(String email, StubUserStore.StubUser stubUser) {
        EmployeeContract contract = employeeContracts.getIfAvailable();
        if (contract != null) {
            Optional<EmployeeSummary> summary = contract.findByEmail(email);
            if (summary.isPresent()) {
                return List.of(summary.get().role().name());
            }
        }
        return stubUser.roles();
    }
}