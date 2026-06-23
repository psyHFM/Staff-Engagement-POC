package com.staffengagement.shared.api;

/**
 * Frozen cross-module port for the Skills register (Phase 5 implements this).
 *
 * <p>Read-oriented: aggregates skill strength across employees to answer
 * "Who's strong on Angular?" with names, years, and project counts, ranked and
 * paginated.
 */
public interface SkillsContract {

    Paged<SkillStrength> strongIn(String skill, int minYears, PageRequest pageRequest);
}