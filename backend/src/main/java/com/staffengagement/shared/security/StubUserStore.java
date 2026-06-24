package com.staffengagement.shared.security;

import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Map;
import java.util.Optional;

/**
 * In-memory user store for the POC auth stub (ROADMAP §3). Not production auth.
 *
 * <p>Authentication (password check) stays stub-driven; the role is resolved from the
 * Employee record at login (Phase 1, Model B) via {@code EmployeeContract.findByEmail}.
 * The role list carried here is the <em>fallback only</em>, used when no Employee record
 * exists yet (e.g. a user who has not self-created their profile) — so the stub still
 * authenticates the two fixed identities while the real role lives on the Employee.
 *
 * <p>Usernames are email-shaped ({@code admin@staff.eng}, {@code employee@staff.eng}) so
 * the authenticated principal's name doubles as the Employee identity key. The
 * {@code MANAGER} role does not exist; only {@code EMPLOYEE} and {@code ADMIN}.
 */
@Component
public class StubUserStore {

    public record StubUser(String username, String password, List<String> roles) {
    }

    private final Map<String, StubUser> users = Map.of(
            "employee@staff.eng", new StubUser("employee@staff.eng", "staffeng", List.of("EMPLOYEE")),
            "admin@staff.eng", new StubUser("admin@staff.eng", "staffeng", List.of("ADMIN")));

    public Optional<StubUser> findByCredentials(String username, String password) {
        return Optional.ofNullable(users.get(username))
                .filter(u -> u.password().equals(password));
    }

    public Optional<StubUser> findByUsername(String username) {
        return Optional.ofNullable(users.get(username));
    }
}