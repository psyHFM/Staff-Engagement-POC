package com.staffengagement.employee.service;

import com.staffengagement.employee.domain.Employee;
import com.staffengagement.employee.domain.EmployeeLevel;
import com.staffengagement.employee.repository.EmployeeRepository;
import com.staffengagement.employee.repository.OffsetPageRequest;
import com.staffengagement.shared.api.EmployeeContract;
import com.staffengagement.shared.api.EmployeeSummary;
import com.staffengagement.shared.api.Paged;
import com.staffengagement.shared.kernel.EmployeeId;
import com.staffengagement.shared.kernel.EmployeeRole;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;

/**
 * Employee module service — the single implementor of the frozen
 * {@link EmployeeContract} (ROADMAP §4 / Phase 1). Also exposes the module's own
 * create/update/list/get-by-id operations used by the controller.
 *
 * <p>Layering: depends on {@link EmployeeRepository} (its own module's persistence) and
 * the frozen {@code shared/kernel} types only — never on another module's internals.
 * Cross-module references, if any are added later, go through frozen contracts. The
 * caller's identity ({@link Caller}) is passed in explicitly so the service is free of
 * {@code SecurityContextHolder} coupling and unit-testable.
 *
 * <p>Model B (design §4): {@code role} lives on the Employee record; self-create forces
 * {@code EMPLOYEE} (no self-promotion); an ADMIN may change {@code role} on update and
 * the change takes effect on the promoted user's next login. {@code email} is the
 * immutable identity key, bound to the authenticated principal on create.
 */
@Service
@RequiredArgsConstructor
public class EmployeeService implements EmployeeContract {

    private static final int DEFAULT_LIMIT = 20;
    private static final int MAX_LIMIT = 100;
    private static final Set<String> SORT_WHITELIST =
            Set.of("fullName", "email", "department", "level", "createdAt");

    private final EmployeeRepository repository;

    // ---- Frozen contract (cross-module port) ----

    @Override
    public Optional<EmployeeSummary> findById(EmployeeId id) {
        return repository.findById(id.value()).map(EmployeeMapper::toSummary);
    }

    @Override
    public boolean exists(EmployeeId id) {
        return id != null && repository.existsById(id.value());
    }

    @Override
    public Optional<EmployeeSummary> findByEmail(String email) {
        if (email == null) {
            return Optional.empty();
        }
        return repository.findByEmail(email).map(EmployeeMapper::toSummary);
    }

    // ---- Module operations (controller-facing) ----

    /**
     * Self-service create: {@code email} is bound to the caller's principal name and
     * {@code role} is forced to {@code EMPLOYEE}. Rejects an already-bound email with
     * 409. Server-sets both timestamps; the DB assigns the sequence {@code id}.
     */
    public EmployeeResponse create(String fullName, String jobTitle, String department,
                                   EmployeeLevel level, Caller caller) {
        requireFullName(fullName);
        String email = caller.email();
        if (repository.existsByEmail(email)) {
            throw new EmployeeException(EmployeeException.Kind.DUPLICATE_EMAIL, "Email already in use: " + email);
        }
        Employee entity = new Employee();
        entity.setFullName(fullName);
        entity.setEmail(email);
        entity.setRole(EmployeeRole.EMPLOYEE);
        entity.setJobTitle(jobTitle);
        entity.setDepartment(department);
        entity.setLevel(level);
        Instant now = Instant.now();
        entity.setCreatedAt(now);
        entity.setUpdatedAt(now);
        Employee saved = repository.save(entity);
        return EmployeeMapper.toResponse(saved);
    }

    /**
     * Full-replace update. Allowed for the record's owner ({@code email == caller.email})
     * or an ADMIN; any other caller gets 403. Only an ADMIN may change {@code role} — a
     * non-admin attempting a role change gets 403. {@code email} is immutable: a body
     * email differing from the stored value gets 400. {@code createdAt} is untouched;
     * {@code updatedAt} is refreshed.
     */
    public EmployeeResponse update(Long id, String fullName, String jobTitle, String department,
                                    EmployeeLevel level, EmployeeRole role, String bodyEmail, Caller caller) {
        Employee entity = repository.findById(id)
                .orElseThrow(() -> new EmployeeException(EmployeeException.Kind.NOT_FOUND, "Employee not found: " + id));

        boolean owner = entity.getEmail().equals(caller.email());
        boolean isAdmin = caller.role() == EmployeeRole.ADMIN;
        if (!owner && !isAdmin) {
            throw new EmployeeException(EmployeeException.Kind.ACCESS_DENIED, "Not allowed to update employee: " + id);
        }
        // Non-admin may not change role.
        if (role != null && !role.equals(entity.getRole()) && !isAdmin) {
            throw new EmployeeException(EmployeeException.Kind.ACCESS_DENIED, "Not allowed to update employee: " + id);
        }
        // Email is immutable.
        if (bodyEmail != null && !bodyEmail.equals(entity.getEmail())) {
            throw new IllegalArgumentException("email is immutable");
        }

        requireFullName(fullName);
        entity.setFullName(fullName);
        entity.setJobTitle(jobTitle);
        entity.setDepartment(department);
        entity.setLevel(level);
        if (isAdmin && role != null) {
            entity.setRole(role);
        }
        entity.setUpdatedAt(Instant.now());
        Employee saved = repository.save(entity);
        return EmployeeMapper.toResponse(saved);
    }

    /**
     * Directory listing: offset/limit (limit clamped to {@value #MAX_LIMIT}, default
     * {@value #DEFAULT_LIMIT}) and {@code sort=field,direction} restricted to the
     * whitelist {@code fullName, email, department, level, createdAt} (default
     * {@code createdAt,desc}); a field outside the whitelist is rejected with 400. No
     * filters in Phase 1.
     */
    public Paged<EmployeeResponse> list(int offset, int limit, String sort) {
        int effectiveLimit = limit <= 0 ? DEFAULT_LIMIT : Math.min(limit, MAX_LIMIT);
        int effectiveOffset = Math.max(0, offset);
        Sort parsed = parseSort(sort);
        Pageable pageable = new OffsetPageRequest(effectiveOffset, effectiveLimit, parsed);
        Page<Employee> page = repository.findAll(pageable);
        List<EmployeeResponse> content = page.getContent().stream()
                .map(EmployeeMapper::toResponse)
                .toList();
        return new Paged<>(content, effectiveOffset, effectiveLimit, page.getTotalElements());
    }

    /** Full-field read by id (richer than the frozen summary). Empty if missing. */
    public Optional<EmployeeResponse> findResponseById(Long id) {
        return repository.findById(id).map(EmployeeMapper::toResponse);
    }

    // ---- helpers ----

    private static void requireFullName(String fullName) {
        if (fullName == null || fullName.isBlank()) {
            throw new IllegalArgumentException("fullName is required");
        }
    }

    /**
     * Parse {@code sort=field,direction} (default {@code createdAt,desc}). The field
     * MUST be in {@link #SORT_WHITELIST} — anything else throws
     * {@link IllegalArgumentException} (→ 400 via the shared handler), so unknown fields
     * are never pushed into the query. Direction defaults to {@code desc}; only
     * {@code asc} (case-insensitive) selects ascending.
     */
    private static Sort parseSort(String sort) {
        if (sort == null || sort.isBlank()) {
            return Sort.by(Sort.Direction.DESC, "createdAt");
        }
        String[] parts = sort.split(",");
        String field = parts[0].trim();
        if (!SORT_WHITELIST.contains(field)) {
            throw new IllegalArgumentException("unsupported sort field: " + field);
        }
        Sort.Direction direction =
                (parts.length > 1 && "asc".equalsIgnoreCase(parts[1].trim()))
                        ? Sort.Direction.ASC
                        : Sort.Direction.DESC;
        return Sort.by(direction, field);
    }
}
