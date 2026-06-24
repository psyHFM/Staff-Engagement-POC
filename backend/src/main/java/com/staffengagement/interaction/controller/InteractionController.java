package com.staffengagement.interaction.controller;

import com.staffengagement.interaction.controller.dto.CreateInteractionRequest;
import com.staffengagement.interaction.service.InteractionNotFoundException;
import com.staffengagement.interaction.service.InteractionService;
import com.staffengagement.shared.api.InteractionSummary;
import com.staffengagement.shared.kernel.EmployeeId;
import com.staffengagement.shared.api.PageRequest;
import com.staffengagement.shared.api.Paged;
import com.staffengagement.shared.kernel.InteractionId;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/**
 * REST endpoints for the Interaction module ({@code api-standards.yaml}):
 * {@code /api/v1} prefix, kebab-case paths, camelCase JSON, unwrapped responses,
 * uniform error envelope on failure.
 *
 * <p>RBAC is ADMIN-only across all three endpoints in this splice
 * ({@code @PreAuthorize("hasRole('ADMIN')")}). The POC has no MANAGER role
 * (EmployeeRole v1.1.0), so ADMIN acts as the manager stand-in. EMPLOYEE self-read
 * and the facilitator-default-to-logged-in-user are deferred (design D3/D7).
 *
 * <p>The controller depends on {@link InteractionService} only — never on the
 * repository (ArchUnit: {@code ..controller..} must not depend on {@code ..repository..}).
 */
@RestController
@RequestMapping("/api/v1")
public class InteractionController {

    private final InteractionService interactionService;

    public InteractionController(InteractionService interactionService) {
        this.interactionService = interactionService;
    }

    @PostMapping("/interactions")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<InteractionSummary> create(@RequestBody CreateInteractionRequest body) {
        InteractionSummary created = interactionService.create(
                body.type(), body.subject(), body.facilitator(), body.note());
        return ResponseEntity.status(HttpStatus.CREATED).body(created);
    }

    @GetMapping("/employees/{id}/interactions")
    @PreAuthorize("hasRole('ADMIN')")
    public Paged<InteractionSummary> listBySubject(
            @PathVariable Long id,
            @RequestParam(defaultValue = "0") int offset,
            @RequestParam(defaultValue = "20") int limit,
            @RequestParam(required = false) String sort) {
        return interactionService.findPageBySubject(new EmployeeId(id), PageRequest.of(offset, limit), parseSort(sort));
    }

    @GetMapping("/interactions/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public InteractionSummary getById(@PathVariable Long id) {
        return interactionService.findById(new InteractionId(id))
                .orElseThrow(() -> new InteractionNotFoundException(id));
    }

    /**
     * Parse the {@code sort=field,direction} query param (default
     * {@code createdAt,desc}). Only the {@code createdAt} field is supported here;
     * any other or malformed value falls back to the default so unknown fields are
     * never pushed into the query.
     */
    private static Sort parseSort(String sort) {
        if (sort == null || sort.isBlank()) {
            return Sort.by(Sort.Direction.DESC, "createdAt");
        }
        String[] parts = sort.split(",");
        if (parts.length == 2 && "createdAt".equals(parts[0])) {
            Sort.Direction direction = "asc".equalsIgnoreCase(parts[1])
                    ? Sort.Direction.ASC
                    : Sort.Direction.DESC;
            return Sort.by(direction, "createdAt");
        }
        return Sort.by(Sort.Direction.DESC, "createdAt");
    }
}