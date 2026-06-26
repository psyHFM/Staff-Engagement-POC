package com.staffengagement.skills.controller;

import com.staffengagement.shared.api.PageRequest;
import com.staffengagement.shared.api.Paged;
import com.staffengagement.shared.api.SkillStrength;
import com.staffengagement.skills.service.SkillSummary;
import com.staffengagement.skills.service.SkillsService;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/**
 * REST endpoint for the Skills register (Phase 5 / {@code api-standards.yaml}):
 * {@code /api/v1} prefix, kebab-case paths, camelCase JSON, unwrapped responses,
 * uniform error envelope on failure (mapped by the shared
 * {@link com.staffengagement.shared.error.GlobalExceptionHandler}).
 *
 * <p>RBAC: any authenticated user ({@code @PreAuthorize("isAuthenticated()")}),
 * matching {@code MISSION.md}.
 *
 * <p>The controller is intentionally thin: parameter binding and a required-name
 * check live here; filtering, sorting, pagination, and ranking live in
 * {@link SkillsService}. The controller depends on the service only — never on
 * repositories (ArchUnit: {@code ..controller..} must not depend on
 * {@code ..repository..}).
 */
@RestController
@RequestMapping("/api/v1")
@RequiredArgsConstructor
public class SkillsController {

    private final SkillsService skillsService;

    @GetMapping("/skills")
    @PreAuthorize("isAuthenticated()")
    public Paged<SkillStrength> search(
            @RequestParam String name,
            @RequestParam(defaultValue = "0") int minYears,
            @RequestParam(defaultValue = "0") int offset,
            @RequestParam(defaultValue = "20") int limit,
            @RequestParam(required = false) String sort) {
        if (name == null || name.isBlank()) {
            throw new IllegalArgumentException("name is required");
        }
        return skillsService.search(name.trim(), minYears, offset, limit, sort);
    }

    /**
     * Aggregated "popular skills" grid (ATSE1-40). Returns the top-N skills
     * across all employees, ordered by employee count desc then by skill name
     * asc. Limit defaults to 20 and is clamped to 100 by the service.
     */
    @GetMapping("/skills/popular")
    @PreAuthorize("isAuthenticated()")
    public List<SkillSummary> popular(@RequestParam(defaultValue = "20") int limit) {
        return skillsService.popularSkills(limit);
    }
}
