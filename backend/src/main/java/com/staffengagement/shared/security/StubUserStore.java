package com.staffengagement.shared.security;

import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Map;
import java.util.Optional;

/**
 * In-memory user store for the POC auth stub (ROADMAP §3: one in-memory user, roles
 * EMPLOYEE and MANAGER). Not production auth.
 */
@Component
public class StubUserStore {

    public record StubUser(String username, String password, List<String> roles) {
    }

    private final Map<String, StubUser> users = Map.of(
            "employee", new StubUser("employee", "staffeng", List.of("EMPLOYEE")),
            "manager", new StubUser("manager", "staffeng", List.of("MANAGER")));

    public Optional<StubUser> findByCredentials(String username, String password) {
        return Optional.ofNullable(users.get(username))
                .filter(u -> u.password().equals(password));
    }

    public Optional<StubUser> findByUsername(String username) {
        return Optional.ofNullable(users.get(username));
    }
}