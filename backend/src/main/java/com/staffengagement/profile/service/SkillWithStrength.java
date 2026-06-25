package com.staffengagement.profile.service;

/**
 * Read model for one of the employee's own top skills in the rounded profile.
 *
 * <p>Derived from {@link com.staffengagement.shared.api.PortfolioSummary.SkillStrength}
 * (years + project count) so the personal view stays independent of the global
 * {@code SkillsContract} ranking.
 */
public record SkillWithStrength(String skill, int years, int projectCount) {
}
