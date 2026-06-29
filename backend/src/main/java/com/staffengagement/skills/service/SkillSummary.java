package com.staffengagement.skills.service;

import com.staffengagement.shared.api.SkillStrength;

/**
 * Aggregated view of one skill across all employees (ATSE1-40 "Popular skills" grid).
 * {@code skill} is the canonical (first-seen) spelling of the skill name;
 * {@code employeeCount} is the number of distinct employees with a non-blank entry
 * for that skill; {@code topHolder} is the strongest {@link SkillStrength} entry
 * (tie-break: higher {@code years}, then higher {@code projectCount}, then lower
 * {@code employeeName}, then lower {@code skill} spelling) so the grid can show
 * "N employees, led by Ada (8y, 12 projects)" without a second round-trip.
 *
 * <p>Module-internal DTO — never crosses to {@code shared.api} (frozen).
 */
public record SkillSummary(
        String skill,
        int employeeCount,
        SkillStrength topHolder) {
}
