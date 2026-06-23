package com.staffengagement.shared.api;

import com.staffengagement.shared.kernel.EmployeeId;
import java.util.List;

/**
 * Read model for a Portfolio, returned by {@link PortfolioContract}.
 *
 * <p>Per employee: skill entries (years + project count). Education, projects, and
 * public links are owned by Phase 4; the contract surface is frozen additively.
 */
public record PortfolioSummary(EmployeeId employeeId, List<SkillStrength> skills) {
}