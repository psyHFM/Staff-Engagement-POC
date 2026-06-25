package com.staffengagement.profile.service;

import com.staffengagement.shared.api.EmployeeSummary;
import com.staffengagement.shared.api.InteractionSummary;
import com.staffengagement.shared.api.PortfolioSummary;
import com.staffengagement.shared.api.TaskSummary;
import java.util.List;

/**
 * Rounded read model for an employee profile — the Phase 6 integration view.
 *
 * <p>Composes the frozen cross-module contracts ({@link EmployeeSummary},
 * {@link InteractionSummary}, {@link TaskSummary}, {@link PortfolioSummary}) plus the
 * module-local {@link SkillWithStrength} list derived from the employee's portfolio.
 */
public record PersonProfile(
        EmployeeSummary employee,
        List<InteractionSummary> interactions,
        List<TaskSummary> tasks,
        PortfolioSummary portfolio,
        List<SkillWithStrength> topSkills) {
}
