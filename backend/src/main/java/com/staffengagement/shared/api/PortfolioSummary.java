package com.staffengagement.shared.api;

import com.staffengagement.shared.kernel.EmployeeId;
import java.util.List;

/**
 * Read model for a Portfolio, returned by {@link PortfolioContract}.
 *
 * <p>Per employee: skill entries (years + project count), education history,
 * projects, and public links. The contract surface is extended additively in Phase 6
 * so the rounded profile can display the full portfolio without reaching into the
 * Portfolio module's internals.
 */
public record PortfolioSummary(
        EmployeeId employeeId,
        List<SkillStrength> skills,
        List<EducationEntry> education,
        List<ProjectEntry> projects,
        List<LinkEntry> links) {

    public record EducationEntry(Long id, String institution, String qualification, Integer startYear, Integer endYear) {}

    public record ProjectEntry(Long id, String name, String description, Integer startYear, Integer endYear) {}

    public record LinkEntry(Long id, String label, String url) {}
}