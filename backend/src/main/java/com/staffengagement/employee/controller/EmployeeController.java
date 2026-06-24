package com.staffengagement.employee.controller;

import com.staffengagement.employee.controller.dto.CreateEmployeeRequest;
import com.staffengagement.employee.controller.dto.UpdateEmployeeRequest;
import com.staffengagement.employee.service.Caller;
import com.staffengagement.employee.service.EmployeeException;
import com.staffengagement.employee.service.EmployeeResponse;
import com.staffengagement.employee.service.EmployeeService;
import com.staffengagement.shared.api.Paged;
import com.staffengagement.shared.kernel.EmployeeRole;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/**
 * REST endpoints for the Employee module ({@code api-standards.yaml}): {@code /api/v1}
 * prefix, kebab-case paths, camelCase JSON, unwrapped responses, and the uniform
 * {@code ErrorEnvelope} on failure (produced by {@link EmployeeErrorHandler}).
 *
 * <p>RBAC: all four endpoints require an authenticated caller
 * ({@code @PreAuthorize("isAuthenticated()")}). The owner-or-admin and
 * admin-only-role-change rules on {@code PUT} are <em>not</em> expressible in a
 * {@code @PreAuthorize} expression (they need the path id and the stored record), so
 * they are enforced inside {@link EmployeeService} via the {@link Caller}; violations
 * surface as {@link EmployeeException} of kind {@code ACCESS_DENIED} → 403. Self-service
 * create is inherently own-only because {@code email} is bound to the principal.
 *
 * <p>The controller extracts the authenticated caller — {@code email} is the principal
 * name (email-shaped, set by {@code JwtAuthFilter}); {@code role} is the first
 * {@code ROLE_*} authority — and passes it down as a {@link Caller} so the service stays
 * free of {@code SecurityContextHolder} coupling and unit-testable. It depends on
 * {@link EmployeeService} only — never on the repository (ArchUnit:
 * {@code ..controller..} must not depend on {@code ..repository..}).
 */
@RestController
@RequestMapping("/api/v1")
public class EmployeeController {

    private final EmployeeService employeeService;

    public EmployeeController(EmployeeService employeeService) {
        this.employeeService = employeeService;
    }

    @PostMapping("/employees")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<EmployeeResponse> create(@Valid @RequestBody CreateEmployeeRequest body,
                                                    @AuthenticationPrincipal String email,
                                                    Authentication authentication) {
        EmployeeResponse created = employeeService.create(
                body.fullName(), body.jobTitle(), body.department(), body.level(),
                callerOf(email, authentication));
        return ResponseEntity.status(HttpStatus.CREATED).body(created);
    }

    @GetMapping("/employees")
    @PreAuthorize("isAuthenticated()")
    public Paged<EmployeeResponse> list(@RequestParam(defaultValue = "0") int offset,
                                        @RequestParam(defaultValue = "20") int limit,
                                        @RequestParam(required = false) String sort) {
        return employeeService.list(offset, limit, sort);
    }

    @GetMapping("/employees/{id}")
    @PreAuthorize("isAuthenticated()")
    public EmployeeResponse getById(@PathVariable Long id) {
        return employeeService.findResponseById(id)
                .orElseThrow(() -> new EmployeeException(
                        EmployeeException.Kind.NOT_FOUND, "Employee not found: " + id));
    }

    @PutMapping("/employees/{id}")
    @PreAuthorize("isAuthenticated()")
    public EmployeeResponse update(@PathVariable Long id,
                                    @Valid @RequestBody UpdateEmployeeRequest body,
                                    @AuthenticationPrincipal String email,
                                    Authentication authentication) {
        return employeeService.update(id, body.fullName(), body.jobTitle(), body.department(),
                body.level(), body.role(), body.email(), callerOf(email, authentication));
    }

    /**
     * Build the {@link Caller} from the authenticated principal: {@code email} is the
     * principal name (email-shaped, the Employee identity key); {@code role} is the
     * first {@code ROLE_*} authority mapped to {@link EmployeeRole}. Falls back to
     * {@code EMPLOYEE} when no role authority is present (defensive — the JWT minted by
     * the auth layer always carries one).
     */
    private static Caller callerOf(String email, Authentication authentication) {
        EmployeeRole role = authentication.getAuthorities().stream()
                .map(GrantedAuthority::getAuthority)
                .filter(a -> a.startsWith("ROLE_"))
                .map(a -> a.substring("ROLE_".length()))
                .findFirst()
                .map(EmployeeRole::valueOf)
                .orElse(EmployeeRole.EMPLOYEE);
        return new Caller(email, role);
    }
}