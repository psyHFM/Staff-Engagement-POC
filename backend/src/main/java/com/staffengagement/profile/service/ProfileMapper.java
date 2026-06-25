package com.staffengagement.profile.service;

import com.staffengagement.shared.api.EmployeeSummary;
import com.staffengagement.shared.api.InteractionSummary;
import com.staffengagement.shared.api.PortfolioSummary;
import com.staffengagement.shared.api.TaskSummary;
import java.util.Comparator;
import java.util.List;

/**
 * Pure assembler that builds a {@link PersonProfile} from the outputs of the frozen
 * cross-module contracts.
 *
 * <p>Top skills are derived from the employee's own portfolio and sorted by
 * {@code years} descending, then {@code projectCount} descending, so the rounded view
 * highlights the strongest capabilities first.
 */
final class ProfileMapper {

    private ProfileMapper() {
    }

    static PersonProfile assemble(
            EmployeeSummary employee,
            List<InteractionSummary> interactions,
            List<TaskSummary> tasks,
            PortfolioSummary portfolio) {

        List<SkillWithStrength> topSkills = portfolio.skills().stream()
                .map(s -> new SkillWithStrength(s.skill(), s.years(), s.projectCount()))
                .sorted(Comparator.comparingInt(SkillWithStrength::years).reversed()
                        .thenComparing(Comparator.comparingInt(SkillWithStrength::projectCount).reversed()))
                .toList();

        return new PersonProfile(employee, interactions, tasks, portfolio, topSkills);
    }
}
